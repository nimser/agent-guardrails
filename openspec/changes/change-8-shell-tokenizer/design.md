## Context

Agent Guardrails currently uses regex matching against raw command strings. This was a deliberate MVP decision — fast to implement, zero dependencies, and sufficient to prove the hook path works. However, regex matching is trivially bypassable through shell composition:

- `cat < .env` — redirect, `.env` doesn't appear after `cat`
- `cat .e"nv"` — string concatenation, regex doesn't see `.env`
- `$(cat .env)` — subshell, the inner command is invisible to the outer regex
- `cat .env | base64` — the secret is still leaked, just encoded

These are not hypothetical — LLMs naturally produce shell compositions like redirects and subshells. The MVP deferred tokenizer work to keep scope tight; this change addresses that gap.

The tokenizer also enables Smart Piped Command Detection (deferred from change-5-command-transforms), which requires analyzing each pipeline stage independently.

## Goals / Non-Goals

**Goals:**
- Parse command strings into structured representations (tokens, pipeline stages, operators, redirects)
- Resolve quote-enclosed and concatenated strings before matching
- Detect subshell markers (`$(...)`, backticks) and block with a clear rewrite message
- Enable tokenizer-based matching in the engine, replacing raw regex on command strings
- Enable Smart Piped Command Detection via pipeline stage analysis
- Maintain zero external dependencies in the engine
- Maintain performance on the hot path (tokenization + matching < 10ms for typical commands)

**Non-Goals:**
- Full shell parser (Level 2) — subshells, heredocs, variable expansion are detected as markers, not parsed
- Shell execution or evaluation — tokenizer only parses structure, never runs anything
- Handling every shell edge case — pragmatic coverage of common LLM-generated commands
- Modifying Adapter code — tokenization happens inside the engine

## Decisions

### Decision 1: Level 1 tokenizer with subshell marker detection

**Choice**: Parse common shell constructs fully; detect (but don't parse) subshells and block them.

**Rationale**:
- Common commands (95%+ of LLM output) are fully parsed — quotes, concatenation, redirects, pipes, operators
- Subshells (`$(...)`, backticks) are detected by scanning for structural markers — no need to parse inside them
- When a subshell is detected, the engine blocks with a clear message: *"Command contains a subshell ($()). Please rewrite without nested commands."*
- Heredocs (`<<`) are **not** blocked — agents use them legitimately for multi-line content. Subshell expansion inside heredocs is caught by the same `$()` scan
- Eliminates the need for a Level 2 parser entirely. The fallback (block + rewrite message) is secure, clear, and has near-zero productivity cost

**Alternatives considered**:
- Full shell parser (Level 2): 300-500 lines, 1-2 weeks, diminishing returns on rarely-used constructs
- External dependency (`shell-quote`): ~200 lines, adds supply chain risk for trivial logic
- Don't do anything: regex evasion remains a known gap

### Decision 2: Tokenizer output is a structured `ParsedCommand`

**Choice**: Define a `ParsedCommand` interface as the tokenizer output:

```typescript
interface ParsedCommand {
  stages: Token[][];           // pipeline stages, split by |
  operators: ("&&" | "||" | ";" | "|")[];
  redirects: Redirect[];
  hasSubshell: boolean;        // $(...) or backticks detected
}

interface Token {
  type: "word" | "flag" | "glob";
  value: string;               // resolved value (quotes stripped, concat resolved)
  raw: string;                 // original text
}

interface Redirect {
  type: "stdin" | "stdout" | "stderr" | "both";
  source?: string;
  target?: string;
}
```

**Rationale**:
- Matchable structure — engine evaluates matchers against tokens, not raw strings
- `hasSubshell` is a simple boolean flag — detection without parsing
- Pipeline stages are separated, enabling per-stage analysis for Smart Piped Detection
- Redirects are explicit — `cat < .env` becomes `{ source: ".env" }`, not a mystery string

### Decision 3: Tokenizer replaces regex in the engine's `matches()` function

**Choice**: The engine tokenizes the command string first, then evaluates matchers against the parsed structure. Regex patterns in `bash-command` matchers are tested against the **resolved** token values (quotes stripped, concatenation resolved), not the raw input.

**Rationale**:
- Evasion via quotes/concatenation is eliminated — `.e"nv"` resolves to `.env` before matching
- Redirects are checked explicitly — `cat < .env` produces a `stdin` redirect with `.env` as source, which the engine checks against file-path matchers
- Existing regex patterns in Rule Packs continue to work — they just operate on resolved values instead of raw strings
- No changes needed to Rule Pack definitions or the `GuardrailMatcher` type in core

### Decision 4: Subshell detection scans before tokenization

**Choice**: A preliminary scan pass detects `$(`, `${`, and backtick markers before the main tokenizer runs. If any marker is found, tokenization is skipped and the engine immediately blocks.

**Rationale**:
- Scanning for markers is O(n) with trivial constant cost
- Avoids building a partial/incorrect token tree when subshells are present
- `${VAR}` is blocked alongside `$(cmd)` — variable expansion is a related evasion vector
- Backticks are rare in modern shell but still a subshell mechanism

### Decision 5: Smart Piped Command Detection operates on pipeline stages

**Choice**: After tokenization, if the command has multiple pipeline stages (separated by `|`), the last stage is analyzed for safe output-limiting patterns:

- `head -N` where N ≤ some threshold → safe
- `wc` (any flags) → safe (no content leakage)
- `grep -c` → safe (count only)
- `grep -o 'pattern'` with limited context (`.{0,N}` where N ≤ threshold) → safe

If the last stage is safe, `findSaferCommand()` returns null and the engine does not block.

**Rationale**:
- The dangerous part is always the *last* stage — if it limits output, the pipeline is safe
- This is a post-MVP re-introduction of the feature deferred from change-5, now built on proper structural analysis instead of regex
- Conservative thresholds — better to block a safe command than allow an unsafe one
- Thresholds are configurable constants, not magic numbers in regex

### Decision 6: Zero external dependencies

**Choice**: Tokenizer is implemented from scratch (~100 lines of TypeScript).

**Rationale**:
- Engine package has a zero-dependency constraint (consistent with core)
- Shell tokenization at Level 1 is genuinely simple logic — a state machine with a handful of states
- Avoids supply chain risk from npm packages
- Full control over output shape and edge case handling
- Easy to test exhaustively

## Risks / Trade-offs

### Risk: Tokenizer has bugs in edge cases
**Mitigation**:
- Comprehensive test suite covering: simple commands, quoted strings, concatenation, redirects, pipes, operators, subshells, backticks, heredocs, empty input, whitespace-only input
- Property-based testing for roundtrip correctness (tokenize → reconstruct → match)
- Engine falls back to block on any tokenizer error (secure by default)

### Risk: Performance impact on hot path
**Mitigation**:
- Tokenizer is ~100 lines of state machine — expected < 1ms for typical commands (< 500 chars)
- Tokenization only happens once per command, not per rule
- Subshell marker scan is O(n) with early exit
- Benchmark suite (from change-3/4) extended to include tokenization overhead
- If performance is a concern, tokenizer results can be cached by command string hash

### Risk: Smart Piped Detection is too permissive
**Mitigation**:
- Conservative thresholds (configurable constants)
- Only known-safe patterns allowed (allowlist, not denylist)
- Feature is opt-in per rule (not a blanket pass)
- Monitor false negatives in real usage, tighten as needed

### Risk: Subshell blocking is too aggressive
**Mitigation**:
- Message is clear and actionable: tells the agent exactly what to rewrite
- Most legitimate subshells (`$(date)`, `$(pwd)`) are trivial to rewrite
- Agent learns from the block and stops using subshells after a few interactions
- Heredocs are explicitly allowed (not blocked) since they don't leak data

## Migration Plan

No migration needed. This change is internal to the engine:
- Rule Pack definitions are unchanged (same `GuardrailMatcher` interface in core)
- Adapters are unchanged (they pass `ToolCallContext` to the engine, which tokenizes internally)
- Existing tests must continue to pass — tokenizer is a drop-in replacement for regex matching
- New tests added for evasion cases and tokenizer-specific behavior

## Open Questions

1. What are the right thresholds for Smart Piped Detection? (`head -N` max N, `grep -o` max context)
2. Should `findSaferCommand()` also operate on `ParsedCommand` instead of raw strings? (Probably yes, but is it worth the refactor in this change?)
