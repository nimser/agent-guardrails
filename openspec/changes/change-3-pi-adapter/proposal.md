# Proposal: Pi Adapter (Change #3)

## Intent

Create a Pi Adapter that uses `block` Behavior to prevent secret leaks. This is the first Adapter in the POC, proving the hook path works in Pi.

## Problem

Pi (earendil-works/pi) needs native integration with Agent Guardrails. It supports `tool_call` (Tool Call) and `tool_result` (Tool Result) hooks with full Capability for block, suggest, run, redact, and confirm Behaviors.

## Solution

Create a Pi Adapter that:
1. Hooks into `tool_call` (Tool Call) for before-tool Phase (block)
2. Imports secret Rule Packs from `@agent-guardrails/secrets`
3. Blocks dangerous commands/files before execution
4. Provides clear Messages when blocking

## Scope

### In Scope
- Pi Adapter function
- `tool_call` hook (Tool Call) for block Behavior
- Import and consume secret Rule Packs
- Messages when blocking
- Integration tests with mock Pi API

### Out of Scope
- `suggest` and `run` Behaviors (covered in `change-5-command-transforms`)
- `redact` Behavior (covered in `change-9-redact-output`)
- `confirm` Behavior (covered in `change-10-interactive-confirmation`)
- Other Adapters (covered in `change-4-opencode-adapter`)

### Note
This change implements the `block` Behavior only. The Adapter will be updated in `change-5-command-transforms` to support `suggest` and `run` Behaviors using the same Rule Packs.

## Approach

1. Create `packages/pi/` directory
2. Implement Adapter function using Pi API
3. Register `tool_call` hook (Tool Call)
4. Import Rule Packs and check against them
5. Return `{ block: true, reason: "..." }` when Rule matches (reason carries the Message)

## Harness Capabilities (Verified)

Pi supports:
- **block**: Yes (return `{ block: true }` from `tool_call`)
- **suggest**: Yes (reason field carries the Message)
- **run**: Yes (has `pi.exec()` for shell execution)
- **redact**: Yes (can override `tool_result` content — Tool Result)
- **confirm**: Yes (native `ctx.ui.confirm()`)

For this POC, we only use `block`. `suggest`/`run`/`redact`/`confirm` come later.

## Adapter Structure

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { envRulePack, sopsRulePack, privateKeyRulePack } from "@agent-guardrails/secrets";

export default function (pi: ExtensionAPI) {
  const rulePacks = [envRulePack, sopsRulePack, privateKeyRulePack];
  
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName === "bash") {
      const command = event.input.command as string;
      for (const pack of rulePacks) {
        for (const rule of pack.rules) {
          if (rule.phase === "before-tool" && rule.match.type === "bash-command") {
            if (rule.match.pattern.test(command)) {
              if (rule.defaultAction.type === "block") {
                // Pi uses 'reason' field to carry the Message
                return { block: true, reason: rule.defaultAction.message };
              }
            }
          }
        }
      }
    }
  });
}
```

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

- **Risk**: Pi API changes
  - **Mitigation**: Pin Adapter version, test with multiple Pi versions
