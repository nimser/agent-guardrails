## Context

opencode is a popular AI coding assistant with a plugin system that supports `tool.execute.before` (Tool Call) and `tool.execute.after` (Tool Result) hooks. We need to integrate Agent Guardrails into this hook system via an Adapter.

## Goals / Non-Goals

**Goals:**
- Block dangerous commands in Tool Call hook
- Import and use Rule Packs from secrets package
- Provide clear Messages
- Performance testing to ensure < 10ms overhead

**Non-Goals:**
- `suggest` Behavior (comes in change-5-command-transforms)
- `run` Behavior (deferred to later change)
- `redact` Behavior (comes in change-9-redact-output)
- Other Adapters

## Decisions

### Decision 1: Adapter-based integration

**Choice**: Use opencode's plugin system with `tool.execute.before` (Tool Call)

**Rationale**:
- Native opencode API
- Well-documented
- Can block by throwing Error
- Adapter can be distributed via npm

### Decision 2: Error throwing for blocking

**Choice**: Throw Error to block commands

**Rationale**:
- opencode API uses errors for blocking
- Error Message is shown to agent
- Consistent with opencode conventions

### Decision 3: Rule Pack consumption

**Choice**: Import Rule Packs from `@agent-guardrails/secrets`

**Rationale**:
- Reusable across Adapters
- Easy to test
- Easy to add new packs
- Consistent with Rule Pack model

### Decision 4: Performance benchmarking

**Choice**: Include performance test suite with configurable rule counts

**Rationale**:
- Ensure overhead < 50% and absolute time < 10ms
- Test with 0, 10, 50, 100 rules
- Measure min, max, mean, p95, p99 latencies
- Catch performance regressions early

## Risks / Trade-offs

### Risk: opencode API changes
**Mitigation**: Pin Adapter version, test with multiple versions

### Risk: False blocking
**Mitigation**: Precise Guardrail Matchers, test with edge cases

### Risk: Performance degrades with many Rules
**Mitigation**:
- Early exit on first match
- Regex compilation cached
- Benchmark suite catches regressions

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we hook into all tools or just bash/read/write?
2. How to handle opencode's plugin configuration?
