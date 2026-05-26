# Proposal: Redact Output

## Intent

Implement `redact` Behavior for PostToolUse (Tool Result) Output sanitization. This is Defense in Depth that catches secrets that slip through PreToolUse (Tool Call) hooks.

## Problem

Even with PreToolUse hooks blocking dangerous commands, agents can still encounter secrets through:
- Unusual commands that don't match known Guardrail Matchers
- Already-decrypted files in the working tree
- Custom scripts that decrypt secrets
- Tool Output that contains secrets from other sources

## Solution

Implement PostToolUse (Tool Result) redaction that:
1. Scans Tool Output for secret patterns
2. Replaces secrets with descriptive redaction markers
3. Returns sanitized content to the agent

## Harness Capabilities

| Behavior | Claude Code | Codex | opencode | Pi |
|----------|:-----------:|:-----:|:--------:|:--:|
| **redact** | ❌ | ❌ | ✅ | ✅ |

**Critical limitation**: Only opencode and Pi can modify Tool Output. Claude Code and Codex can only add system messages, not replace Tool Output.

For Claude Code/Codex, the hook can warn that secrets were found, but can't prevent them from reaching the LLM. This is why `redact` is Defense in Depth, not the primary defense.

## Scope

### In Scope
- Secret matching in Tool Output (reuse Guardrail Matchers from `change-2-secret-blocking`)
- Redaction with descriptive markers (`[REDACTED: GitHub Token]`)
- PostToolUse hook (Tool Result) in opencode Adapter
- PostToolUse hook (Tool Result) in Pi Adapter
- Unit tests for redaction logic

### Out of Scope
- PreToolUse blocking (covered in `change-2-secret-blocking`)
- Command Transforms (covered in `change-5-command-transforms`)
- Confirmation Behavior (covered in `change-10-interactive-confirmation`)
- Claude Code/Codex Adapters (can't redact Output)

## Approach

1. Create `packages/redact/` directory
2. Implement secret detection for tool output
3. Implement redaction with descriptive markers
4. Update opencode Adapter with PostToolUse hook (Tool Result)
5. Update Pi Adapter with tool_result hook (Tool Result)

## Key Design Decisions

### Decision 1: Descriptive redaction markers

**Choice**: Use `[REDACTED: {rule_title}]` format

**Rationale**:
- Agent knows what type of secret was removed
- Helps agent understand context without seeing value
- Consistent format for all secret types
- Easy to parse if needed

### Decision 2: Only risky commands

**Choice**: Only scan Output from commands that matched pre-hook Rules

**Rationale**:
- Scanning all Output is expensive (10-50ms per 100KB)
- Most commands don't produce secrets
- Focus scanning on known risky commands
- Balance between safety and performance

### Decision 3: opencode/Pi only

**Choice**: Only implement redact for opencode and Pi

**Rationale**:
- Claude Code/Codex can't modify Tool Output
- They can only add system messages
- Redact is Defense in Depth, not primary defense
- Focus resources on Harnesses that can actually redact

## Success Criteria

- [ ] Redaction detects secrets in tool output
- [ ] Redaction replaces secrets with descriptive markers
- [ ] PostToolUse hook works in opencode
- [ ] PostToolUse hook works in Pi
- [ ] Performance: < 50ms for typical output

## Dependencies

- Depends on `change-1-project-foundation` (types)
- Depends on `change-2-secret-blocking` (detection patterns)
- Depends on `change-3-opencode-adapter` (opencode Adapter)
- Depends on `change-4-pi-adapter` (Pi Adapter)

## Risks

- **Risk**: Redaction misses secrets
  - **Mitigation**: Defense in Depth, primary defense is blocking
- **Risk**: Performance overhead
  - **Mitigation**: Only scan risky command Output
