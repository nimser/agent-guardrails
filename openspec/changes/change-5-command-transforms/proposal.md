# Proposal: Command Transforms

## Intent

Implement `suggest` behavior for dangerous commands. This adds safer alternatives that the LLM can retry. `run` behavior (executing the alternative directly) is deferred to a later change.

## Problem

Blocking alone is not enough. Users want to accomplish the same task safely. For example, `sops -d secrets.yaml` should suggest `sops -d secrets.yaml | sed 's/:.*/: [REDACTED]/'` rather than just blocking.

## Clarification: suggest vs run

This change implements **`suggest` behavior only**:
- **suggest**: Block original command, suggest alternative(s) to LLM. LLM decides whether to retry.
- **run**: Block original, execute alternative in hook, return output. **Deferred to a later change.**

The `suggest` behavior is universal (works in all harnesses). The `run` behavior requires shell execution in hooks (opencode/Pi only) and will be added in a future increment.

## Solution

Enhance adapters to support `suggest` behavior using the **same rule packs** from `change-2-secret-blocking`:
1. Reuse all rule packs from `@agent-guardrails/secrets`
2. Update rule defaultActions from `block` to `suggest` with replacement commands
3. Implement `findSaferCommands()` returning multiple alternatives with prioritization
4. Handle smart piped commands that already have proper precautions
5. Implement format-aware SOPS redaction in TypeScript

## Scope

### In Scope
- Update rule pack defaultActions to `suggest` with replacement commands
- `findSaferCommands()` function returning multiple alternatives
- Prioritization logic for selecting most relevant suggestion
- Smart detection of piped commands with proper precautions (grep flags, etc.)
- Format-aware SOPS redaction in TypeScript
- Adapter updates to support `suggest` action
- Multiple suggestion support in adapters

### Out of Scope
- `run` behavior (deferred to later change - requires shell execution in hooks)
- `redact` behavior (covered in `change-9-redact-output`)
- `confirm` behavior (covered in `change-10-interactive-confirmation`)
- Git transforms (covered in `change-8-git-guardrails`)

## Key Design Decisions

### Multiple Suggestions

Instead of a single `findSaferCommand()`, implement `findSaferCommands()` that returns an array:

```typescript
interface SaferCommand {
  command: string;
  description: string;
  confidence: number; // 0-1, higher = more likely to be what user wants
}

function findSaferCommands(originalCmd: string): SaferCommand[] {
  // Returns multiple alternatives, sorted by confidence
  // e.g., for "cat .env":
  // 1. sed 's/=.*/=[REDACTED]/' .env (full redaction)
  // 2. head -c 4 .env && echo "..." (first 4 chars)
  // 3. grep -c '=' .env (count of keys only)
}
```

The harness selects the primary suggestion, but can show alternatives if the first doesn't work.

### Smart Piped Command Detection

When a command already has proper precautions (grep with limited context), don't block or suggest:

```typescript
// These should NOT be blocked:
"sops -d secrets.yaml | grep -o '.\{0,4\}password.\{0,4\}'" // Shows only 4 chars around match
"sops -d secrets.yaml | grep -c '='" // Just counts keys
"sops -d secrets.yaml | head -5" // Only shows first 5 lines
```

Detection: If piped command has `grep -o` with limited context, `head`, `tail`, `wc`, allow it through.

### SOPS Output-Type Handling

When SOPS command specifies `--output-type`, use that for redaction instead of defaulting to YAML:

```typescript
// Command: sops -d --output-type json secrets.yaml
// Redaction should use JSON format, not YAML
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
- [ ] `suggest` works in all harnesses
- [ ] Multiple suggestions are returned and prioritized
- [ ] All transforms have unit tests

## Dependencies

- Depends on `change-1-project-foundation` (types, behavior model)
- Depends on `change-2-secret-blocking` (rule packs)
- Depends on `change-3-pi-adapter` (Pi adapter to update)
- Depends on `change-4-opencode-adapter` (opencode adapter to update)

## Risks

- **Risk**: Suggested command doesn't accomplish same goal
  - **Mitigation**: Test each transform with real commands
- **Risk**: SOPS format detection fails
  - **Mitigation**: Default to generic redaction pattern
- **Risk**: Smart piped detection is too permissive
  - **Mitigation**: Conservative defaults, warn even when allowing
