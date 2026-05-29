# Proposal: Git Guardrails

## Intent

Implement git-specific safety Rules with configurable Behavior (block or suggest). This covers destructive git operations that can destroy local work or rewrite shared history.

## Problem

Agents can run destructive git commands like `git reset --hard`, `rm -rf`, `git push --force` without user consent. Some users want to block these outright, others want to provide **Replacements** via **Configured Action**.

## Solution

Implement git Rule Pack with:
1. Rules for destructive git operations
2. Configurable Behavior: `block` or `suggest` per Rule via Configured Action
3. **Replacements** for `git push --force` → `--force-with-lease`
4. **Replacements** for `git reset --hard` → `git stash`

## Scope

### In Scope
- `git` Rule Pack with configurable Behavior
- Rules for: `rm -rf`, `git reset --hard`, `git clean -f`, `git branch -D`, `git checkout .`, `git restore .`, `git push --force`
- **Replacements:** `--force-with-lease`, `git stash`
- Unit tests for all Rules

### Out of Scope
- Secret-related Transforms (covered in `change-5-command-transforms`)
- `redact` Behavior (covered in `change-10-redact-output`)
- `confirm` Behavior (covered in `change-11-interactive-confirmation`)

## Approach

1. Create `packages/git/` directory
2. Implement git Rule Pack
3. Implement **Safer Alternatives**
4. Export Rule Pack for Adapter consumption

## Git Rule Pack

```typescript
const gitRulePack: RulePack = {
  id: "git",
  name: "Git Guardrails",
  description: "Safety rules for git operations",
  rules: [
    {
      id: "git.rm-rf",
      title: "rm -rf",
      description: "Block rm -rf commands",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\brm\s+(-rf?\|--recursive)\b/ },
      defaultAction: { type: "block", message: "rm -rf destroys files irreversibly." }
    },
    {
      id: "git.reset-hard",
      title: "git reset --hard",
      description: "Block or suggest alternative for git reset --hard",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\bgit\s+reset\s+--hard\b/ },
      defaultAction: { type: "suggest", replacement: "git stash", message: "git reset --hard discards uncommitted work. Use git stash instead." }
    },
    {
      id: "git.force-push",
      title: "git push --force",
      description: "Block or suggest --force-with-lease",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\bgit\s+push\b.*--force\b/ },
      defaultAction: { type: "suggest", replacement: "git push --force-with-lease", message: "Use --force-with-lease to avoid overwriting others' work." }
    }
  ]
};
```

## Key Design Decisions

### Decision 1: Configurable Behavior per Rule

**Choice**: Users can configure `block` or `suggest` per git Rule via Configured Action

**Rationale**:
- Some users want to block `git push --force` outright
- Others want to suggest `--force-with-lease` and let LLM decide
- Configuration allows both use cases
- Default is `suggest` for most Rules, `block` for destructive ones

### Decision 2: Keep git separate from command Transforms

**Choice**: Git guardrails as separate change from command Transforms

**Rationale**:
- Git Rules are conceptually different from secret-related Transforms
- Git Rules have different configuration needs (block vs suggest)
- Users may want git Rules without secret Transforms
- Clear separation of concerns

### Decision 3: **Safer Alternatives** as suggestions

**Choice**: Provide **Safer Alternatives** as suggestions, not Replacements

**Rationale**:
- Git operations are context-dependent
- `git stash` may not always be the right alternative
- LLM can decide based on context
- User can override via Configured Action if needed

## Success Criteria

- [ ] Git Rule Pack blocks destructive operations
- [ ] Git Rule Pack suggests **Safer Alternatives**
- [ ] Users can configure block vs suggest per Rule via Configured Action
- [ ] All Rules have unit tests
- [ ] Rule Pack exports cleanly for Adapter consumption

## Dependencies

- Depends on `change-1-project-foundation` (types)

## Risks

- **Risk**: **Safer Alternatives** don't accomplish same goal
  - **Mitigation**: Test each alternative with real git operations
- **Risk**: False positives
  - **Mitigation**: Precise Guardrail Matchers, configurable per-project
