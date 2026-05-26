## 1. Setup

- [ ] 1.1 Create `packages/opencode/` directory structure
- [ ] 1.2 Create `packages/opencode/package.json` with dependencies on core, engine, and secrets
- [ ] 1.3 Create `packages/opencode/tsconfig.json`
- [ ] 1.4 Create `packages/opencode/vitest.config.ts`

## 2. Plugin Implementation

- [ ] 2.1 Create `src/index.ts` with plugin function signature
- [ ] 2.2 Import `Plugin` type or define minimal interface
- [ ] 2.3 Import `matchAndResolve` from `@agent-guardrails/engine`
- [ ] 2.4 Import `ALL_RULE_PACKS` from `@agent-guardrails/secrets`
- [ ] 2.5 Import or define `OPENCODE_CAPABILITIES` from `@agent-guardrails/core`
- [ ] 2.6 Register `tool.execute.before` hook for ALL tools

## 3. ToolCallContext Normalization

- [ ] 3.1 Create `src/normalize.ts` with `normalizeToContext(input, output): ToolCallContext` function
- [ ] 3.2 Handle bash tool: `{ toolName: "bash", command: output.args.command }`
- [ ] 3.3 Handle read tool: `{ toolName: "read", filePath: output.args.path }`
- [ ] 3.4 Handle write tool: `{ toolName: "write", filePath: output.args.path }`
- [ ] 3.5 Handle unknown tools: `{ toolName: input.tool }` (catch-all, passes through)
- [ ] 3.6 Export normalizeToContext for testing

## 4. Hook Logic

- [ ] 4.1 In `tool.execute.before` handler: normalize event → ToolCallContext
- [ ] 4.2 Call `matchAndResolve(toolCtx, ALL_RULE_PACKS, OPENCODE_CAPABILITIES)`
- [ ] 4.3 If result is block/suggest: throw `Error(result.message)`
- [ ] 4.4 If result is null or allow: return normally (pass through)

## 5. Module Exports

- [ ] 5.1 Export plugin as named export `GuardrailsPlugin`
- [ ] 5.2 Add JSDoc documentation

## 6. Unit Tests

- [ ] 6.1 Test `.env` file read via bash is blocked with correct error message
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
- [ ] 6.16 Test error messages include `{matched}` interpolation

## 7. Integration Tests

- [ ] 7.1 Create mock plugin context with `$` shell function
- [ ] 7.2 Test plugin returns object with `tool.execute.before` handler
- [ ] 7.3 Test blocking throws Error with message to opencode
- [ ] 7.4 Test passthrough does not throw
- [ ] 7.5 Test ALL_RULE_PACKS are loaded (not curated by Adapter)
- [ ] 7.6 Test all Rule Packs are exercised (env, sops, private-key, encryption-tools, secret-managers)
- [ ] 7.7 Test read tool triggers file-path and predicate matchers
- [ ] 7.8 Test unknown tool types pass through safely

## 8. Performance Tests

- [ ] 8.1 Create `tests/performance/opencode.perf.ts` benchmark suite
- [ ] 8.2 Measure baseline: tool.execute.before with no rules loaded
- [ ] 8.3 Measure with rules: tool.execute.before with all rules loaded
- [ ] 8.4 Test with varying rule counts: 0, 10, 50, 100 rules
- [ ] 8.5 Assert overhead < 50% and absolute time < 10ms
- [ ] 8.6 Report min, max, mean, p95, p99 latencies

## 9. Documentation

- [ ] 9.1 Create `packages/opencode/README.md` with installation instructions
- [ ] 9.2 Document Adapter hooks and expected Behavior
