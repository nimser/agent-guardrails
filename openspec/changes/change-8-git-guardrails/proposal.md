# Proposal: Git Guardrails

## Intent

Implement git-specific safety rules with configurable behavior (block or suggest). This covers destructive git operations that can destroy local work or rewrite shared history.

## Problem

Agents can run destructive git commands like `git reset --hard`, `rm -rf`, `git push --force` without user consent. Some users want to block these outright, others want to suggest safer alternatives.

## Solution

Implement git rule pack with:
1. Rules for destructive git operations
2. Configurable behavior: `block` or `suggest` per rule
3. Safer alternatives for `git push --force` → `--force-with-lease`
4. Safer alternatives for `git reset --hard` → `git stash`

## Scope

### In Scope
- `git` rule pack with configurable behavior
- Rules for: `rm -rf`, `git reset --hard`, `git clean -f`, `git branch -D`, `git checkout .`, `git restore .`, `git push --force`
- Safer alternatives: `--force-with-lease`, `git stash`
- Unit tests for all rules

### Out of Scope
- Secret-related transforms (covered in `change-5-command-transforms`)
- `redact` behavior (covered in `change-9-redact-output`)
- `confirm` behavior (covered in `change-10-interactive-confirmation`)

## Approach

1. Create `packages/git/` directory
2. Implement git rule pack
3. Implement safer alternatives
4. Export rule pack for adapter consumption

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

### Decision 1: Configurable behavior per rule

**Choice**: Users can configure `block` or `suggest` per git rule

**Rationale**:
- Some users want to block `git push --force` outright
- Others want to suggest `--force-with-lease` and let LLM decide
- Configuration allows both use cases
- Default is `suggest` for most rules, `block` for destructive ones

### Decision 2: Keep git separate from command transforms

**Choice**: Git guardrails as separate change from command transforms

**Rationale**:
- Git rules are conceptually different from secret-related transforms
- Git rules have different configuration needs (block vs suggest)
- Users may want git rules without secret transforms
- Clear separation of concerns

### Decision 3: Safer alternatives as suggestions

**Choice**: Provide safer alternatives as suggestions, not replacements

**Rationale**:
- Git operations are context-dependent
- `git stash` may not always be the right alternative
- LLM can decide based on context
- User can override if needed

## Success Criteria

- [ ] Git rule pack blocks destructive operations
- [ ] Git rule pack suggests safer alternatives
- [ ] Users can configure block vs suggest per rule
- [ ] All rules have unit tests
- [ ] Rule pack exports cleanly for adapter consumption

## Dependencies

- Depends on `change-1-project-foundation` (types)

## Risks

- **Risk**: Safer alternatives don't accomplish same goal
  - **Mitigation**: Test each alternative with real git operations
- **Risk**: False positives
  - **Mitigation**: Precise patterns, configurable per-project
