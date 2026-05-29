# Tasks: Pi Adapter

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

- [ ] 1.1 Create `src/adapters/pi/` directory structure
- [ ] 1.2 Create `src/adapters/pi/tsconfig.json`
- [ ] 1.3 Create `src/adapters/pi/vitest.config.ts`

## 2. Extension Scaffold

> **TDD**: Write a smoke test that imports the adapter and verifies
> it exports a default function before implementing.

- [ ] 2.0 RED: Write test `src/adapters/pi/adapter.test.ts` that imports default export and asserts it's a function
- [ ] 2.1 GREEN: Create `src/adapters/pi/index.ts` with minimal extension function:
  ```typescript
  export default function (pi: ExtensionAPI) {
    // stub — hooks registered in task 4
  }
  ```
- [ ] 2.2 Define minimal `ExtensionAPI` type interface (or import from Pi types if available)

## 3. ToolCallContext Normalization

> **TDD**: Test the adapter-specific `normalizeToContext` helper independently.
> Note: `normalizeToolCall()` from change-1 (`src/core/normalizer.ts`) handles
> generic tool dispatch. The adapter's job is to extract Pi-specific event
> fields and delegate.

- [ ] 3.0 RED: Write tests for `normalizeToContext`:
  - bash event → `{ toolName: "bash", command: "..." }`
  - read event → `{ toolName: "read", filePath: "..." }`
  - write event → `{ toolName: "write", filePath: "..." }`
  - unknown event → `{ toolName: "..." }` (catch-all)
- [ ] 3.1 GREEN: Implement `normalizeToContext(event)` in `src/adapters/pi/normalize.ts`:
  ```typescript
  export function normalizeToContext(event: any): ToolCallContext {
    return normalizeToolCall(event.toolName, event.input || {});
  }
  ```
- [ ] 3.2 REFACTOR: Verify all normalization tests pass

## 4. Hook Logic (Block Behavior)

> **TDD**: Test hook behavior with mock Pi API. Write mock tool_call events
> and verify adapter returns correct block/passthrough responses.

- [ ] 4.0 RED: Write tests:
  - `cat .env` → returns `{ block: true, reason: "..." }`
  - `sops -d secrets.yaml` → returns `{ block: true, reason: "..." }`
  - `ls -la` → returns `undefined` (pass through)
  - `cat README.md` → returns `undefined`
  - Unknown tool → returns `undefined`
  - Reason message contains interpolated `{matched}` value
- [ ] 4.1 GREEN: Implement `tool_call` hook:
  ```typescript
  pi.on("tool_call", async (event, ctx) => {
    const toolCtx = normalizeToContext(event);
    const result = matchAndResolve(toolCtx, ALL_RULE_PACKS, PI_CAPABILITIES);
    if (result?.type === "block" || result?.type === "suggest") {
      return { block: true, reason: result.message };
    }
    return undefined;
  });
  ```
- [ ] 4.2 REFACTOR: Verify all hook tests pass

## 5. Session-End Observability

> **TDD**: Test that stats are logged at session end when interventions > 0.

- [ ] 5.0 RED: Write test: when `getStats()` returns `{ matches: 3, blocks: 2, suggests: 1 }`, session_end handler calls `pi.log()` with summary line
- [ ] 5.1 GREEN: Register `session_end` handler:
  ```typescript
  pi.on("session_end", () => {
    const stats = getStats();
    if (stats.matches > 0) {
      pi.log(`🛡️ Guardrails: ${stats.matches} interventions this session (${stats.blocks} blocked, ${stats.suggests} suggested)`);
    }
    resetStats();
  });
  ```
- [ ] 5.2 REFACTOR: Verify test passes

## 6. Adapter-Specific Integration Tests

> **TDD**: These are higher-level tests that exercise the full adapter
> with a mock Pi ExtensionAPI, verifying the hook-pipeline end-to-end.

- [ ] 6.0 RED: Write integration tests with mock ExtensionAPI:
  - Extension registers handler for `tool_call`
  - Extension registers handler for `session_end`
  - `.env` read via bash is blocked
  - `.env` read via read tool is blocked (file-path matcher)
  - Private key read via read tool is blocked (predicate matcher)
  - All rule packs are exercised (env, sops, private-key, encryption-tools, secret-managers, hardening)
  - ALL_RULE_PACKS are loaded (not curated by adapter)
- [ ] 6.1 GREEN: Create mock ExtensionAPI with event emitter, verify tests pass
- [ ] 6.2 REFACTOR: Clean up

## 7. Performance Tests

- [ ] 7.1 Create `src/adapters/pi/adapter.perf.ts` benchmark suite
- [ ] 7.2 Measure baseline: tool_call with no rules loaded
- [ ] 7.3 Measure with all rules loaded
- [ ] 7.4 Assert absolute time < 10ms per tool_call
- [ ] 7.5 Report min, max, mean, p95, p99 latencies

## 8. Documentation

- [ ] 8.1 Create `src/adapters/pi/README.md` with installation instructions
- [ ] 8.2 Document adapter hooks and expected behavior
