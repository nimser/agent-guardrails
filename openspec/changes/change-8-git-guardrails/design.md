## Context

Agent Guardrails needs git-specific safety rules to prevent destructive git operations. These rules are separate from secret-related transforms.

## Goals / Non-Goals

**Goals:**
- Block destructive git operations
- Suggest safer alternatives
- Allow safe git commands
- Export Rule Pack for Adapter consumption

**Non-Goals:**
- Secret-related transforms (covered in `change-5-command-transforms`)
- `redact` Behavior (covered in `change-9-redact-output`)
- `confirm` Behavior (covered in `change-10-interactive-confirmation`)

## Decisions

### Decision 1: Separate git Rule Pack

**Choice**: Git rules as separate pack from command transforms

**Rationale**:
- Git rules are conceptually different
- Different configuration needs (block vs suggest)
- Users may want git rules without secret transforms

### Decision 2: Configurable Behavior

**Choice**: Users can configure block vs suggest per rule

**Rationale**:
- Some users want hard blocks
- Others want suggestions with alternatives
- Configuration allows both use cases

### Decision 3: Safe command allowance

**Choice**: Explicitly allow safe git commands

**Rationale**:
- `git push` (without --force) is safe
- `git reset` (without --hard) only moves HEAD
- `git checkout <branch>` is safe

## Risks / Trade-offs

### Risk: False positives
**Mitigation**: Precise patterns, configurable per-project

### Risk: Safe alternatives don't work
**Mitigation**: Test each alternative with real git operations

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we support custom git rules via configuration?
2. How to handle commands with multiple dangerous patterns?
