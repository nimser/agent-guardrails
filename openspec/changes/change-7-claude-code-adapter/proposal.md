# Proposal: Claude Code Adapter (Change #7)

## Intent

Create a Claude Code hook adapter that uses `block` and `suggest` behaviors to prevent secret leaks and dangerous operations. Claude Code uses shell hooks with exit code protocol for tool interception.

## Problem

Claude Code (anthropics/claude-code) needs native integration with Agent Guardrails. It supports `PreToolUse` and `PostToolUse` shell hooks that communicate via JSON on stdout and exit codes.

## Solution

Create a Claude Code hook that:
1. Implements `guard.sh` shell script for PreToolUse/PostToolUse
2. Creates `settings.json` snippet for hook configuration
3. Blocks dangerous commands with exit code 2 and JSON message
4. Suggests safer alternatives when available

## Scope

### In Scope
- `guard.sh` shell hook script
- `settings.json` snippet for hook configuration
- PreToolUse: block and suggest behaviors via exit code 2
- Import and consume rule packs (compiled into shell script)
- Clear block/suggest messages in JSON output
- Installation via CLI (`npx ag setup claude-code`)

### Out of Scope
- `redact` behavior (shell hooks cannot modify tool output)
- `run` behavior (shell hooks cannot execute replacement commands)
- `confirm` behavior (Claude Code has no native confirmation UI)
- Other adapters

## Approach

1. Create `packages/claude-code/` directory
2. Implement `guard.sh` shell hook script
3. Create `settings.json` snippet for hook configuration
4. Handle PreToolUse: exit 2 with JSON block/suggest message
5. Handle PostToolUse: exit 2 with JSON warning when secrets detected
6. Test with mock Claude Code environment

## Harness Capabilities (Verified)

Claude Code supports:
- **block**: Yes (exit 2 with JSON `decision: block`)
- **suggest**: Yes (reason in JSON `reason` field)
- **run**: No (shell hooks cannot execute replacement commands)
- **redact**: No (PostToolUse cannot modify tool output)
- **confirm**: No (no native confirmation UI)

For this change, we implement `block` and `suggest`. This is the simplest adapter.

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
  "decision": "block",
  "reason": "SOPS decrypt blocked to prevent secret leaks. Run: sops -d secrets.yaml | sed 's/:.*/: [REDACTED]/'"
}
```

Exit code: 2

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
  "decision": "block",
  "reason": "Output contained secrets. 1 secret(s) detected."
}
```

Exit code: 2

## Success Criteria

- [ ] `guard.sh` is executable and outputs valid JSON
- [ ] PreToolUse blocks .env file reads with exit code 2
- [ ] PreToolUse blocks sops -d commands with suggestion
- [ ] PreToolUse suggests safer alternatives for dangerous commands
- [ ] PostToolUse detects secrets in output with warning
- [ ] Installation via `npx ag setup claude-code` works

## Dependencies

- Depends on `change-1-project-foundation` (types, harness model)
- Depends on `change-2-secret-blocking` (rule packs)
- Depends on `change-5-command-transforms` (suggest behavior)

## Risks

- **Risk**: Shell script complexity for JSON parsing
  - **Mitigation**: Use `jq` for JSON handling, keep script simple
- **Risk**: Claude Code API changes
  - **Mitigation**: Pin adapter version, test with multiple Claude Code versions
