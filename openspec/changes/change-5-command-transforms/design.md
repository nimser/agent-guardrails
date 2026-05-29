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
- `redact` Behavior (covered in `change-10-redact-output`)
- `confirm` Behavior (covered in `change-11-interactive-confirmation`)
- Git Transforms (covered in `change-9-git-guardrails`)
- Smart Piped Command Detection (deferred to post-MVP with shell tokenizer)
- Multiple suggestions / confidence scoring (deferred to post-MVP with intent analysis)

## Decisions

### Decision 1: Single safer command

**Choice**: `findSaferCommand()` returns one safer command string or null

**Rationale**:
- MVP scope: each rule has one known best alternative
- Engine picks deterministically — no Harness-side selection needed
- `run` Behavior (future) also needs engine to pick
- Multiple suggestions with intent-based scoring deferred to post-MVP

### Decision 2: Smart Piped Command Detection deferred

**Choice**: Drop Smart Piped Detection from MVP entirely

**Rationale**:
- Current regex-based approach is inherently bypassable (`head -50` vs `head -5`, `grep -o '.*'`)
- Needs shell tokenizer for proper analysis (post-MVP dependency)
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

### Decision 4: Shell-based format-aware redaction for MVP

**Choice**: Suggest shell sed/jq pipelines based on detected format

**Rationale**:
- Works in all Harnesses (including Claude Code/Codex which lack `run`)
- Format detection (extension + flags) selects the right shell pipeline
- TypeScript format-aware redaction deferred to `run` Behavior change

### Decision 5: Reuse existing YAML Rule Packs, add new YAML packs

**Choice**: Update the existing YAML rule packs from `change-2-secret-blocking` (change `defaultAction` from `block` to `suggest`), and add new YAML packs for kubernetes, gh-cli, direnv.

**Rationale**:
- Rule IDs (`sops.decrypt`, `env.read`) remain stable
- Only the Action changes in the YAML (block → suggest)
- kubernetes, gh-cli, direnv are high-frequency tools in dev workflows
- vault dropped from MVP (enterprise-focused, smallest audience, moved to future-secret-packs.md backlog)
- All packs remain in YAML format per Change 1 Decision 16

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

### Decision 8: Placement in the decomposed resolver layer

**Choice**: `findSaferCommand()` and `detectSopsFormat()` live in the `src/resolver/` directory, not as standalone root modules.

**Rationale**:
- Consistent with Change 1 Decision 19 (Engine Decomposition): the resolver layer owns action resolution logic
- `findSaferCommand()` is a helper to `resolveAction()` — when action type is `suggest`, resolver calls `findSaferCommand` to look up the replacement
- Keeps the dependency direction clean: `engine/ → resolver/ → core/`
- `safer-commands.ts` and `sops-format.ts` are pure functions with the same testability characteristics as `action-resolver.ts`
- Exported from resolver layer index, so `engine.ts` imports them via the resolver layer

**File structure after this change:**
```
src/resolver/
  action-resolver.ts     # Pure function: resolveAction() — already from Change 1
  fallback-chain.ts      # Fallback logic (part of action-resolver)
  safer-commands.ts      # Pure function: findSaferCommand()
  sops-format.ts         # Pure function: detectSopsFormat()
```

**Resolver layer after this change:**
```typescript
// src/resolver/action-resolver.ts
import { findSaferCommand } from './safer-commands';

export function resolveAction(action, caps, ctx?) {
  // ... existing fallback chain logic ...
  if (action.type === 'suggest') {
    const saferCmd = findSaferCommand(ctx?.command);
    if (saferCmd === null) {
      // suggest → block fallback
      return { type: 'block', message: `Blocked: \`${ctx?.matched}\` — no safer alternative available.` };
    }
    return { ...action, replacement: saferCmd };
  }
  // ...
}
```

### Decision 9: Rule packs in YAML, resolver logic in TypeScript

**Choice**: All rule pack definitions (both existing and new) remain as `.yaml` files in `src/packs/`. Only the resolver logic (`findSaferCommand`, `detectSopsFormat`, `sopsFormatPipeline`) is written in TypeScript under `src/resolver/`.

**Rationale**:
- Consistent with Change 1 Decision 16 (YAML built-in packs)
- Rule pack data (matchers, actions, messages) is declarative — perfect for YAML
- Resolver logic (format detection, command transformation) is imperative — belongs in TypeScript
- Pure TypeScript resolver functions are independently testable without YAML loading
- The `findSaferCommand` function is called by `resolveAction` at runtime, not baked into YAML

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
- For MVP, shell pipelines are good enough for the `suggest` use case
- Agent decides whether to execute the suggestion

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we support custom transforms via configuration?
2. Should we add more smart pipe patterns (awk, sed with limited scope)?
