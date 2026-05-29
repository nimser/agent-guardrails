# Proposal: Codex CLI Adapter (Change #6)

## Intent

Create a Codex CLI Adapter that uses `block` and `suggest` Behaviors to prevent secret leaks and dangerous operations. Codex CLI uses shell hooks with JSON protocol for tool interception.

## Problem

Codex CLI (openai/codex) needs native integration with Agent Guardrails. It supports `PreToolUse` (Tool Call) and `PostToolUse` (Tool Result) shell hooks that communicate via JSON on stdin/stdout.

## Solution

Create a Codex CLI Adapter that:
1. Implements `guard.sh` shell script for PreToolUse/PostToolUse
2. Creates `hooks.json` for hook registration
3. Blocks dangerous commands with JSON permission decision
4. Suggests **Safer Alternative**s when available

## Scope

### In Scope
- `guard.sh` shell hook script
- `hooks.json` for hook registration
- PreToolUse: block and suggest Behaviors via JSON protocol
- Import and consume Rule Packs (compiled into shell script or via companion)
- Clear block/suggest Messages in JSON output
- Installation via CLI (`npx ag setup codex`)

### Out of Scope
- `redact` Behavior (shell hooks cannot modify Tool Output)
- `run` Behavior (shell hooks cannot execute Replacement commands)
- `confirm` Behavior (covered in `change-11-interactive-confirmation`)
- Other Adapters

## Approach

1. Create `packages/codex/` directory
2. Implement `guard.sh` shell hook script
3. Create `hooks.json` for hook registration
4. Handle PreToolUse: output JSON with `permissionDecision: deny` or `suggest`
5. Handle PostToolUse: output JSON with redacted content (when possible)
6. Test with mock Codex environment

## Harness Capabilities (Verified)

Codex CLI supports:
- **block**: Yes (`permissionDecision: deny` in PreToolUse JSON)
- **suggest**: Yes (Message in `permissionDecisionReason`)
- **run**: No (shell hooks cannot execute Replacement commands)
- **redact**: No (PostToolUse cannot modify Tool Output, only add context)
- **confirm**: Yes (forces approval prompt via `PermissionRequest`)

For this change, we implement `block` and `suggest`. `confirm` comes in `change-11-interactive-confirmation`.

## Hook Protocol

### PreToolUse

Input (stdin):
```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "bash",
  "tool_input": {
    "command": "sops -d secrets.yaml"
  }
}
```

Output (stdout):
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "SOPS decrypt blocked to prevent secret leaks. Run: sops -d secrets.yaml | sed 's/:.*/: [REDACTED]/'"
  }
}
```

### PostToolUse

Input (stdin):
```json
{
  "hook_event_name": "PostToolUse",
  "tool_name": "bash",
  "tool_output": "api_key: AKIAIOSFODNN7EXAMPLE\nregion: us-east-1"
}
```

Output (stdout):
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "WARNING: Output contained secrets and was redacted. 1 secret(s) removed."
  }
}
```

## Success Criteria

- [ ] `guard.sh` is executable and outputs valid JSON
- [ ] PreToolUse blocks .env file reads
- [ ] PreToolUse blocks sops -d commands with suggestion
- [ ] PreToolUse suggests **Safer Alternative**s for dangerous commands
- [ ] PostToolUse detects secrets in output
- [ ] Installation via `npx ag setup codex` works

## Dependencies

- Depends on `change-1-project-foundation` (types, Harness model)
- Depends on `change-2-secret-blocking` (Rule Packs)
- Depends on `change-5-command-transforms` (suggest Behavior)

## Risks

- **Risk**: Shell script complexity for JSON parsing
  - **Mitigation**: Use `jq` for JSON handling, keep script simple
- **Risk**: Codex CLI API changes
  - **Mitigation**: Pin Adapter version, test with multiple Codex versions
