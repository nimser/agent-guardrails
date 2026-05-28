# Proposal: Pi Adapter (Change #3)

## Intent

Create a Pi Adapter that uses `block` Behavior to prevent secret leaks. This is the first Adapter in the MVP, proving the hook path works in Pi.

## Problem

Pi (earendil-works/pi) needs native integration with Agent Guardrails. It supports `tool_call` (Tool Call) and `tool_result` (Tool Result) hooks with full Capability for block, suggest, run, redact, and confirm Behaviors.

## Solution

Create engine (`src/engine/`) (the shared matching engine) and a Pi Adapter that uses it:
1. Create the engine package with `matchAndResolve()` — the shared matching function consumed by all Adapters
2. Create a Pi Adapter that hooks into `tool_call` (Tool Call) for before-tool Phase (block)
3. Import secret Rule Packs from rule packs (`src/packs/`)
4. Block dangerous commands/files before execution
5. Provide clear Messages when blocking

## Scope

### In Scope
- Pi Adapter function
- `tool_call` hook (Tool Call) for block Behavior
- Import and consume secret Rule Packs
- Messages when blocking
- Integration tests with mock Pi API

### Out of Scope
- `suggest` and `run` Behaviors (covered in `change-5-command-transforms`)
- `redact` Behavior (covered in `change-10-redact-output`)
- `confirm` Behavior (covered in `change-11-interactive-confirmation`)
- Other Adapters (covered in `change-4-opencode-adapter`)

### Note
This change implements the `block` Behavior only. The Adapter will be updated in `change-5-command-transforms` to support `suggest` and `run` Behaviors using the same Rule Packs.

## Approach

1. Create `src/adapters/pi/` directory (single-package structure)
2. Implement Adapter function using Pi API
3. Register `tool_call` hook (Tool Call) for **all tools** (not just bash)
4. Normalize Pi event into `ToolCallContext` (discriminated union on toolName)
5. Call `matchAndResolve(ctx, ALL_RULE_PACKS, capabilities)` (engine layer)
6. Return `{ block: true, reason: result.message }` when engine returns a block Action
7. Log observability stats at session teardown (Tier 1)

## Harness Capabilities (Verified)

Pi supports:
- **block**: Yes (return `{ block: true }` from `tool_call`)
- **suggest**: Yes (reason field carries the Message)
- **run**: Yes (has `pi.exec()` for shell execution)
- **redact**: Yes (can override `tool_result` content — Tool Result)
- **confirm**: Yes (native `ctx.ui.confirm()`)

For this MVP, we only use `block`. `suggest`/`run`/`redact`/`confirm` come later.

## Adapter Structure

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { ToolCallContext } from "../../../core";
import { matchAndResolve, getStats, resetStats } from "../../../engine";
import { ALL_RULE_PACKS } from "../packs";
import { PI_CAPABILITIES } from "./capabilities";

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    // Step 1: Normalize Pi event into ToolCallContext
    const toolCtx = normalizeToContext(event);

    // Step 2: Call engine
    const result = matchAndResolve(toolCtx, ALL_RULE_PACKS, PI_CAPABILITIES);

    // Step 3: Translate to Pi-specific block mechanism
    if (result?.type === "block" || result?.type === "suggest") {
      return { block: true, reason: result.message };
    }
  });

  // Observability Tier 1: log summary at session teardown
  pi.on("session_end", () => {
    const stats = getStats();
    if (stats.matches > 0) {
      pi.log(`🛡️ Guardrails: ${stats.matches} interventions this session (${stats.blocks} blocked, ${stats.suggests} suggested)`);
    }
    resetStats();
  });
}

function normalizeToContext(event): ToolCallContext {
  switch (event.toolName) {
    case "bash":
      return { toolName: "bash", command: event.input.command, filePath: event.input.cwd };
    case "read":
    case "write":
      return { toolName: event.toolName, filePath: event.input.path };
    default:
      return { toolName: event.toolName };
  }
}
```

The Adapter is a thin shim: normalize → engine → translate. All matching logic lives in the engine layer.

## Observability Tier 1

The adapter reads stats from the engine (`getStats()`) and uses Pi's native `pi.log()` to surface a one-line summary at session end:

```
🛡️ Guardrails: 7 interventions this session (5 blocked, 2 suggested)
```

Stats are accumulated by the engine during `matchAndResolve()` (see Change 1 Decision 17). The adapter is responsible only for reading and displaying them via the harness's native logging mechanism.

## Success Criteria

- [ ] Adapter loads without errors
- [ ] Tool Call hook blocks .env file reads
- [ ] Tool Call hook blocks sops -d commands
- [ ] Tool Call hook blocks private key reads
- [ ] Messages are clear and actionable
- [ ] No false blocking of safe commands
- [ ] Hardening rules block eval/wrapper patterns
- [ ] Observability: session-end log line shows intervention count when > 0

## Dependencies

- Depends on `change-1-project-foundation` (types, Harness model)
- Depends on `change-2-secret-blocking` (Rule Packs: env, sops, private-key)

## Risks

- **Risk**: Pi API changes
  - **Mitigation**: Pin Adapter version, test with multiple Pi versions
