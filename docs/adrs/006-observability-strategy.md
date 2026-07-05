---
status: accepted
---

# ADR-006: Observability Strategy

## Context

Engine owners need to know: how many tool calls were checked? How many were blocked? Which rules fire most? Without this, Agent Guardrails is a black box. But a full observability suite isn't justified in the MVP — it needs to be lightweight, zero-dependency, and ready to evolve.

## Decision

### Tiered Approach

| Tier   | Description                                                     | Status              |
| ------ | ---------------------------------------------------------------- | ------------------- |
| Tier 1 | In-memory stats, session-end logging                             | ✅ Shipped in 0.1.0 |
| Tier 2 | Persisted `DomainEvent` log + `npx ag stats` CLI query/replay     | Deferred            |
| Tier 3 | Streaming consumers of the same persisted log (real-time)        | Deferred            |

Tier 2 persists the same `DomainEvent` trace the engine already produces via
`processMatch()` (below), rather than maintaining a separate counter structure — one
source of truth, not two. Tier 3 is an extension of that same persisted log
(streaming consumers), not an independent mechanism.

### Tier 1: In-Memory Stats (MVP)

`StatsTracker` (`src/engine/stats-tracker.ts`) accumulates counts in memory:

- Total checks, blocks, and suggests

Public API: `engine.getStats()` for snapshots, `engine.resetStats()` to zero counters (ADR-003). The engine instance owns the tracker; adapters call `engine.getStats()` at session end to log to their harness-native output.

### Domain Events

The engine produces a decision trace alongside every action via `engine.processMatch()`, which returns a `MatchResult` containing both the resolved `action` and an ordered list of `DomainEvent`s.

| Event Type             | When Emitted                                                        |
| ---------------------- | ------------------------------------------------------------------- |
| `RuleMatchedEvent`     | A rule's match condition fires against the tool call                |
| `FallbackTriggeredEvent` | The resolver walks the fallback chain (e.g., run→suggest→block)   |

`engine.evaluate()` remains the primary public API and returns only the `GuardrailAction`. Adapters that need the trace (audit, telemetry, debugging) call `engine.processMatch()` instead.

### Tier 2: Persisted `DomainEvent` Log (design, deferred)

Append the `DomainEvent[]` trace `processMatch()` already produces to a local event
log, one entry per call. `npx ag stats` becomes a query/aggregation over this log
instead of a separately-maintained counter file — one source of truth, not two.

- **Redaction at write time.** Sensitive values in `matched` fields MUST be redacted
  before persisting, mirroring the engine's own redact-before-store posture for tool
  input. The event log is a durable artifact on disk; it must not become a second
  place secrets leak to.
- **Retention: age-capped, default 30 days.** Oldest entries are dropped on write past
  the cutoff. This matches what a "why was this blocked last week" replay use case
  needs without adding a size-based rotation mechanism. Configurable, but MVP scope
  does not need an unbounded or size-capped mode.
- **Near-zero new instrumentation.** The trace already exists (Domain Events, above);
  only the write path is new.

### Tier 3: Streaming Consumers (design, deferred)

An extension of Tier 2's log, not a separate mechanism — a streaming consumer
subscribes to the same `DomainEvent` writes Tier 2 persists, for real-time
audit/telemetry use cases. Deferred until a concrete consumer is requested.

## Rationale

- **Zero overhead:** In-memory counters are ~20 lines, no I/O
- **Immediate value:** Users see "X checks, Y blocks" right away
- **Non-breaking evolution:** Exposing events later is additive, not a breaking change

## Consequences

- Stats are lost on process restart — Tier 2 needed for historical analysis
- Domain events are not exposed yet — the public API returns only actions
- Tier 2 requires file I/O infrastructure (append-only writer, age-capped retention,
  redaction-at-write reusing the same redaction logic as `redact`); a persisted,
  replayable event store is low-cost follow-on work since the trace already exists
- Tier 3 is a streaming extension of Tier 2's log, not an independent design — no
  separate event system needs to be built
