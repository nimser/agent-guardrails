# Proposal: Interactive Confirmation

## Intent

Implement `confirm` behavior for native user confirmation in Pi and Codex. For Claude Code and opencode, fall back to `suggest` behavior.

## Problem

Some operations are risky but valid. Users want to approve them before execution rather than blocking outright or letting the LLM decide.

## Solution

Implement confirmation that:
1. Uses native `ctx.ui.confirm()` in Pi
2. Uses native approval prompt in Codex
3. Falls back to `suggest` in Claude Code and opencode

## Harness Capabilities

| Behavior | Claude Code | Codex | opencode | Pi |
|----------|:-----------:|:-----:|:--------:|:--:|
| **confirm** | ❌ fallback to suggest | ✅ native | ❌ fallback to suggest | ✅ native |

## Scope

### In Scope
- Pi native confirmation via `ctx.ui.confirm()`
- Codex native approval prompt
- Fallback to suggest for Claude Code/opencode
- Integration tests for confirmation flow

### Out of Scope
- PreToolUse blocking (covered in `change-2-secret-blocking`)
- Command transforms (covered in `change-5-command-transforms`)
- Redaction (covered in `change-9-redact-output`)

## Approach

1. Implement confirm behavior in Pi adapter
2. Implement confirm behavior in Codex adapter
3. Implement fallback to suggest for Claude Code/opencode
4. Add integration tests

## Key Design Decisions

### Decision 1: Fallback to suggest

**Choice**: Claude Code/opencode fall back to `suggest` when `confirm` is requested

**Rationale**:
- These harnesses have no native confirmation UI
- `suggest` is the closest behavior (LLM sees message and decides)
- User can still approve by having LLM retry

### Decision 2: Separate change

**Choice**: Confirmation as separate change from blocking/transforms

**Rationale**:
- Confirmation is UX enhancement, not core safety
- Can be added after POC is proven
- Different harnesses have different capabilities

## Success Criteria

- [ ] Pi shows native confirmation dialog
- [ ] Codex shows native approval prompt
- [ ] Claude Code/opencode fall back to suggest
- [ ] Integration tests pass

## Dependencies

- Depends on `change-1-project-foundation` (types)
- Depends on `change-3-opencode-adapter` (opencode adapter)
- Depends on `change-4-pi-adapter` (Pi adapter)

## Risks

- **Risk**: Fallback behavior is confusing
  - **Mitigation**: Clear messages explaining the fallback
