## Context

Pi is a popular AI coding agent with an extension system that supports `tool_call` (Tool Call) and `tool_result` (Tool Result) hooks. We need to integrate Agent Guardrails into this hook system via an Adapter.

## Goals / Non-Goals

**Goals:**
- Hook all tool calls (not just bash) and normalize into ToolCallContext
- Delegate matching to the engine via `matchAndResolve()`
- Import all Rule Packs via `ALL_RULE_PACKS` from secrets package
- Provide clear Messages (with `{matched}` interpolation from engine)
- Performance testing to ensure < 10ms overhead

**Non-Goals:**
- `suggest` Behavior (comes in change-5-command-transforms)
- `run` Behavior (deferred to later change)
- `redact` Behavior (comes in change-10-redact-output)
- `confirm` Behavior (comes in change-11-interactive-confirmation)
- Other Adapters

## Decisions

### Decision 1: Adapter-based integration

**Choice**: Use Pi's extension system with `tool_call` hook (Tool Call) for all tools

**Rationale**:
- Native Pi API
- Well-documented
- Can block by returning `{ block: true }`
- Adapter can be distributed via npm
- Hooking all tools (not just bash) catches file-path Matcher matches from read/write tools

### Decision 2: Return object for blocking

**Choice**: Return `{ block: true, reason: "..." }` to block

**Rationale**:
- Pi API uses return objects for blocking
- The `reason` field carries the Message shown to agent
- Consistent with Pi conventions

### Decision 3: Engine delegation and ALL_RULE_PACKS consumption

**Choice**: Import `ALL_RULE_PACKS` from rule packs (`src/packs/`), delegate matching to engine (`src/engine/`)

**Rationale**:
- Adapter is a thin shim (normalize → engine → translate)
- No inline matching logic — all lives in engine
- `ALL_RULE_PACKS` ensures all packs are loaded without Adapters curating the list
- Adding new packs requires zero Adapter changes

### Decision 4: ToolCallContext normalization

**Choice**: Adapter normalizes Pi events into `ToolCallContext` discriminated union

**Rationale**:
- Compiler enforces correct field extraction per tool type
- Engine evaluates all matcher types against whatever fields are present
- Unknown tools get catch-all variant (no fields, no matchers fire, passes through)

### Decision 5: Performance benchmarking

**Choice**: Include performance test suite with configurable rule counts

**Rationale**:
- Ensure overhead < 50% and absolute time < 10ms
- Test with 0, 10, 50, 100 rules
- Measure min, max, mean, p95, p99 latencies
- Catch performance regressions early

### Decision 6: Tool-type early exit in matchAndResolve (consumed, not implemented here)

**Choice**: `matchAndResolve()` inspects the `ToolCallContext` fields before iterating rules and skips rules whose matcher type requires fields not present in the context.

**Rationale**:
- Most tool calls won't match any rule — no need to evaluate all rules for every tool call
- Tools with only `filePath` (read/write) can skip all `bash-command` rules
- Tools with only `command` (bash) can skip all `file-path` rules
- Tools with neither field (unknown tools) skip all rules entirely — instant passthrough
- This is the highest-impact, lowest-cost optimization: a few field checks before the rule loop

### Decision 7: Observability Tier 1 (session-end logging)

**Choice**: Adapter reads engine stats and logs one-line summary at session teardown via `pi.log()`

**Rationale**:
- Minimal implementation (~10 lines per adapter)
- Uses harness-native logging (Pi's `pi.log()`)
- Provides immediate value to users
- No persistence overhead (in-memory stats)
- Resets after each session

**Implementation** (see proposal.md Adapter Structure section)

Other adapters (opencode, Claude Code, Codex) will implement equivalent logging using their harness's native mechanisms (console.log, stderr, feedback hook).

### Note: Input/Output Ports (Deferred)

**Current (MVP)**: Adapters depend directly on engine implementation:
```typescript
import { matchAndResolve } from "../../../engine";
```

**Post-MVP (when adding Codex adapter)**: Introduce port interface in core:
```typescript
// src/core/ports.ts
export interface GuardrailEngine {
  evaluate(ctx: ToolCallContext): Promise<GuardrailAction | null>;
}
```

See `openspec/future-architecture-decisions.md` for full port/interface specification.

### Risk: Performance degrades with many Rules
**Mitigation**:
- Tool-type early exit skips irrelevant rules before evaluation
- Early exit on first match within relevant rules
- Regex compilation cached
- Benchmark suite catches regressions

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we hook into all tools or just bash/read/write?
2. How to handle Pi's extension configuration?
3. Should observability stats be configurable (opt-out)?
