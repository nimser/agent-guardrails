# Proposal: Command Transforms

## Intent

Implement `suggest` Behavior for dangerous commands. This adds safer alternatives that the LLM can retry. `run` Behavior (executing the alternative directly) is deferred to a later change.

## Problem

Blocking alone is not enough. Users want to accomplish the same task safely. For example, `sops -d secrets.yaml` should suggest `sops -d secrets.yaml | sed 's/:.*/: [REDACTED]/'` rather than just blocking. This is the `suggest` Behavior — a Replacement is offered as a Message to the LLM.

## Clarification: suggest vs run

This change implements **`suggest` Behavior only**:
- **suggest**: Block original command, suggest Replacement(s) to LLM via Message. LLM decides whether to retry.
- **run**: Block original, execute alternative in hook, return Output. **Deferred to a later change.**

The `suggest` Behavior is universal (works in all Harnesses). The `run` Behavior requires shell execution in hooks (opencode/Pi only) and will be added in a future increment.

## Solution

Enhance Adapters to support `suggest` Behavior using the **same Rule Packs** from `change-2-secret-blocking`:
1. Reuse all Rule Packs from `@agent-guardrails/secrets`
2. Update Rule Default Actions from `block` to `suggest` with Replacement commands
3. Implement `findSaferCommands()` returning multiple Safer Commands with prioritization
4. Handle Smart Piped Commands that already have proper precautions
5. Implement Format-aware Redaction for SOPS in TypeScript

## Scope

### In Scope
- Update Rule Pack Default Actions to `suggest` with Replacement commands
- `findSaferCommands()` function returning multiple alternatives
- Prioritization logic for selecting most relevant suggestion
- Smart detection of piped commands with proper precautions (grep flags, etc.)
- Format-aware SOPS redaction in TypeScript
- Adapter updates to support `suggest` action
- Multiple suggestion support in Adapters

### Out of Scope
- `run` Behavior (deferred to later change - requires shell execution in hooks)
- `redact` Behavior (covered in `change-9-redact-output`)
- `confirm` Behavior (covered in `change-10-interactive-confirmation`)
- Git transforms (covered in `change-8-git-guardrails`)

## Key Design Decisions

### Multiple Suggestions

Instead of a single `findSaferCommand()`, implement `findSaferCommands()` that returns an array of Safer Commands:

```typescript
interface SaferCommand {
  command: string;
  description: string;
  confidence: number; // 0-1, higher = more likely to be what user wants
}

function findSaferCommands(originalCmd: string): SaferCommand[] {
  // Returns multiple alternatives, sorted by Confidence (highest first)
  // e.g., for "cat .env":
  // 1. sed 's/=.*/=[REDACTED]/' .env (full redaction, high Confidence)
  // 2. head -c 4 .env && echo "..." (first 4 chars, medium Confidence)
  // 3. grep -c '=' .env (count of keys only, low Confidence)
}
```

The Harness selects the primary Replacement (first element), but can show alternatives if the first doesn't work.

### Smart Piped Command Detection

When a command already has proper precautions (grep with limited context), don't block or suggest:

```typescript
// These should NOT be blocked:
"sops -d secrets.yaml | grep -o '.\{0,4\}password.\{0,4\}'" // Shows only 4 chars around match
"sops -d secrets.yaml | grep -c '='" // Just counts keys
"sops -d secrets.yaml | head -5" // Only shows first 5 lines
```

Matching: If piped command has `grep -o` with limited context, `head`, `tail`, `wc`, allow it through.

### SOPS Output-Type Handling

When SOPS command specifies `--output-type`, use that for Format-aware Redaction instead of defaulting to YAML:

```typescript
// Command: sops -d --output-type json secrets.yaml
// Format-aware Redaction should use JSON format, not YAML
```

## Transform Examples

### env.read (multiple suggestions)
```typescript
{
  id: "env.read",
  defaultAction: {
    type: "suggest",
    replacement: [
      "sed 's/=.*/=[REDACTED]/' .env",
      "head -c 4 .env && echo '...'",
      "grep -c '=' .env"
    ],
    message: "Reading .env blocked. Use redacted version instead."
  }
}
```

### sops.decrypt (with output-type awareness)
```typescript
{
  id: "sops.decrypt",
  defaultAction: {
    type: "suggest",
    replacement: [
      "sops -d {file} | sed 's/:.*/: [REDACTED]/'",
      "sops -d {file} | grep -o '.\\{0,4\\}password.\\{0,4\\}'"
    ],
    message: "SOPS decrypt blocked. Use redacted version instead."
  }
}
```

## Success Criteria

- [ ] SOPS transform suggests redacted decrypt command
- [ ] env transform suggests redacted read command (multiple options)
- [ ] kubernetes transform suggests redacted secrets command
- [ ] vault transform suggests redacted read command
- [ ] SOPS redaction is format-aware (YAML, JSON, ENV)
- [ ] SOPS redaction respects `--output-type` flag
- [ ] Smart piped commands with precautions are allowed through
- [ ] `suggest` works in all Harnesses
- [ ] Multiple suggestions are returned and prioritized
- [ ] All transforms have unit tests

## Dependencies

- Depends on `change-1-project-foundation` (types, Behavior model)
- Depends on `change-2-secret-blocking` (Rule Packs)
- Depends on `change-3-pi-adapter` (Pi Adapter to update)
- Depends on `change-4-opencode-adapter` (opencode Adapter to update)

## Risks

- **Risk**: Suggested command doesn't accomplish same goal
  - **Mitigation**: Test each Transform with real commands
- **Risk**: SOPS format detection fails
  - **Mitigation**: Default to generic redaction pattern
- **Risk**: Smart Piped Command Detection is too permissive
  - **Mitigation**: Conservative defaults, warn even when allowing
