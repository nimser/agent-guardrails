## Why

Agent Guardrails currently relies on regex matching against raw command strings. This is trivially bypassable through shell composition techniques that preserve the original intent while evading the regex (e.g., `cat < .env`, `cat .e"nv"`, command chaining, subshells). A Level 1 shell tokenizer closes these evasion vectors and enables Smart Piped Command Detection — both deferred from the MVP. This change also introduces subshell detection as a security backstop for constructs the tokenizer cannot fully parse.

## What Changes

- Add a Level 1 shell tokenizer to `@agent-guardrails/engine` that parses command strings into structured representations (tokens, pipeline stages, operators, redirects)
- Replace raw regex matching in the engine's `matches()` function with tokenizer-based matching — commands are tokenized first, then matchers evaluate against structured tokens
- Add subshell marker detection (`$(...)`, backticks) — when detected, block with a clear rewrite message rather than attempting to parse inside
- Heredocs (`<<`) are **not** blocked — agents use them legitimately for multi-line content, and subshell expansion inside heredocs is already caught by subshell detection
- Enable Smart Piped Command Detection (deferred from change-5-command-transforms) — analyze each pipeline stage independently to detect when commands already have safe output-limiting precautions
- Resolve quote-enclosed and concatenated strings (`.e"nv"` → `.env`) before matching
- Identify structural operators (`|`, `<`, `>`, `>>`, `&&`, `||`, `;`) to understand command composition
- **Zero external dependencies** — tokenizer is written from scratch (~100 lines)

## Capabilities

### New Capabilities

- `tokenizer`: Level 1 shell tokenizer that parses command strings into structured representations (tokens, pipeline stages, operators, redirects) and detects unparseable constructs (subshells)

### Modified Capabilities

- `secrets`: Matching logic migrates from raw regex on command strings to tokenizer-based evaluation. New evasion test cases (redirects, quote concatenation, subshells) added to existing Rule Pack specs
- `commands`: `findSaferCommand()` now operates on parsed command structure. Smart Piped Command Detection enabled — pipeline stages analyzed independently for safe output-limiting patterns (`head -N`, `wc`, `grep -c`, `grep -o` with limited context)

## Impact

- **Code**: `@agent-guardrails/engine` gains a tokenizer module (~100 lines). Engine's `matches()` function refactored to tokenize before matching. No changes to Adapters or `@agent-guardrails/core`
- **APIs**: `ParsedCommand` type added to engine's public API. `GuardrailMatcher` in core is unchanged — matchers still declare `type` and `pattern`, but the engine evaluates them against tokenized input
- **Dependencies**: None — tokenizer is implemented from scratch
- **Tests**: Existing regex-matching tests must pass with tokenizer. New tests for evasion cases, subshell detection, pipeline stage analysis, and Smart Piped Detection
- **Performance**: Tokenization adds a pass before matching. Hot path must remain fast (see engine performance optimization work). Tokenizer output should be cacheable for repeated evaluations
