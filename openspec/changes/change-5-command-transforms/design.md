## Context

Agent Guardrails needs to suggest safer alternatives when dangerous commands are detected. This makes guardrails a productivity feature rather than just a restriction.

## Clarification: suggest vs run

This change implements **`suggest` Behavior only**:
- **suggest**: Block original command, suggest single alternative to LLM. LLM decides whether to retry.
- **run**: Block original, execute alternative in hook, return output. **Deferred to a later change.**

The `suggest` Behavior is universal (works in all Harnesses). The `run` Behavior requires shell execution in hooks (opencode/Pi only) and will be added in a future increment.

## Goals / Non-Goals

**Goals:**
- Suggest safer alternatives for env, sops, kubectl, gh-cli, direnv, private key commands
- Implement `findSaferCommand()` returning single safer command or null
- Implement Format-aware SOPS Redaction via shell pipelines (extension + --output-type/--input-type)
- Implement suggest → block fallback when no safer command found
- Implement `suggest` Behavior for all Harnesses

**Non-Goals:**
- `block` Behavior (covered in `change-2-secret-blocking`)
- `run` Behavior (deferred to later change)
- `redact` Behavior (covered in `change-9-redact-output`)
- `confirm` Behavior (covered in `change-10-interactive-confirmation`)
- Git Transforms (covered in `change-8-git-guardrails`)
- Smart Piped Command Detection (deferred to post-POC with shell tokenizer)
- Multiple suggestions / confidence scoring (deferred to post-POC with intent analysis)

## Decisions

### Decision 1: Single safer command

**Choice**: `findSaferCommand()` returns one safer command string or null

**Rationale**:
- POC scope: each rule has one known best alternative
- Engine picks deterministically — no Harness-side selection needed
- `run` Behavior (future) also needs engine to pick
- Multiple suggestions with intent-based scoring deferred to post-POC

### Decision 2: Smart Piped Command Detection deferred

**Choice**: Drop Smart Piped Detection from POC entirely

**Rationale**:
- Current regex-based approach is inherently bypassable (`head -50` vs `head -5`, `grep -o '.*'`)
- Needs shell tokenizer for proper analysis (post-POC dependency)
- Future design: `allowedSafePipeCommands` list + semantic similarity matching via tokenizer
- Requires its own spec change with proper design discussion

### Decision 3: SOPS format detection with --output-type and --input-type

**Choice**: Parse both `--output-type` and `--input-type` flags, fall back to file extension

**Rationale**:
- `--output-type` is explicit and highest confidence
- `--input-type` provides format info when output-type absent
- File extension is the common case
- If none available → `findSaferCommand()` returns null → falls back to block
- No guessing — secure by default

### Decision 4: Shell-based format-aware redaction for POC

**Choice**: Suggest shell sed/jq pipelines based on detected format

**Rationale**:
- Works in all Harnesses (including Claude Code/Codex which lack `run`)
- Format detection (extension + flags) selects the right shell pipeline
- TypeScript format-aware redaction deferred to `run` Behavior change

### Decision 5: Reuse existing Rule Packs, add kubernetes, gh-cli, direnv

**Choice**: Use the same Rule Packs from `change-2-secret-blocking`, add kubernetes, gh-cli, direnv packs

**Rationale**:
- Rule IDs (`sops.decrypt`, `env.read`) remain stable
- Only the Action changes (block → suggest)
- kubernetes, gh-cli, direnv are high-frequency tools in dev workflows
- vault dropped from POC (enterprise-focused, smallest audience, moved to future-secret-packs.md backlog)

### Decision 6: Suggest as universal Behavior

**Choice**: `suggest` works in all Harnesses

**Rationale**:
- Claude Code/Codex can't execute Replacement commands
- `suggest` is the only option for these Harnesses
- LLM sees suggestion and decides whether to retry
- Works everywhere, no Capability limitations

### Decision 7: Suggest → block fallback

**Choice**: When `findSaferCommand()` returns null, engine falls back to block with generic contextual message

**Rationale**:
- Natural extension of Action Fallback Chain from change-1
- Secure by default: if we can't suggest something safe, we block
- Generic message includes `{matched}` so agent knows what was caught
- No guessing or partial suggestions

## Risks / Trade-offs

### Risk: Suggested command doesn't accomplish same goal
**Mitigation**:
- Test each Transform with real commands
- Provide clear description of what Safer Command does

### Risk: SOPS format detection fails (no extension, stdin)
**Mitigation**:
- Fall back to block via Action Fallback Chain — no guessing
- Secure by default

### Risk: Shell-based redaction is imperfect
**Mitigation**:
- TypeScript format-aware redaction comes with `run` Behavior
- For POC, shell pipelines are good enough for the `suggest` use case
- Agent decides whether to execute the suggestion

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we support custom transforms via configuration?
2. Should we add more smart pipe patterns (awk, sed with limited scope)?
