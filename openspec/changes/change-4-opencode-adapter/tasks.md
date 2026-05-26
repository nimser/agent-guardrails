## 1. Setup

- [ ] 1.1 Create `packages/opencode/` directory structure
- [ ] 1.2 Create `packages/opencode/package.json` with dependencies on core and secrets
- [ ] 1.3 Create `packages/opencode/tsconfig.json`
- [ ] 1.4 Create `packages/opencode/vitest.config.ts`

## 2. Plugin Implementation

- [ ] 2.1 Create `src/index.ts` with plugin function signature
- [ ] 2.2 Import `Plugin` type or define minimal interface
- [ ] 2.3 Import rule packs from `@agent-guardrails/secrets`
- [ ] 2.4 Register `tool.execute.before` hook

## 3. PreToolUse Logic

- [ ] 3.1 Extract tool name from `input.tool`
- [ ] 3.2 Extract command from `output.args.command` for bash tool
- [ ] 3.3 Extract file path from `output.args.path` for read/write tools
- [ ] 3.4 Iterate rule packs and match against rules with `phase: "before-tool"`
- [ ] 3.5 Throw `Error` with rule.defaultAction.message when rule matches
- [ ] 3.6 Return normally when no rules match

## 4. Rule Matching Helper

- [ ] 4.1 Create `src/match.ts` with `matchRule(rule, toolName, args)` function
- [ ] 4.2 Handle `bash-command` matcher: test command against rule pattern
- [ ] 4.3 Handle `file-path` matcher: test file path against rule pattern
- [ ] 4.4 Export matchRule for testing

## 5. Module Exports

- [ ] 5.1 Export plugin as named export `GuardrailsPlugin`
- [ ] 5.2 Add JSDoc documentation

## 6. Unit Tests

- [ ] 6.1 Test `.env` file read is blocked with correct error message
- [ ] 6.2 Test `cat .env` bash command is blocked
- [ ] 6.3 Test `sops -d secrets.yaml` command is blocked
- [ ] 6.4 Test `age -d file.age` command is blocked
- [ ] 6.5 Test `gpg --decrypt file.gpg` command is blocked
- [ ] 6.6 Test `openssl enc -d -aes-256-cbc -in file.enc` command is blocked
- [ ] 6.7 Test `op read op://vault/item` command is blocked
- [ ] 6.8 Test `pass show secret/path` command is blocked
- [ ] 6.9 Test `gopass show secret/path` command is blocked
- [ ] 6.10 Test private key read (`.pem`, `.key`, `id_rsa`, `id_ed25519`) is blocked
- [ ] 6.11 Test safe commands pass through (`ls`, `cat README.md`, `git status`)
- [ ] 6.12 Test safe file reads pass through (`config.yaml`, `src/index.ts`)
- [ ] 6.13 Test error messages are clear and actionable

## 7. Integration Tests

- [ ] 7.1 Create mock plugin context with `$` shell function
- [ ] 7.2 Test plugin returns object with `tool.execute.before` handler
- [ ] 7.3 Test blocking throws Error with message to opencode
- [ ] 7.4 Test passthrough does not throw
- [ ] 7.5 Test multiple rule packs are checked in order
- [ ] 7.6 Test all rule packs are exercised (env, sops, private-key, encryption-tools, secret-managers)

## 8. Performance Tests

- [ ] 8.1 Create `tests/performance/opencode.perf.ts` benchmark suite
- [ ] 8.2 Measure baseline: tool.execute.before with no rules loaded
- [ ] 8.3 Measure with rules: tool.execute.before with all rules loaded
- [ ] 8.4 Test with varying rule counts: 0, 10, 50, 100 rules
- [ ] 8.5 Assert overhead < 50% and absolute time < 10ms
- [ ] 8.6 Report min, max, mean, p95, p99 latencies

## 9. Documentation

- [ ] 9.1 Create `packages/opencode/README.md` with installation instructions
- [ ] 9.2 Document plugin hooks and expected behavior
