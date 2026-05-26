## Context

Agent Guardrails needs a configuration system to allow users to customize guardrails behavior per-project and globally. This enables different teams to have different risk tolerances.

## Goals / Non-Goals

**Goals:**
- Read config from project and global locations
- Merge with proper precedence (project > global > defaults)
- Support custom rules
- Validate configuration
- Generate default config

**Non-Goals:**
- Core guardrails logic (covered in Changes 1-5)
- Platform adapters (covered in Changes 6-9)
- CLI commands (covered in Change 10)

## Decisions

### Decision 1: JSON configuration format

**Choice**: Use JSON for configuration files

**Rationale**:
- Widely supported
- Easy to read and write
- TypeScript native support
- No additional dependencies

**Alternatives considered**:
- YAML: More complex, requires parser
- TOML: Less common
- JavaScript: Security concerns

### Decision 2: Three-level precedence

**Choice**: Project > Global > Built-in defaults

**Rationale**:
- Project config overrides global (team settings)
- Global config overrides defaults (user preferences)
- Built-in defaults are always available
- Consistent with other tools (eslint, prettier)

### Decision 3: Rule action types

**Choice**: Four action types: block, suggest, warn, off

**Rationale**:
- `block`: Hard block, no alternative
- `suggest`: Block + suggest safer alternative
- `warn`: Allow but warn (PostToolUse redaction still applies)
- `off`: Rule disabled
- Covers all use cases

### Decision 4: Custom rules via array

**Choice**: Support custom rules via `customRules` array

**Rationale**:
- Users may have internal secret patterns
- Easy to add custom patterns
- Merged with built-in rules
- Consistent with rule structure

### Decision 5: JSON schema validation

**Choice**: Validate config files against JSON schema

**Rationale**:
- Catch errors early
- Clear error messages
- Document expected structure
- Can be used for IDE autocomplete

## Risks / Trade-offs

### Risk: Config complexity
**Mitigation**:
- Start simple, extend as needed
- Good documentation
- Sensible defaults

### Risk: Invalid configs
**Mitigation**:
- Clear error messages
- Validation at load time
- Fallback to defaults

### Risk: Config file conflicts
**Mitigation**:
- Clear precedence rules
- Document merging behavior
- Test with edge cases

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we support YAML config files?
2. How to handle config file watching?
3. Should we support config inheritance?
