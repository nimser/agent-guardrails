## Context

Agent Guardrails needs to suggest safer alternatives when dangerous commands are detected. This makes guardrails a productivity feature rather than just a restriction.

## Clarification: suggest vs run

This change implements **`suggest` behavior only**:
- **suggest**: Block original command, suggest alternative(s) to LLM. LLM decides whether to retry.
- **run**: Block original, execute alternative in hook, return output. **Deferred to a later change.**

The `suggest` behavior is universal (works in all harnesses). The `run` behavior requires shell execution in hooks (opencode/Pi only) and will be added in a future increment.

## Goals / Non-Goals

**Goals:**
- Suggest safer alternatives for env, sops, kubectl, vault, private key commands
- Implement multiple suggestions with prioritization
- Implement smart piped command detection (allow safe pipes)
- Implement format-aware SOPS redaction with --output-type support
- Implement `suggest` behavior for all harnesses

**Non-Goals:**
- `block` behavior (covered in `change-2-secret-blocking`)
- `run` behavior (deferred to later change)
- `redact` behavior (covered in `change-9-redact-output`)
- `confirm` behavior (covered in `change-10-interactive-confirmation`)
- Git transforms (covered in `change-8-git-guardrails`)

## Decisions

### Decision 1: Multiple suggestions with prioritization

**Choice**: `findSaferCommands()` returns array sorted by confidence

**Rationale**:
- Different contexts may warrant different approaches
- Full redaction vs partial view vs count-only
- LLM can choose most appropriate based on task
- Better UX than single suggestion

### Decision 2: Smart piped command detection

**Choice**: Allow commands with proper precautions (grep -o, head, wc)

**Rationale**:
- Users who already limited output shouldn't be blocked
- `grep -o '.{0,4}match.{0,4}'` shows only 4 chars around match
- `head -5` limits to first 5 lines
- `wc -l` shows only count
- Conservative: only allow known-safe patterns

### Decision 3: SOPS --output-type awareness

**Choice**: Parse --output-type flag to determine redaction format

**Rationale**:
- Default SOPS output is YAML, but user may specify JSON/ENV
- Redaction format must match actual output format
- Prevents false positives from YAML redaction on JSON output
- Simple flag parsing, no complex logic

### Decision 4: Format-aware SOPS redaction in TypeScript

**Choice**: Implement SOPS redaction in TypeScript, not shell scripts

**Rationale**:
- SOPS handles YAML, JSON, ENV, INI formats
- Shell sed/jq commands are format-specific
- TypeScript can detect format and apply appropriate redaction
- More maintainable than shell scripts

### Decision 5: Reuse existing rule packs

**Choice**: Use the same rule packs from `change-2-secret-blocking`, add kubernetes and vault packs

**Rationale**:
- Rule IDs (`sops.decrypt`, `env.read`) remain stable
- Only the action changes (block → suggest)
- Users configure action per rule via config
- No duplicate packs needed

### Decision 6: Suggest as universal behavior

**Choice**: `suggest` works in all harnesses

**Rationale**:
- Claude Code/Codex can't execute replacement commands
- `suggest` is the only option for these harnesses
- LLM sees suggestion and decides whether to retry
- Works everywhere, no capability limitations

## Risks / Trade-offs

### Risk: Suggested command doesn't accomplish same goal
**Mitigation**:
- Test each transform with real commands
- Provide clear description of what safer command does
- Multiple suggestions give fallback options

### Risk: SOPS format detection fails
**Mitigation**:
- Default to generic redaction pattern
- Test with various SOPS formats
- Parse --output-type flag explicitly

### Risk: Smart piped detection too permissive
**Mitigation**:
- Conservative defaults (only known-safe patterns)
- Warn even when allowing
- Can be tightened in config later

### Risk: Multiple suggestions overwhelm LLM
**Mitigation**:
- Sort by confidence (primary suggestion first)
- Limit to 3-4 alternatives
- Clear descriptions for each

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we support custom transforms via configuration?
2. Should we add more smart pipe patterns (awk, sed with limited scope)?
