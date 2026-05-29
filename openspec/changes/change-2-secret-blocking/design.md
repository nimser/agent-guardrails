# Design: Secret Blocking

## Context

Agent Guardrails needs to block secret leaks in the first vertical slice. This change implements deterministic matching Rules with `block` Behavior across multiple attack vectors.

## Goals / Non-Goals

**Goals:**
- Block .env file reads (file-path AND bash commands)
- Block SOPS decrypt commands
- Block private key file reads (including SSH directory via predicate)
- Block encryption tool decrypt commands (age, gpg, openssl)
- Block secret manager retrieval commands (op, gopass, pass, bw)
- Define all rules as YAML files (per Design Decision 16)
- Handle predicate matchers via PredicateRegistry (for SSH directory heuristic)

## Decisions

### Decision 1: Separate Rule Packs per concern

**Choice**: `env`, `sops`, `private-key`, `encryption-tools`, `secret-managers` as separate Rule Packs

**Rationale**:
- Users can enable/disable packs independently
- Clear separation of concerns
- Easy to add new packs later
- Consistent with Rule Pack model

### Decision 2: Regex-based matching

**Choice**: Use regex patterns in Guardrail Matchers for all matching (except SSH directory predicate)

**Rationale**:
- Deterministic - no false negatives for known patterns
- Fast - regex matching is O(n)
- Testable - each Guardrail Matcher can be tested independently
- Fully expressible in YAML format
- No external dependencies

### Decision 3: Block-only for first slice

**Choice**: Only implement `block` Behavior

**Rationale**:
- Simplest Behavior to implement
- Proves hook path works in opencode/Pi
- `suggest`/`run`/`redact` come in later changes
- Can be enhanced incrementally

### Decision 4: Dual Matchers for env files

**Choice**: Both file-path AND bash-command Matchers for .env files (as separate rules)

**Rationale**:
- File-path catches read Tool usage
- Bash-command catches cat, bat, head, tail, less, more, type
- LLM can use either path to access secrets
- Defense in Depth
- Each rule is independently testable

### Decision 5: SSH directory heuristic with predicate matcher

**Choice**: Block any non-pub file in ~/.ssh/ except known_hosts, config, authorized_keys. Use `predicate` matcher (not regex).

**Rationale**:
- Covers all SSH key types including future ones
- Allows legitimate SSH config files
- Predicate matcher is readable and testable
- Allowlist is explicit: `known_hosts`, `config`, `authorized_keys`, `*.pub`, `*.pubkey`
- No false positives for standard SSH usage

**Implementation (YAML + TypeScript augmentation):**
```yaml
# private-key.yaml
rules:
  - id: private-key.read-ssh-dir
    title: SSH directory private key
    description: Block non-public files in ~/.ssh/
    phase: before-tool
    match:
      type: predicate
      predicateName: ssh-private-key
    defaultAction:
      type: block
      message: "Blocked: `{matched}` — SSH private key file may contain secrets."
```

```typescript
// src/packs/predicates.ts
export function registerBuiltInPredicates(registry: PredicateRegistry): void {
  registry.register('ssh-private-key', (ctx) => {
    if (!ctx.filePath || !/\.ssh\//.test(ctx.filePath)) return false;
    const filename = ctx.filePath.split('/').pop()!;
    const allowlist = new Set(['known_hosts', 'config', 'authorized_keys']);
    if (allowlist.has(filename)) return false;
    if (/\.(pub|pubkey)$/.test(filename)) return false;
    return true;
  });
  // ... other predicates
}
```

### Decision 6: Scope deferral

**Choice**: Defer AWS/GCP/Azure CLI, database CLIs

**Rationale**:
- More complex patterns (multiple subcommands, flags)
- Lower frequency than env/sops/keys
- Can be added in future changes without breaking changes
- Keeps initial scope manageable

### Decision 7: Multi-layer matching strategy

**Choice**: Implement three-layer matching (substring + regex + wrapper detection)

**Rationale**:
- Layer 1 (command splitting): already implemented in Change 1 (`src/matcher/command-splitter.ts`), reused here
- Layer 2 (regex): existing rule packs handle this
- Layer 3 (wrappers): new `hardening` rule pack detects adversarial patterns
- Aligns with `docs/matching-strategy.md` specification

**Implementation**:
- Command splitting (Layer 1) in `src/matcher/command-splitter.ts` (Change 1, reused)
- Regex rules (Layer 2) in rule pack YAML files (this change)
- Hardening rules (Layer 3) in `src/packs/hardening.yaml` (this change)

### Decision 8: Risk escalation for hardening rules

**Choice**: Hardening rules force-block and cannot be overridden by user configuration

**Rationale**:
- Adversarial patterns (eval, bash -c) are inherently suspicious in coding agent context
- "Guilty until proven innocent" principle from matching strategy
- Force-block prevents users from accidentally disabling critical security layer
- Post-MVP: could add escape hatch for legitimate use cases

**Implementation**:
- Pack metadata includes `nonOverridable: true`
- Engine checks this flag and prevents config overrides
- Documented in `docs/yaml-rule-packs.md`

## Risks / Trade-offs

### Risk: False positives
**Mitigation**:
- Precise Guardrail Matchers (e.g., `.env` not `env`)
- SSH directory allows known_hosts, config, authorized_keys
- Configurable per-project (change-13)

### Risk: Layer 3 hardening rules cause false positives
**Mitigation**:
- eval/bash-c are rare in legitimate coding agent workflows
- Force-block is acceptable default
- Document known false positive scenarios in troubleshooting guide

### Risk: Missing patterns
**Mitigation**:
- Start with common patterns
- Easy to add new Guardrail Matchers via YAML
- Community contributions welcome

### Risk: Regex-based matchers are bypassable via command composition
**Mitigation**:
- Multi-layer strategy catches most bypass attempts
- `redact` Behavior (change-10) is the backstop
- Shell tokenizer (post-MVP) provides structural analysis

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we support glob patterns for file matching?
2. How to handle commands with pipes?
