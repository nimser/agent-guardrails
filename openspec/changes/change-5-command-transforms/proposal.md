# Proposal: Command Transforms

## Intent

Implement `suggest` Behavior for dangerous commands. This adds safer alternatives that the LLM can retry. `run` Behavior (executing the alternative directly) is deferred to a later change.

## Problem

Blocking alone is not enough. Users want to accomplish the same task safely. For example, `sops -d secrets.yaml` should suggest `sops -d secrets.yaml | sed 's/:.*/: [REDACTED]/'` rather than just blocking. This is the `suggest` Behavior — a Replacement is offered as a Message to the LLM.

## Clarification: suggest vs run

This change implements **`suggest` Behavior only**:
- **suggest**: Block original command, suggest single Replacement to LLM via Message. LLM decides whether to retry.
- **run**: Block original, execute alternative in hook, return Output. **Deferred to a later change.**

The `suggest` Behavior is universal (works in all Harnesses). The `run` Behavior requires shell execution in hooks (opencode/Pi only) and will be added in a future increment.

## Solution

Enhance Adapters to support `suggest` Behavior using the **same Rule Packs** from `change-2-secret-blocking`:
1. Reuse all Rule Packs from `@agent-guardrails/secrets`
2. Update Rule Default Actions from `block` to `suggest` with single Replacement command
3. Implement `findSaferCommand()` returning a single safer command (or null)
4. Implement Format-aware SOPS Redaction via shell pipelines, format detected from file extension and `--output-type`/`--input-type` flags
5. When `findSaferCommand()` returns null, fall back to `block` via the Action Fallback Chain

## Scope

### In Scope
- Update Rule Pack Default Actions to `suggest` with single Replacement command
- `findSaferCommand()` function returning a single safer command or null
- Format-aware SOPS redaction via shell pipelines (format from extension and `--output-type`/`--input-type` flags)
- New Rule Packs: `kubernetes`, `gh-cli`, `direnv`
- Adapter updates to support `suggest` Behavior
- Suggest → block fallback when no safer command found

### Out of Scope
- `run` Behavior (deferred to later change - requires shell execution in hooks)
- `redact` Behavior (covered in `change-10-redact-output`)
- `confirm` Behavior (covered in `change-11-interactive-confirmation`)
- Git transforms (covered in `change-9-git-guardrails`)
- Smart Piped Command Detection (deferred to post-MVP with shell tokenizer)
- Multiple suggestions / confidence scoring (deferred to post-MVP with intent analysis)

## Key Design Decisions

### Single Safer Command

`findSaferCommand()` returns a single safer command string or null:

```typescript
function findSaferCommand(originalCmd: string): string | null {
  // Returns one safer alternative, or null if none known
  // e.g., for "cat .env":
  //   → "sed 's/=.*/=[REDACTED]/' .env"
  // For "sops -d secrets.json":
  //   → "sops -d secrets.json | jq 'walk(if type == \"string\" then \"[REDACTED]\" else . end)'"
  // For unknown command with no known safer alternative:
  //   → null (engine falls back to block)
}
```

### Suggest → Block Fallback

When `findSaferCommand()` returns null, the engine steps down the Action Fallback Chain:
```
suggest (no safer command found) → block
```
The block message uses the generic contextual template: `"Blocked: \`{matched}\` — no safer alternative available."`

### SOPS Format Detection

Format-aware redaction uses shell pipelines. Format detection priority:
1. `--output-type` flag (explicit, highest confidence)
2. `--input-type` flag (if no output-type specified)
3. File extension from the last non-flag argument
4. If none of the above → `findSaferCommand()` returns null → falls back to block

```typescript
// sops -d secrets.yaml  → suggest sops -d secrets.yaml | sed 's/:.*/: [REDACTED]/'
// sops -d secrets.json  → suggest sops -d secrets.json | jq 'walk(if type == "string" then "[REDACTED]" else . end)'
// sops -d secrets.env   → suggest sops -d secrets.env | sed 's/=.*/=[REDACTED]/'
// sops -d --output-type json secrets.yaml → use JSON redaction
// echo "..." | sops -d  → no format detected → block
```

## Transform Examples

### env.read
```typescript
{
  id: "env.read",
  defaultAction: {
    type: "suggest",
    replacement: "sed 's/=.*/=[REDACTED]/' {matched}",
    message: "Blocked: `{matched}` — .env files may contain secrets. Try the redacted version instead."
  }
}
```

### sops.decrypt (format-aware)
```typescript
{
  id: "sops.decrypt",
  defaultAction: {
    type: "suggest",
    replacement: "sops -d {file} | sed 's/:.*/: [REDACTED]/'",
    message: "Blocked: `{matched}` — SOPS decrypt may expose secrets. Try the redacted version instead."
  }
}
// Note: replacement is format-specific based on file extension or --output-type/--input-type flags
```

### gh-cli.secret-view
```typescript
{
  id: "gh-cli.secret-view",
  defaultAction: {
    type: "suggest",
    replacement: "gh secret list",
    message: "Blocked: `{matched}` — viewing secret values may expose credentials. List secret names instead."
  }
}
```

## Success Criteria

- [ ] SOPS transform suggests format-aware redacted decrypt command (based on extension and --output-type/--input-type)
- [ ] env transform suggests redacted read command
- [ ] kubernetes transform suggests redacted secrets command
- [ ] gh-cli transform suggests listing secrets instead of viewing values
- [ ] direnv/dotenv transform suggests redacted alternatives
- [ ] SOPS redaction falls back to block when format cannot be determined (stdin, no extension)
- [ ] `suggest` works in all Harnesses
- [ ] `suggest` falls back to `block` when no safer command found
- [ ] All transforms have unit tests

## Dependencies

- Depends on `change-1-project-foundation` (types, Behavior model)
- Depends on `change-2-secret-blocking` (Rule Packs)
- Depends on `change-3-pi-adapter` (Pi Adapter to update)
- Depends on `change-4-opencode-adapter` (opencode Adapter to update)

## Risks

- **Risk**: Suggested command doesn't accomplish same goal
  - **Mitigation**: Test each Transform with real commands
- **Risk**: SOPS format detection fails (no extension, stdin)
  - **Mitigation**: Fall back to block via Action Fallback Chain — no guessing
- **Risk**: Shell-based redaction is imperfect
  - **Mitigation**: TypeScript format-aware redaction comes with `run` Behavior in a later change
