## Context

Agent Guardrails needs to block secret leaks in the first vertical slice. This change implements deterministic matching Rules with `block` Behavior across multiple attack vectors.

## Goals / Non-Goals

**Goals:**
- Block .env file reads (file-path AND bash commands)
- Block SOPS decrypt commands
- Block private key file reads (including SSH directory)
- Block encryption tool decrypt commands (age, gpg, openssl)
- Block secret manager retrieval commands (op, gopass, pass, bw)
- Export Rule Packs for Adapter consumption

**Non-Goals:**
- `suggest` Behavior (comes in change-5-command-transforms)
- `run` Behavior (deferred to later change)
- `redact` Behavior (comes in change-10-redact-output)
- Platform Adapters (come in change-3/4)
- AWS/GCP/Azure CLI secret commands (deferred - more complex)
- Database CLI password detection (deferred - hard to match reliably)

## Decisions

### Decision 1: Separate Rule Packs per concern

**Choice**: `env`, `sops`, `private-key`, `encryption-tools`, `secret-managers` as separate Rule Packs

**Rationale**:
- Users can enable/disable packs independently
- Clear separation of concerns
- Easy to add new packs later
- Consistent with Rule Pack model

### Decision 2: Regex-based matching

**Choice**: Use regex patterns in Guardrail Matchers for all matching

**Rationale**:
- Deterministic - no false negatives for known patterns
- Fast - regex matching is O(n)
- Testable - each Guardrail Matcher can be tested independently
- No external dependencies

### Decision 3: Block-only for first slice

**Choice**: Only implement `block` Behavior

**Rationale**:
- Simplest Behavior to implement
- Proves hook path works in opencode/Pi
- `suggest`/`run`/`redact` come in later changes
- Can be enhanced incrementally

### Decision 4: Dual Matchers for env files

**Choice**: Both file-path AND bash-command Matchers for .env files

**Rationale**:
- File-path catches read Tool usage
- Bash-command catches cat, bat, head, tail, less, more, type
- LLM can use either path to access secrets
- Defense in Depth

### Decision 5: SSH directory heuristic with predicate matcher

**Choice**: Block any non-pub file in ~/.ssh/ except known_hosts, config, authorized_keys. Use `predicate` matcher (not regex).

**Rationale**:
- Covers all SSH key types including future ones
- Allows legitimate SSH config files
- Predicate matcher is readable and testable, avoids regex lookahead gymnastics
- Allowlist is explicit: `known_hosts`, `config`, `authorized_keys`, `*.pub`, `*.pubkey`
- No false positives for standard SSH usage

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
- Layer 1 (substring): engine-level optimization, no rule pack changes needed
- Layer 2 (regex): existing rule packs handle this
- Layer 3 (wrappers): new `hardening` rule pack detects adversarial patterns
- Aligns with `docs/matching-strategy.md` specification

**Alternative considered**: Single-layer regex only
- Rejected: Regex alone is bypassable via eval, bash -c, redirects
- Layer 3 catches adversarial wrapping that regex structure matching misses

**Implementation**:
- Multi-line splitting (Layer 1) in `src/matcher/multi-line.ts` (Change 1 task 5.x)
- Regex rules (Layer 2) in existing rule packs (this change)
- Hardening rules (Layer 3) in new `hardening` pack (this change)

### Decision 8: Risk escalation for hardening rules

**Choice**: Hardening rules force-block and cannot be overridden by user configuration

**Rationale**:
- Adversarial patterns (eval, bash -c) are inherently suspicious in coding agent context
- "Guilty until proven innocent" principle from matching strategy
- Force-block prevents users from accidentally disabling critical security layer
- Post-MVP: could add escape hatch for legitimate use cases based on issue reports

**Implementation**:
- Engine marks hardening pack rules as non-overridable
- `agent-guardrails.json` configuration cannot change hardening rule actions
- Documented in `docs/yaml-rule-packs.md` as special case

## Risks / Trade-offs

### Risk: False positives
**Mitigation**:
- Precise Guardrail Matchers (e.g., `.env` not `env`)
- SSH directory allows known_hosts, config, authorized_keys
- Configurable per-project (later)
- Can be overridden via Configured Action (later)

### Risk: Layer 3 hardening rules cause false positives
**Mitigation**:
- eval/bash-c are rare in legitimate coding agent workflows
- Force-block is acceptable default; post-MVP could add escape hatch
- Document known false positive scenarios in troubleshooting guide

### Risk: Missing patterns
**Mitigation**:
- Start with common patterns
- Easy to add new Guardrail Matchers
- Community contributions welcome via YAML rule packs

### Risk: Scope creep
**Mitigation**:
- Defer AWS/GCP/Azure, database CLIs
- Focus on highest-value patterns first
- Can extend in future changes

### Risk: Regex-based matchers are bypassable via command composition
**Mitigation**:
- Multi-layer strategy catches most bypass attempts:
  - Layer 1 (multi-line split): catches `cmd1; cmd2` composition
  - Layer 3 (hardening): catches eval, bash -c, redirects, subshells
- `redact` Behavior (change-10) is the backstop for anything that slips through
- Shell tokenizer (post-MVP) will provide structural analysis for remaining bypass vectors

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we support glob patterns for file matching?
2. How to handle commands with pipes?
3. Should we add `direnv` and `dotenv` support?
