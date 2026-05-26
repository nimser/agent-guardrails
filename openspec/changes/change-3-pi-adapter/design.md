## Context

Pi is a popular AI coding agent with an extension system that supports `tool_call` and `tool_result` hooks. We need to integrate Agent Guardrails into this hook system.

## Goals / Non-Goals

**Goals:**
- Block dangerous commands in tool_call hook
- Import and use rule packs from secrets package
- Provide clear reason messages
- Performance testing to ensure < 10ms overhead

**Non-Goals:**
- `suggest` behavior (comes in change-5-command-transforms)
- `run` behavior (deferred to later change)
- `redact` behavior (comes in change-9-redact-output)
- `confirm` behavior (comes in change-10-interactive-confirmation)
- Other adapters

## Decisions

### Decision 1: Extension-based integration

**Choice**: Use Pi's extension system with `tool_call` hook

**Rationale**:
- Native Pi API
- Well-documented
- Can block by returning `{ block: true }`
- Extension can be distributed via npm

### Decision 2: Return object for blocking

**Choice**: Return `{ block: true, reason: "..." }` to block

**Rationale**:
- Pi API uses return objects for blocking
- Reason message is shown to agent
- Consistent with Pi conventions

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

### Risk: Pi API changes
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
2. How to handle Pi's extension configuration?
