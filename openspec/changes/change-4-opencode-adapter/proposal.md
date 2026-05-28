# Proposal: opencode Adapter (Change #4)

## Intent

Create an opencode Adapter that uses `block` Behavior to prevent secret leaks. This is the second Adapter in the MVP, proving portability across Harnesses.

## Problem

opencode (anomalyco/opencode) needs native integration with Agent Guardrails. It supports `tool.execute.before` (Tool Call) and `tool.execute.after` (Tool Result) hooks with full Capability for block, suggest, run, and redact Behaviors.

## Solution

Create an opencode Adapter that:
1. Hooks into `tool.execute.before` (Tool Call) for before-tool Phase (block)
2. Imports secret Rule Packs from `@agent-guardrails/secrets`
3. Blocks dangerous commands/files before execution
4. Provides clear Messages when blocking

## Scope

### In Scope
- opencode Adapter function
- `tool.execute.before` hook (Tool Call) for block Behavior
- Import and consume secret Rule Packs
- Messages with block reason
- Integration tests with mock opencode API

### Out of Scope
- `suggest` and `run` Behaviors (covered in `change-5-command-transforms`)
- `redact` Behavior (covered in `change-10-redact-output`)
- Other Adapters (covered in `change-3-pi-adapter`)

### Note
This change implements the `block` Behavior only. The Adapter will be updated in `change-5-command-transforms` to support `suggest` and `run` Behaviors using the same Rule Packs.

## Approach

1. Create `packages/opencode/` directory
2. Implement Adapter function using opencode API
3. Register `tool.execute.before` hook (Tool Call) for **all tools** (not just bash)
4. Normalize opencode event into `ToolCallContext` (discriminated union on toolName)
5. Call `matchAndResolve(ctx, ALL_RULE_PACKS, capabilities)` from `@agent-guardrails/engine`
6. Throw Error with result.message when engine returns a block Action

## Harness Capabilities (Verified)

opencode supports:
- **block**: Yes (throw Error in `tool.execute.before`)
- **suggest**: Yes (error Message with Replacement)
- **run**: Yes (has `$` Bun shell API)
- **redact**: Yes (can mutate `output.result` in `tool.execute.after` — Tool Result)
- **confirm**: No (no native UI)

For this MVP, we only use `block`. `suggest`/`run`/`redact` come later.

## Adapter Structure

```typescript
import type { Plugin } from "@opencode-ai/plugin";
import type { ToolCallContext } from "@agent-guardrails/core";
import { matchAndResolve } from "@agent-guardrails/engine";
import { ALL_RULE_PACKS } from "@agent-guardrails/secrets";
import { OPENCODE_CAPABILITIES } from "./capabilities";

export const GuardrailsPlugin: Plugin = async ({ $ }) => {
  return {
    "tool.execute.before": async (input, output) => {
      // Step 1: Normalize opencode event into ToolCallContext
      const toolCtx = normalizeToContext(input, output);

      // Step 2: Call engine
      const result = matchAndResolve(toolCtx, ALL_RULE_PACKS, OPENCODE_CAPABILITIES);

      // Step 3: Translate to opencode-specific block mechanism
      if (result?.type === "block" || result?.type === "suggest") {
        throw new Error(result.message);
      }
    }
  };
};

function normalizeToContext(input, output): ToolCallContext {
  switch (input.tool) {
    case "bash":
      return { toolName: "bash", command: output.args.command };
    case "read":
    case "write":
      return { toolName: input.tool, filePath: output.args.path };
    default:
      return { toolName: input.tool };
  }
}
```

The Adapter is a thin shim: normalize → engine → translate. All matching logic lives in `@agent-guardrails/engine`.

## Success Criteria

- [ ] Adapter loads without errors
- [ ] Tool Call hook blocks .env file reads
- [ ] Tool Call hook blocks sops -d commands
- [ ] Tool Call hook blocks private key reads
- [ ] Messages are clear and actionable
- [ ] No false blocking of safe commands

## Dependencies

- Depends on `change-1-project-foundation` (types, Harness model)
- Depends on `change-2-secret-blocking` (Rule Packs: env, sops, private-key)

## Risks

- **Risk**: opencode API changes
  - **Mitigation**: Pin Adapter version, test with multiple opencode versions
