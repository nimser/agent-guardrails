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

## Risks / Trade-offs

### Risk: False positives
**Mitigation**:
- Precise Guardrail Matchers (e.g., `.env` not `env`)
- SSH directory allows known_hosts, config, authorized_keys
- Configurable per-project (later)
- Can be overridden via Configured Action (later)

### Risk: Missing patterns
**Mitigation**:
- Start with common patterns
- Easy to add new Guardrail Matchers
- Community contributions welcome

### Risk: Scope creep
**Mitigation**:
- Defer AWS/GCP/Azure, database CLIs
- Focus on highest-value patterns first
- Can extend in future changes

### Risk: Regex-based matchers are bypassable via command composition
**Mitigation**:
- Regex is best-effort first layer (defense in depth)
- Agent can evade via redirects (`cat < .env`), string concatenation (`cat .e"nv"`), or alternative tools (`python3 -c "print(open('.env').read())"`)
- `redact` Behavior (change-10) is the backstop for anything that slips through
- Shell tokenizer planned for post-POC for more robust matching

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we support glob patterns for file matching?
2. How to handle commands with pipes?
3. Should we add `direnv` and `dotenv` support?
