# Proposal: Interactive Confirmation

## Intent

Implement `confirm` Behavior for native user confirmation in Pi and Codex. For Claude Code and opencode, fall back to `suggest` Behavior via Fallback.

## Problem

Some operations are risky but valid. Users want to approve them before execution rather than blocking outright or letting the LLM decide. This is the `confirm` Behavior.

## Solution

Implement confirmation that:
1. Uses native `ctx.ui.confirm()` in Pi
2. Uses native approval prompt in Codex
3. Falls back to `suggest` in Claude Code and opencode via Fallback

## Harness Capabilities

| Behavior | Claude Code | Codex | opencode | Pi |
|----------|:-----------:|:-----:|:--------:|:--:|
| **confirm** | ❌ Fallback to suggest | ✅ native | ❌ Fallback to suggest | ✅ native |

## Scope

### In Scope
- Pi native confirmation via `ctx.ui.confirm()`
- Codex native approval prompt
- Fallback to suggest for Claude Code/opencode
- Integration tests for confirmation flow

### Out of Scope
- PreToolUse blocking (covered in `change-2-secret-blocking`)
- Command Transforms (covered in `change-5-command-transforms`)
- Redaction (covered in `change-10-redact-output`)

## Approach

1. Implement confirm Behavior in Pi Adapter
2. Implement confirm Behavior in Codex Adapter
3. Implement fallback to suggest for Claude Code/opencode
4. Add integration tests

## Key Design Decisions

### Decision 1: Fallback to suggest

**Choice**: Claude Code/opencode fall back to `suggest` when `confirm` is requested via Fallback

**Rationale**:
- These Harnesses have no native confirmation UI
- `suggest` is the closest Behavior (LLM sees Message and decides)
- User can still approve by having LLM retry

### Decision 2: Separate change

**Choice**: Confirmation as separate change from blocking/Transforms

**Rationale**:
- Confirmation is UX enhancement, not core safety
- Can be added after MVP is proven
- Different Harnesses have different Capabilities

## Success Criteria

- [ ] Pi shows native confirmation dialog
- [ ] Codex shows native approval prompt
- [ ] Claude Code/opencode fall back to suggest
- [ ] Integration tests pass

## Dependencies

- Depends on `change-1-project-foundation` (types)
- Depends on `change-3-opencode-adapter` (opencode Adapter)
- Depends on `change-4-pi-adapter` (Pi Adapter)

## Risks

- **Risk**: Fallback Behavior is confusing
  - **Mitigation**: Clear Messages explaining the Fallback
