## 1. Engine Package

- [ ] 1.1 Create `packages/engine/` directory with `package.json`, `tsconfig.json`, `vitest.config.ts`
- [ ] 1.2 Implement `ToolCallContext` discriminated union type (or import from core if defined there)
- [ ] 1.3 Implement `matchAndResolve(ctx, packs, capabilities)` — iterates rules, evaluates matchers, resolves fallback chain, interpolates `{matched}` templates
- [ ] 1.4 Implement tool-type early exit — when `ctx` has no `command` and no `filePath`, return `null` without iterating rules. When only one field is present, skip rules whose matcher type requires the other
- [ ] 1.5 Implement fallback chain resolution — `run → suggest → block`, `confirm → suggest`, `suggest` (no safer cmd) → `block` with generic message
- [ ] 1.6 Unit tests for `matchAndResolve`: no match → null, match with supported action → action returned, match with unsupported action → fallback, suggest with null safer cmd → block
- [ ] 1.7 Unit tests for early exit: tool with no fields → null, tool with only filePath → file rules only, tool with only command → bash rules only, tool with both → all rules

## 2. Pi Package Setup

- [ ] 2.1 Create `packages/pi/` directory structure
- [ ] 2.2 Create `packages/pi/package.json` with dependencies on core, engine, and secrets
- [ ] 2.3 Create `packages/pi/tsconfig.json`
- [ ] 2.4 Create `packages/pi/vitest.config.ts`

## 3. Extension Implementation

- [ ] 3.1 Create `src/index.ts` with extension function signature
- [ ] 3.2 Import `ExtensionAPI` type or define minimal interface
- [ ] 3.3 Import `matchAndResolve` from `@agent-guardrails/engine`
- [ ] 3.4 Import `ALL_RULE_PACKS` from `@agent-guardrails/secrets`
- [ ] 3.5 Import or define `PI_CAPABILITIES` from `@agent-guardrails/core`
- [ ] 3.6 Register `tool_call` hook via `pi.on("tool_call", handler)` for ALL tools

## 4. ToolCallContext Normalization

- [ ] 4.1 Create `src/normalize.ts` with `normalizeToContext(event): ToolCallContext` function
- [ ] 4.2 Handle bash tool: `{ toolName: "bash", command: event.input.command }`
- [ ] 4.3 Handle read tool: `{ toolName: "read", filePath: event.input.path }`
- [ ] 4.4 Handle write tool: `{ toolName: "write", filePath: event.input.path }`
- [ ] 4.5 Handle unknown tools: `{ toolName: event.toolName }` (catch-all, passes through)
- [ ] 4.6 Export normalizeToContext for testing

## 5. Hook Logic

- [ ] 5.1 In `tool_call` handler: normalize event → ToolCallContext
- [ ] 5.2 Call `matchAndResolve(toolCtx, ALL_RULE_PACKS, PI_CAPABILITIES)`
- [ ] 5.3 If result is block/suggest: return `{ block: true, reason: result.message }`
- [ ] 5.4 If result is null or allow: return `undefined` (pass through)

## 6. Module Exports

- [ ] 6.1 Export extension function as default export
- [ ] 6.2 Add JSDoc documentation

## 7. Unit Tests

- [ ] 7.1 Test `.env` file read via bash is blocked with correct reason
- [ ] 7.2 Test `.env` file read via read tool is blocked (file-path matcher)
- [ ] 7.3 Test `cat .env` bash command is blocked
- [ ] 7.4 Test `sops -d secrets.yaml` command is blocked
- [ ] 7.5 Test `age -d file.age` command is blocked
- [ ] 7.6 Test `gpg --decrypt file.gpg` command is blocked
- [ ] 7.7 Test `openssl enc -d -aes-256-cbc -in file.enc` command is blocked
- [ ] 7.8 Test `op read op://vault/item` command is blocked
- [ ] 7.9 Test `pass show secret/path` command is blocked
- [ ] 7.10 Test `gopass show secret/path` command is blocked
- [ ] 7.11 Test private key read via read tool (`id_rsa`, `~/.ssh/my_key`) is blocked (predicate matcher)
- [ ] 7.12 Test private key read via file extension (`.pem`, `.key`) is blocked
- [ ] 7.13 Test safe commands pass through (`ls`, `cat README.md`, `git status`)
- [ ] 7.14 Test safe file reads pass through (`config.yaml`, `src/index.ts`)
- [ ] 7.15 Test unknown tool types pass through without blocking
- [ ] 7.16 Test reason messages include `{matched}` interpolation

## 8. Integration Tests

- [ ] 8.1 Create mock `ExtensionAPI` with event emitter
- [ ] 8.2 Test extension registers handler for `tool_call`
- [ ] 8.3 Test blocking returns `{ block: true, reason: "..." }` to Pi
- [ ] 8.4 Test passthrough returns `undefined` to Pi
- [ ] 8.5 Test ALL_RULE_PACKS are loaded (not curated by Adapter)
- [ ] 8.6 Test all Rule Packs are exercised (env, sops, private-key, encryption-tools, secret-managers)
- [ ] 8.7 Test read tool triggers file-path and predicate matchers
- [ ] 8.8 Test unknown tool types pass through safely

## 9. Performance Tests

- [ ] 9.1 Create `tests/performance/pi.perf.ts` benchmark suite
- [ ] 9.2 Measure baseline: tool_call with no rules loaded
- [ ] 9.3 Measure with rules: tool_call with all rules loaded
- [ ] 9.4 Test with varying rule counts: 0, 10, 50, 100 rules
- [ ] 9.5 Assert overhead < 50% and absolute time < 10ms
- [ ] 9.6 Report min, max, mean, p95, p99 latencies

## 10. Documentation

- [ ] 10.1 Create `packages/pi/README.md` with installation instructions
- [ ] 10.2 Document Adapter hooks and expected Behavior
