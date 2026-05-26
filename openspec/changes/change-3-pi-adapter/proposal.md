# Proposal: Pi Adapter (Change #3)

## Intent

Create a Pi extension adapter that uses `block` behavior to prevent secret leaks. This is the first adapter in the POC, proving the hook path works in Pi.

## Problem

Pi (earendil-works/pi) needs native integration with Agent Guardrails. It supports `tool_call` and `tool_result` hooks with full capability for block, suggest, run, redact, and confirm behaviors.

## Solution

Create a Pi extension that:
1. Hooks into `tool_call` for PreToolUse (block)
2. Imports secret rule packs from `@agent-guardrails/secrets`
3. Blocks dangerous commands/files before execution
4. Provides clear reason messages when blocking

## Scope

### In Scope
- Pi extension function
- `tool_call` hook for block behavior
- Import and consume secret rule packs
- Reason messages when blocking
- Integration tests with mock Pi API

### Out of Scope
- `suggest` and `run` behaviors (covered in `change-5-command-transforms`)
- `redact` behavior (covered in `change-9-redact-output`)
- `confirm` behavior (covered in `change-10-interactive-confirmation`)
- Other adapters (covered in `change-4-opencode-adapter`)

### Note
This change implements the `block` behavior only. The adapter will be updated in `change-5-command-transforms` to support `suggest` and `run` behaviors using the same rule packs.

## Approach

1. Create `packages/pi/` directory
2. Implement extension function using Pi API
3. Register `tool_call` hook
4. Import rule packs and check against them
5. Return `{ block: true, reason: "..." }` when rule matches

## Harness Capabilities (Verified)

Pi supports:
- **block**: Yes (return `{ block: true }` from `tool_call`)
- **suggest**: Yes (reason message)
- **run**: Yes (has `pi.exec()` for shell execution)
- **redact**: Yes (can override `tool_result` content)
- **confirm**: Yes (native `ctx.ui.confirm()`)

For this POC, we only use `block`. `suggest`/`run`/`redact`/`confirm` come later.

## Extension Structure

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

- [ ] Extension loads without errors
- [ ] PreToolUse blocks .env file reads
- [ ] PreToolUse blocks sops -d commands
- [ ] PreToolUse blocks private key reads
- [ ] Reason messages are clear and actionable
- [ ] No false blocking of safe commands

## Dependencies

- Depends on `change-1-project-foundation` (types, harness model)
- Depends on `change-2-secret-blocking` (rule packs: env, sops, private-key)

## Risks

- **Risk**: Pi API changes
  - **Mitigation**: Pin adapter version, test with multiple Pi versions
