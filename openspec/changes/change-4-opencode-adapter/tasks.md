# Tasks: opencode Adapter

> **TDD MANDATE**: Every task below follows Test-Driven Development. For each
> implementation section: write failing tests for the related scenarios (RED),
> then write the minimal code to make them pass (GREEN), then refactor
> (REFACTOR). Related scenarios within a section may share one refactoring pass.
> **Never write implementation before the tests.** See `.agents/skills/tdd/SKILL.md`.
>
> **Important**: This change does NOT create or modify `src/engine/`. The engine
> (`matchAndResolve`, `getStats`, `resetStats`) was created in Change 1 and is
> consumed here as a dependency. If any engine changes are needed, they belong
> in a new change, not in this adapter work.

## 1. Setup

- [ ] 1.1 Create `src/adapters/opencode/` directory structure
- [ ] 1.2 Create `src/adapters/opencode/tsconfig.json`
- [ ] 1.3 Create `src/adapters/opencode/vitest.config.ts`

## 2. Plugin Scaffold

> **TDD**: Write a smoke test that imports the plugin and verifies
> it exports a function that returns hooks before implementing.

- [ ] 2.0 RED: Write test `src/adapters/opencode/plugin.test.ts` that:
  - Calls `GuardrailsPlugin({ $: mockShell })` and asserts it returns an object
  - Asserts the returned object has `tool.execute.before` handler
  - Asserts the returned object has `session.teardown` handler
- [ ] 2.1 GREEN: Create `src/adapters/opencode/index.ts` with minimal plugin:
  ```typescript
  export const GuardrailsPlugin: Plugin = async ({ $ }) => {
    return {
      "tool.execute.before": async (input, output) => { /* stub */ },
      "session.teardown": async () => { /* stub */ }
    };
  };
  ```
- [ ] 2.2 Define minimal `Plugin` type interface (or import from opencode types if available)

## 3. ToolCallContext Normalization

> **TDD**: Test the adapter-specific `normalizeToContext` helper independently.
> Note: `normalizeToolCall()` from change-1 (`src/core/normalizer.ts`) handles
> generic tool dispatch. The adapter's job is to extract opencode-specific
> event fields and delegate.

- [ ] 3.0 RED: Write tests for `normalizeToContext`:
  - bash event (`input.tool === "bash"`) → `{ toolName: "bash", command: output.args.command }`
  - read event → `{ toolName: "read", filePath: output.args.path }`
  - write event → `{ toolName: "write", filePath: output.args.path }`
  - unknown event → `{ toolName: input.tool }` (catch-all)
- [ ] 3.1 GREEN: Implement `normalizeToContext(input, output)` in `src/adapters/opencode/normalize.ts`:
  ```typescript
  export function normalizeToContext(input: any, output: any): ToolCallContext {
    return normalizeToolCall(input.tool, output.args || {});
  }
  ```
- [ ] 3.2 REFACTOR: Verify all normalization tests pass

## 4. Hook Logic (Block Behavior)

> **TDD**: Test hook behavior with mock opencode API. Write mock tool.execute.before
> events and verify adapter throws Error or passes through.

- [ ] 4.0 RED: Write tests:
  - `cat .env` → throws `Error` with message containing `.env`
  - `sops -d secrets.yaml` → throws `Error`
  - `ls -la` → does not throw
  - `cat README.md` → does not throw
  - Unknown tool → does not throw
  - Error message contains interpolated `{matched}` value
- [ ] 4.1 GREEN: Implement `tool.execute.before` hook:
  ```typescript
  "tool.execute.before": async (input, output) => {
    const toolCtx = normalizeToContext(input, output);
    const result = matchAndResolve(toolCtx, ALL_RULE_PACKS, OPENCODE_CAPABILITIES);
    if (result?.type === "block" || result?.type === "suggest") {
      throw new Error(result.message);
    }
  }
  ```
- [ ] 4.2 REFACTOR: Verify all hook tests pass

## 5. Session-Teardown Observability

> **TDD**: Test that stats are logged at session teardown when interventions > 0.

- [ ] 5.0 RED: Write test: when `getStats()` returns `{ matches: 3, blocks: 2, suggests: 1 }`, session.teardown handler writes summary to `console.log`
- [ ] 5.1 GREEN: Register `session.teardown` handler:
  ```typescript
  "session.teardown": async () => {
    const stats = getStats();
    if (stats.matches > 0) {
      console.log(`🛡️ Guardrails: ${stats.matches} interventions this session (${stats.blocks} blocked, ${stats.suggests} suggested)`);
    }
    resetStats();
  }
  ```
- [ ] 5.2 REFACTOR: Verify test passes

## 6. Adapter-Specific Integration Tests

> **TDD**: These are higher-level tests that exercise the full adapter
> with a mock opencode Plugin context, verifying the hook-pipeline end-to-end.

- [ ] 6.0 RED: Write integration tests with mock plugin context:
  - `.env` read via bash throws Error
  - `.env` read via read tool throws Error (file-path matcher)
  - Private key read via read tool throws Error (predicate matcher)
  - All rule packs are exercised (env, sops, private-key, encryption-tools, secret-managers, hardening)
  - ALL_RULE_PACKS are loaded (not curated by adapter)
  - Unknown tool passes through
- [ ] 6.1 GREEN: Create mock plugin context with `$` shell function, verify tests pass
- [ ] 6.2 REFACTOR: Clean up

## 7. Performance Tests

- [ ] 7.1 Create `src/adapters/opencode/plugin.perf.ts` benchmark suite
- [ ] 7.2 Measure baseline: tool.execute.before with no rules loaded
- [ ] 7.3 Measure with all rules loaded
- [ ] 7.4 Assert absolute time < 10ms per hook invocation
- [ ] 7.5 Report min, max, mean, p95, p99 latencies

## 8. Documentation

- [ ] 8.1 Create `src/adapters/opencode/README.md` with installation instructions
- [ ] 8.2 Document adapter hooks and expected behavior
