# Proposal: Redact Output

## Intent

Implement `redact` behavior for PostToolUse output sanitization. This is defense-in-depth that catches secrets that slip through PreToolUse hooks.

## Problem

Even with PreToolUse hooks blocking dangerous commands, agents can still encounter secrets through:
- Unusual commands that don't match known patterns
- Already-decrypted files in the working tree
- Custom scripts that decrypt secrets
- Tool output that contains secrets from other sources

## Solution

Implement PostToolUse redaction that:
1. Scans tool output for secret patterns
2. Replaces secrets with descriptive redaction markers
3. Returns sanitized content to the agent

## Harness Capabilities

| Behavior | Claude Code | Codex | opencode | Pi |
|----------|:-----------:|:-----:|:--------:|:--:|
| **redact** | ❌ | ❌ | ✅ | ✅ |

**Critical limitation**: Only opencode and Pi can modify tool output. Claude Code and Codex can only add system messages, not replace tool output.

For Claude Code/Codex, the hook can warn that secrets were found, but can't prevent them from reaching the LLM. This is why `redact` is defense-in-depth, not the primary defense.

## Scope

### In Scope
- Secret detection in tool output (reuse patterns from `change-2-secret-blocking`)
- Redaction with descriptive markers (`[REDACTED: GitHub Token]`)
- PostToolUse hook in opencode adapter
- PostToolUse hook in Pi adapter
- Unit tests for redaction logic

### Out of Scope
- PreToolUse blocking (covered in `change-2-secret-blocking`)
- Command transforms (covered in `change-5-command-transforms`)
- Confirmation behavior (covered in `change-10-interactive-confirmation`)
- Claude Code/Codex adapters (can't redact output)

## Approach

1. Create `packages/redact/` directory
2. Implement secret detection for tool output
3. Implement redaction with descriptive markers
4. Update opencode adapter with PostToolUse hook
5. Update Pi adapter with tool_result hook

## Key Design Decisions

### Decision 1: Descriptive redaction markers

**Choice**: Use `[REDACTED: {rule_title}]` format

**Rationale**:
- Agent knows what type of secret was removed
- Helps agent understand context without seeing value
- Consistent format for all secret types
- Easy to parse if needed

### Decision 2: Only risky commands

**Choice**: Only scan output from commands that matched pre-hook rules

**Rationale**:
- Scanning all output is expensive (10-50ms per 100KB)
- Most commands don't produce secrets
- Focus scanning on known risky commands
- Balance between safety and performance

### Decision 3: opencode/Pi only

**Choice**: Only implement redact for opencode and Pi

**Rationale**:
- Claude Code/Codex can't modify tool output
- They can only add system messages
- Redact is defense-in-depth, not primary defense
- Focus resources on harnesses that can actually redact

## Success Criteria

- [ ] Redaction detects secrets in tool output
- [ ] Redaction replaces secrets with descriptive markers
- [ ] PostToolUse hook works in opencode
- [ ] PostToolUse hook works in Pi
- [ ] Performance: < 50ms for typical output

## Dependencies

- Depends on `change-1-project-foundation` (types)
- Depends on `change-2-secret-blocking` (detection patterns)
- Depends on `change-3-opencode-adapter` (opencode hook)
- Depends on `change-4-pi-adapter` (Pi hook)

## Risks

- **Risk**: Redaction misses secrets
  - **Mitigation**: Defense-in-depth, primary defense is blocking
- **Risk**: Performance overhead
  - **Mitigation**: Only scan risky command output
