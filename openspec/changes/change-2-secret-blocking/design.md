## Context

Agent Guardrails needs to block secret leaks in the first vertical slice. This change implements deterministic detection rules with `block` behavior across multiple attack vectors.

## Goals / Non-Goals

**Goals:**
- Block .env file reads (file-path AND bash commands)
- Block SOPS decrypt commands
- Block private key file reads (including SSH directory)
- Block encryption tool decrypt commands (age, gpg, openssl)
- Block secret manager retrieval commands (op, gopass, pass, bw)
- Export rule packs for adapter consumption

**Non-Goals:**
- `suggest` behavior (comes in change-5-command-transforms)
- `run` behavior (deferred to later change)
- `redact` behavior (comes in change-9-redact-output)
- Platform adapters (come in change-3/4)
- AWS/GCP/Azure CLI secret commands (deferred - more complex)
- Database CLI password detection (deferred - hard to detect)

## Decisions

### Decision 1: Separate rule packs per concern

**Choice**: `env`, `sops`, `private-key`, `encryption-tools`, `secret-managers` as separate packs

**Rationale**:
- Users can enable/disable packs independently
- Clear separation of concerns
- Easy to add new packs later
- Matches extension model

### Decision 2: Regex-based detection

**Choice**: Use regex patterns for all detection

**Rationale**:
- Deterministic - no false negatives for known patterns
- Fast - regex matching is O(n)
- Testable - each pattern can be tested independently
- No external dependencies

### Decision 3: Block-only for first slice

**Choice**: Only implement `block` behavior

**Rationale**:
- Simplest behavior to implement
- Proves hook path works in opencode/Pi
- `suggest`/`run`/`redact` come in later changes
- Can be enhanced incrementally

### Decision 4: Dual matchers for env files

**Choice**: Both file-path AND bash-command matchers for .env files

**Rationale**:
- File-path catches read tool usage
- Bash-command catches cat, bat, head, tail, less, more, type
- LLM can use either path to access secrets
- Defense in depth

### Decision 5: SSH directory heuristic

**Choice**: Block any non-pub file in ~/.ssh/ except known_hosts, config, authorized_keys

**Rationale**:
- Covers all SSH key types including future ones
- Allows legitimate SSH config files
- Simple heuristic that's easy to understand
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
- Precise patterns (e.g., `.env` not `env`)
- SSH directory allows known_hosts, config, authorized_keys
- Configurable per-project (later)
- Can be overridden in config (later)

### Risk: Missing patterns
**Mitigation**:
- Start with common patterns
- Easy to add new patterns
- Community contributions welcome

### Risk: Scope creep
**Mitigation**:
- Defer AWS/GCP/Azure, database CLIs
- Focus on highest-value patterns first
- Can extend in future changes

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we support glob patterns for file matching?
2. How to handle commands with pipes?
3. Should we add `direnv` and `dotenv` support?
