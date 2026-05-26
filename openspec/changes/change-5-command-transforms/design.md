## Context

Agent Guardrails needs to suggest safer alternatives when dangerous commands are detected. This makes guardrails a productivity feature rather than just a restriction.

## Clarification: suggest vs run

This change implements **`suggest` Behavior only**:
- **suggest**: Block original command, suggest alternative(s) to LLM. LLM decides whether to retry.
- **run**: Block original, execute alternative in hook, return output. **Deferred to a later change.**

The `suggest` Behavior is universal (works in all Harnesses). The `run` Behavior requires shell execution in hooks (opencode/Pi only) and will be added in a future increment.

## Goals / Non-Goals

**Goals:**
- Suggest safer alternatives for env, sops, kubectl, vault, private key commands
- Implement multiple Safer Commands with prioritization
- Implement Smart Piped Command Detection (allow safe pipes)
- Implement Format-aware Redaction for SOPS with --output-type support
- Implement `suggest` Behavior for all Harnesses

**Non-Goals:**
- `block` Behavior (covered in `change-2-secret-blocking`)
- `run` Behavior (deferred to later change)
- `redact` Behavior (covered in `change-9-redact-output`)
- `confirm` Behavior (covered in `change-10-interactive-confirmation`)
- Git Transforms (covered in `change-8-git-guardrails`)

## Decisions

### Decision 1: Multiple suggestions with prioritization

**Choice**: `findSaferCommands()` returns array of Safer Commands sorted by Confidence

**Rationale**:
- Different contexts may warrant different approaches
- Full redaction vs partial view vs count-only
- LLM can choose most appropriate based on task
- Better UX than single suggestion

### Decision 2: Smart Piped Command Detection

**Choice**: Allow commands with proper precautions (grep -o, head, wc)

**Rationale**:
- Users who already limited output shouldn't be blocked
- `grep -o '.{0,4}match.{0,4}'` shows only 4 chars around match
- `head -5` limits to first 5 lines
- `wc -l` shows only count
- Conservative: only allow known-safe patterns

### Decision 3: SOPS --output-type awareness

**Choice**: Parse --output-type flag to determine Format-aware Redaction format

**Rationale**:
- Default SOPS output is YAML, but user may specify JSON/ENV
- Redaction format must match actual output format
- Prevents false positives from YAML redaction on JSON output
- Simple flag parsing, no complex logic

### Decision 4: Format-aware Redaction in TypeScript

**Choice**: Implement SOPS Format-aware Redaction in TypeScript, not shell scripts

**Rationale**:
- SOPS handles YAML, JSON, ENV, INI formats
- Shell sed/jq commands are format-specific
- TypeScript can detect format and apply appropriate redaction
- More maintainable than shell scripts

### Decision 5: Reuse existing Rule Packs

**Choice**: Use the same Rule Packs from `change-2-secret-blocking`, add kubernetes and vault packs

**Rationale**:
- Rule IDs (`sops.decrypt`, `env.read`) remain stable
- Only the Action changes (block → suggest)
- Users configure Action per Rule via Configured Action
- No duplicate packs needed

### Decision 6: Suggest as universal Behavior

**Choice**: `suggest` works in all Harnesses

**Rationale**:
- Claude Code/Codex can't execute Replacement commands
- `suggest` is the only option for these Harnesses
- LLM sees suggestion and decides whether to retry
- Works everywhere, no Capability limitations

## Risks / Trade-offs

### Risk: Suggested command doesn't accomplish same goal
**Mitigation**:
- Test each Transform with real commands
- Provide clear description of what Safer Command does
- Multiple suggestions give fallback options

### Risk: SOPS format detection fails
**Mitigation**:
- Default to generic redaction pattern
- Test with various SOPS formats
- Parse --output-type flag explicitly

### Risk: Smart Piped Command Detection too permissive
**Mitigation**:
- Conservative defaults (only known-safe patterns)
- Warn even when allowing
- Can be tightened in config later

### Risk: Multiple suggestions overwhelm LLM
**Mitigation**:
- Sort by Confidence (primary suggestion first)
- Limit to 3-4 alternatives
- Clear descriptions for each

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we support custom transforms via configuration?
2. Should we add more smart pipe patterns (awk, sed with limited scope)?
