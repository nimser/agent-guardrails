## 1. Tokenizer Foundation

- [ ] 1.1 Define `ParsedCommand`, `Token`, and `Redirect` TypeScript interfaces in `src/engine/tokenizer/types.ts`
- [ ] 1.2 Implement subshell marker detection scan (`$(`, `${`, backticks) with early exit — returns `hasSubshell: boolean`. Unit tests for detection and non-detection (simple `$VAR`)
- [ ] 1.3 Implement quote resolution state machine — handles `"double"`, `'single'`, and concatenated strings (`.e"nv"` → `.env`). Unit tests for all quote variants and evasion cases
- [ ] 1.4 Implement main tokenizer: split on whitespace, classify tokens (`word`, `flag`, `glob`), detect operators (`&&`, `||`, `;`, `|`), detect redirects (`<`, `>`, `>>`, `2>`, `&>`). Unit tests for each construct
- [ ] 1.5 Implement pipeline stage splitting — split tokens into `stages: Token[][]` separated by `|`. Unit tests for single, multi-stage, and empty stages
- [ ] 1.6 Wire `tokenize(input: string): ParsedCommand` entry point that runs subshell scan → main tokenizer → returns `ParsedCommand`. Export from engine package

## 2. Engine Integration

- [ ] 2.1 Refactor engine's `matches()` function to call `tokenize()` on `ctx.command` before evaluating matchers. For `bash-command` matchers, test regex against resolved token values, not raw string
- [ ] 2.2 Add redirect-aware matching — when a `stdin` redirect is present, evaluate `file-path` matchers against the redirect `source`. Unit test: `cat < .env` matches env rule
- [ ] 2.3 Add subshell block path — when `hasSubshell` is true, short-circuit all matchers and return a block action with a contextual message identifying the construct type
- [ ] 2.4 Verify all existing regex-based matching tests still pass with tokenizer. Fix any regressions

## 3. Smart Piped Command Detection

- [ ] 3.1 Implement `isSafePipelineLastStage(stage: Token[]): boolean` — checks if the final pipeline stage is a known-safe output limiter (`head -N`, `wc`, `grep -c`, `grep -o` with limited context)
- [ ] 3.2 Define configurable threshold constants: max `head -N` value, max `grep -o` context length. Default conservative values
- [ ] 3.3 Wire Smart Piped Detection into `findSaferCommand()` — if command has multiple stages and last stage is safe, return `null` (no suggestion needed). Unit tests for all safe/unsafe scenarios from spec
- [ ] 3.4 Ensure `grep` without `-c` or `-o` limited context is NOT treated as safe. Unit test: `sops -d secrets.yaml | grep password` still blocks

## 4. SOPS Format Detection via Tokenizer

- [ ] 4.1 Update SOPS safer command logic to extract `--output-type` and `--input-type` flag values from parsed tokens instead of regex
- [ ] 4.2 Implement format detection priority: `--output-type` flag → `--input-type` flag → file extension → return `null` (fallback to block)
- [ ] 4.3 Unit test: stdin SOPS (`echo ... | sops -d` with no flags, no file) returns `null` and falls back to block

## 5. Evasion Test Suite

- [ ] 5.1 Add evasion test cases for env rules: `cat < .env`, `cat .e"nv"`, `cat '.e'nv`, `$(cat .env)`, `` `cat .env` ``
- [ ] 5.2 Add evasion test cases for private-key rules: `cat < ~/.ssh/id_rsa`
- [ ] 5.3 Add subshell test cases: commands with `$(...)`, backticks, `${...}` all block with correct message. Simple `$VAR` does not block
- [ ] 5.4 Add heredoc test cases: heredoc without subshell passes through, heredoc with `$(...)` inside blocks (subshell detected)
- [ ] 5.5 Add malformed input test cases: unmatched quotes, incomplete redirects, empty input, whitespace-only. Tokenizer returns best-effort or error; engine falls back to block

## 6. Performance & Benchmarks

- [ ] 6.1 Add tokenizer micro-benchmarks: simple command (< 100 chars), complex pipeline (3+ stages), command with quotes/redirects. Verify < 5ms for all cases
- [ ] 6.2 Integrate tokenizer benchmarks into existing engine benchmark suite (from change-3/4). Measure total hot-path time: tokenize + match + resolve
- [ ] 6.3 Profile for edge cases that could cause pathological performance (deeply nested quotes, very long commands). Add safeguards (max input length, timeout)
