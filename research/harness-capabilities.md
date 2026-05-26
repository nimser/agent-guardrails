# Harness Capabilities Research

Date: 2026-05-24

## Summary

Verified hook capabilities for four AI coding assistants by examining source code.

## Claude Code (`anthropics/claude-code`)

**Hook system**: PreToolUse, PostToolUse via `hooks.json` config

**Input**: JSON via stdin with `tool_name`, `tool_input`, `tool_result`

**Blocking**: Exit code 2 + stderr shown to Claude

**Can execute replacement commands?** No. Hook stdout is parsed as JSON response. Can't pipe replacement output to Claude.

**Can modify tool output?** No. PostToolUse can only add `systemMessage` via JSON stdout. Doesn't replace actual tool result.

**Source**: `plugins/hookify/core/rule_engine.py` returns:
```python
{
    "hookSpecificOutput": {
        "hookEventName": hook_event,
        "permissionDecision": "deny"
    },
    "systemMessage": combined_message
}
```

## Codex (`openai/codex`)

**Hook system**: `preToolUse`, `permissionRequest`, `postToolUse` + many others

**Blocking**: `ReviewDecision` = `"approved"` | `"denied"` | `"abort"` | `"timed_out"`

**Can execute replacement commands?** No. Approval response only has approve/deny decisions.

**Can modify tool output?** No. `HookOutputEntry` has kinds `warning`, `stop`, `feedback`, `context`, `error` - can provide feedback but not replace tool output.

**Has native confirm?** Yes. `ExecCommandApprovalParams` triggers approval prompt. User can approve, deny, approve-for-session, or set policy.

**Source**: `codex-rs/app-server-protocol/schema/json/ExecCommandApprovalResponse.json`

## opencode (`anomalyco/opencode`)

**Hook system**: `tool.execute.before`, `tool.execute.after`

**Blocking**: `tool.execute.before` throws Error

**Can execute replacement commands?** Yes! Plugin receives `$` (Bun shell API). Can execute commands and return output.

**Can modify tool output?** Yes! `tool.execute.after` receives `output` and can mutate `output.result`.

**Source**: `packages/opencode/src/session/tools.ts` shows:
```typescript
yield* plugin.trigger(
    "tool.execute.before",
    { tool: item.id, sessionID: ctx.sessionID, callID: ctx.callID },
    { args },
)
const result = yield* item.execute(args, ctx)
// ... then plugin.trigger("tool.execute.after", ...)
```

Plugin docs show: `output.args.command = escape(output.args.command)` - direct mutation.

## Pi (`earendil-works/pi`)

**Hook system**: `tool_call` (pre), `tool_result` (post)

**Blocking**: `tool_call` returns `{ block: true, reason: "..." }`

**Can execute replacement commands?** Yes! Extension has `pi.exec()` for shell execution.

**Can modify tool output?** Yes! `tool_result` can return `{ content?, details?, isError? }` to override.

**Has native confirm?** Yes! `ctx.ui.confirm("title", "message")` shows TUI dialog.

**Source**: `pi/packages/coding-agent/docs/extensions.md`

## Capability Matrix

| Capability | Claude Code | Codex | opencode | Pi |
|------------|:-----------:|:-----:|:--------:|:--:|
| **block** | ✅ | ✅ | ✅ | ✅ |
| **suggest** (message to LLM) | ✅ | ✅ | ✅ | ✅ |
| **run-replacement** (execute safer cmd) | ❌ | ❌ | ✅ | ✅ |
| **redact-output** (modify tool result) | ❌ | ❌ | ✅ | ✅ |
| **confirm** (native UI) | ❌ | ✅ | ❌ | ✅ |

## Implications

1. **`run-replacement`** only works in opencode and Pi (they have shell execution in hooks)
2. **`redact-output`** only works in opencode and Pi (they can mutate tool output)
3. **`suggest`** works everywhere - it's the universal fallback
4. **`confirm`** only works natively in Pi and Codex
5. For Claude Code and Codex: PostToolUse can add system messages but NOT replace tool output
6. For Claude Code and Codex: The only defense is block + suggest (pre-hook)
7. For opencode and Pi: Full defense-in-depth with block + run + redact + confirm
