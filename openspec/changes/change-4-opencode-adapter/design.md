## Context

opencode is a popular AI coding assistant with a plugin system that supports `tool.execute.before` and `tool.execute.after` hooks. We need to integrate Agent Guardrails into this hook system.

## Goals / Non-Goals

**Goals:**
- Block dangerous commands in PreToolUse
- Import and use rule packs from secrets package
- Provide clear error messages
- Performance testing to ensure < 10ms overhead

**Non-Goals:**
- `suggest` behavior (comes in change-5-command-transforms)
- `run` behavior (deferred to later change)
- `redact` behavior (comes in change-9-redact-output)
- Other adapters

## Decisions

### Decision 1: Plugin-based integration

**Choice**: Use opencode's plugin system with `tool.execute.before`

**Rationale**:
- Native opencode API
- Well-documented
- Can block by throwing Error
- Plugin can be distributed via npm

### Decision 2: Error throwing for blocking

**Choice**: Throw Error to block commands

**Rationale**:
- opencode API uses errors for blocking
- Error message is shown to agent
- Consistent with opencode conventions

### Decision 3: Rule pack consumption

**Choice**: Import rule packs from `@agent-guardrails/secrets`

**Rationale**:
- Reusable across adapters
- Easy to test
- Easy to add new packs
- Consistent with rule pack model

### Decision 4: Performance benchmarking

**Choice**: Include performance test suite with configurable rule counts

**Rationale**:
- Ensure overhead < 50% and absolute time < 10ms
- Test with 0, 10, 50, 100 rules
- Measure min, max, mean, p95, p99 latencies
- Catch performance regressions early

## Risks / Trade-offs

### Risk: opencode API changes
**Mitigation**: Pin adapter version, test with multiple versions

### Risk: False blocking
**Mitigation**: Precise patterns, test with edge cases

### Risk: Performance degrades with many rules
**Mitigation**:
- Early exit on first match
- Regex compilation cached
- Benchmark suite catches regressions

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we hook into all tools or just bash/read/write?
2. How to handle opencode's plugin configuration?
