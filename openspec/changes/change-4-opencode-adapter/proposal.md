# Proposal: opencode Adapter (Change #4)

## Intent

Create an opencode plugin adapter that uses `block` behavior to prevent secret leaks. This is the second adapter in the POC, proving portability across harnesses.

## Problem

opencode (anomalyco/opencode) needs native integration with Agent Guardrails. It supports `tool.execute.before` and `tool.execute.after` hooks with full capability for block, suggest, run, and redact behaviors.

## Solution

Create an opencode plugin that:
1. Hooks into `tool.execute.before` for PreToolUse (block)
2. Imports secret rule packs from `@agent-guardrails/secrets`
3. Blocks dangerous commands/files before execution
4. Provides clear error messages when blocking

## Scope

### In Scope
- opencode plugin function
- `tool.execute.before` hook for block behavior
- Import and consume secret rule packs
- Error messages with block reason
- Integration tests with mock opencode API

### Out of Scope
- `suggest` and `run` behaviors (covered in `change-5-command-transforms`)
- `redact` behavior (covered in `change-9-redact-output`)
- Other adapters (covered in `change-3-pi-adapter`)

### Note
This change implements the `block` behavior only. The adapter will be updated in `change-5-command-transforms` to support `suggest` and `run` behaviors using the same rule packs.

## Approach

1. Create `packages/opencode/` directory
2. Implement plugin function using opencode API
3. Register `tool.execute.before` hook
4. Import rule packs and check against them
5. Throw Error when rule matches (block behavior)

## Harness Capabilities (Verified)

opencode supports:
- **block**: Yes (throw Error in `tool.execute.before`)
- **suggest**: Yes (error message with suggestion)
- **run**: Yes (has `$` Bun shell API)
- **redact**: Yes (can mutate `output.result` in `tool.execute.after`)
- **confirm**: No (no native UI)

For this POC, we only use `block`. `suggest`/`run`/`redact` come later.

## Plugin Structure

```typescript
import type { Plugin } from "@opencode-ai/plugin";
import { envRulePack, sopsRulePack, privateKeyRulePack } from "@agent-guardrails/secrets";

export const GuardrailsPlugin: Plugin = async ({ $ }) => {
  const rulePacks = [envRulePack, sopsRulePack, privateKeyRulePack];
  
  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool === "bash") {
        const command = output.args.command as string;
        for (const pack of rulePacks) {
          for (const rule of pack.rules) {
            if (rule.phase === "before-tool" && rule.match.type === "bash-command") {
              if (rule.match.pattern.test(command)) {
                if (rule.defaultAction.type === "block") {
                  throw new Error(rule.defaultAction.message);
                }
              }
            }
          }
        }
      }
    }
  };
};
```

## Success Criteria

- [ ] Plugin loads without errors
- [ ] PreToolUse blocks .env file reads
- [ ] PreToolUse blocks sops -d commands
- [ ] PreToolUse blocks private key reads
- [ ] Error messages are clear and actionable
- [ ] No false blocking of safe commands

## Dependencies

- Depends on `change-1-project-foundation` (types, harness model)
- Depends on `change-2-secret-blocking` (rule packs: env, sops, private-key)

## Risks

- **Risk**: opencode API changes
  - **Mitigation**: Pin adapter version, test with multiple opencode versions
