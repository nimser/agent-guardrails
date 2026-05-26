## Context

Pi is a popular AI coding agent with an extension system that supports `tool_call` (Tool Call) and `tool_result` (Tool Result) hooks. We need to integrate Agent Guardrails into this hook system via an Adapter.

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
- `confirm` Behavior (comes in change-10-interactive-confirmation)
- Other Adapters

## Decisions

### Decision 1: Adapter-based integration

**Choice**: Use Pi's extension system with `tool_call` hook (Tool Call)

**Rationale**:
- Native Pi API
- Well-documented
- Can block by returning `{ block: true }`
- Adapter can be distributed via npm

### Decision 2: Return object for blocking

**Choice**: Return `{ block: true, reason: "..." }` to block

**Rationale**:
- Pi API uses return objects for blocking
- The `reason` field carries the Message shown to agent
- Consistent with Pi conventions

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

### Risk: Pi API changes
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
2. How to handle Pi's extension configuration?
