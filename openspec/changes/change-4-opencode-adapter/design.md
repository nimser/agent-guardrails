## Context

opencode is a popular AI coding assistant with a plugin system that supports `tool.execute.before` (Tool Call) and `tool.execute.after` (Tool Result) hooks. We need to integrate Agent Guardrails into this hook system via an Adapter.

## Goals / Non-Goals

**Goals:**
- Hook all tool calls (not just bash) and normalize into ToolCallContext
- Delegate matching to `@agent-guardrails/engine` via `matchAndResolve()`
- Import all Rule Packs via `ALL_RULE_PACKS` from secrets package
- Provide clear Messages (with `{matched}` interpolation from engine)
- Performance testing to ensure < 10ms overhead

**Non-Goals:**
- `suggest` Behavior (comes in change-5-command-transforms)
- `run` Behavior (deferred to later change)
- `redact` Behavior (comes in change-9-redact-output)
- Other Adapters

## Decisions

### Decision 1: Adapter-based integration for all tools

**Choice**: Use opencode's plugin system with `tool.execute.before` (Tool Call) for all tools

**Rationale**:
- Native opencode API
- Well-documented
- Can block by throwing Error
- Adapter can be distributed via npm
- Hooking all tools (not just bash) catches file-path Matcher matches from read/write tools

### Decision 2: Error throwing for blocking

**Choice**: Throw Error to block commands

**Rationale**:
- opencode API uses errors for blocking
- Error Message is shown to agent
- Consistent with opencode conventions

### Decision 3: Engine delegation and ALL_RULE_PACKS consumption

**Choice**: Import `ALL_RULE_PACKS` from `@agent-guardrails/secrets`, delegate matching to `@agent-guardrails/engine`

**Rationale**:
- Adapter is a thin shim (normalize → engine → translate)
- No inline matching logic — all lives in engine
- `ALL_RULE_PACKS` ensures all packs are loaded without Adapters curating the list
- Adding new packs requires zero Adapter changes

### Decision 5: ToolCallContext normalization

**Choice**: Adapter normalizes opencode events into `ToolCallContext` discriminated union

**Rationale**:
- Compiler enforces correct field extraction per tool type
- Engine evaluates all matcher types against whatever fields are present
- Unknown tools get catch-all variant (no fields, no matchers fire, passes through)

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

### Risk: Unknown tool types
**Mitigation**: Catch-all ToolCallContext variant. No matchers fire for unknown tools, so they pass through safely.

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
