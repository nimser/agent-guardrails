## 1. Setup

- [ ] 1.1 Create `packages/pi/` directory structure
- [ ] 1.2 Create `packages/pi/package.json` with dependencies on core, engine, and secrets
- [ ] 1.3 Create `packages/pi/tsconfig.json`
- [ ] 1.4 Create `packages/pi/vitest.config.ts`

## 2. Extension Implementation

- [ ] 2.1 Create `src/index.ts` with extension function signature
- [ ] 2.2 Import `ExtensionAPI` type or define minimal interface
- [ ] 2.3 Import `matchAndResolve` from `@agent-guardrails/engine`
- [ ] 2.4 Import `ALL_RULE_PACKS` from `@agent-guardrails/secrets`
- [ ] 2.5 Import or define `PI_CAPABILITIES` from `@agent-guardrails/core`
- [ ] 2.6 Register `tool_call` hook via `pi.on("tool_call", handler)` for ALL tools

## 3. ToolCallContext Normalization

- [ ] 3.1 Create `src/normalize.ts` with `normalizeToContext(event): ToolCallContext` function
- [ ] 3.2 Handle bash tool: `{ toolName: "bash", command: event.input.command }`
- [ ] 3.3 Handle read tool: `{ toolName: "read", filePath: event.input.path }`
- [ ] 3.4 Handle write tool: `{ toolName: "write", filePath: event.input.path }`
- [ ] 3.5 Handle unknown tools: `{ toolName: event.toolName }` (catch-all, passes through)
- [ ] 3.6 Export normalizeToContext for testing

## 4. Hook Logic

- [ ] 4.1 In `tool_call` handler: normalize event → ToolCallContext
- [ ] 4.2 Call `matchAndResolve(toolCtx, ALL_RULE_PACKS, PI_CAPABILITIES)`
- [ ] 4.3 If result is block/suggest: return `{ block: true, reason: result.message }`
- [ ] 4.4 If result is null or allow: return `undefined` (pass through)

## 5. Module Exports

- [ ] 5.1 Export extension function as default export
- [ ] 5.2 Add JSDoc documentation

## 6. Unit Tests

- [ ] 6.1 Test `.env` file read via bash is blocked with correct reason
- [ ] 6.2 Test `.env` file read via read tool is blocked (file-path matcher)
- [ ] 6.3 Test `cat .env` bash command is blocked
- [ ] 6.4 Test `sops -d secrets.yaml` command is blocked
- [ ] 6.5 Test `age -d file.age` command is blocked
- [ ] 6.6 Test `gpg --decrypt file.gpg` command is blocked
- [ ] 6.7 Test `openssl enc -d -aes-256-cbc -in file.enc` command is blocked
- [ ] 6.8 Test `op read op://vault/item` command is blocked
- [ ] 6.9 Test `pass show secret/path` command is blocked
- [ ] 6.10 Test `gopass show secret/path` command is blocked
- [ ] 6.11 Test private key read via read tool (`id_rsa`, `~/.ssh/my_key`) is blocked (predicate matcher)
- [ ] 6.12 Test private key read via file extension (`.pem`, `.key`) is blocked
- [ ] 6.13 Test safe commands pass through (`ls`, `cat README.md`, `git status`)
- [ ] 6.14 Test safe file reads pass through (`config.yaml`, `src/index.ts`)
- [ ] 6.15 Test unknown tool types pass through without blocking
- [ ] 6.16 Test reason messages include `{matched}` interpolation

## 7. Integration Tests

- [ ] 7.1 Create mock `ExtensionAPI` with event emitter
- [ ] 7.2 Test extension registers handler for `tool_call`
- [ ] 7.3 Test blocking returns `{ block: true, reason: "..." }` to Pi
- [ ] 7.4 Test passthrough returns `undefined` to Pi
- [ ] 7.5 Test ALL_RULE_PACKS are loaded (not curated by Adapter)
- [ ] 7.6 Test all Rule Packs are exercised (env, sops, private-key, encryption-tools, secret-managers)
- [ ] 7.7 Test read tool triggers file-path and predicate matchers
- [ ] 7.8 Test unknown tool types pass through safely

## 8. Performance Tests

- [ ] 8.1 Create `tests/performance/pi.perf.ts` benchmark suite
- [ ] 8.2 Measure baseline: tool_call with no rules loaded
- [ ] 8.3 Measure with rules: tool_call with all rules loaded
- [ ] 8.4 Test with varying rule counts: 0, 10, 50, 100 rules
- [ ] 8.5 Assert overhead < 50% and absolute time < 10ms
- [ ] 8.6 Report min, max, mean, p95, p99 latencies

## 9. Documentation

- [ ] 9.1 Create `packages/pi/README.md` with installation instructions
- [ ] 9.2 Document Adapter hooks and expected Behavior
