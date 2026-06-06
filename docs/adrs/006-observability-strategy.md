---
status: accepted
---

# ADR-006: Observability Strategy

## Context

Engine owners need to know: how many tool calls were checked? How many were blocked? Which rules fire most? Without this, Agent Guardrails is a black box. But a full observability suite isn't justified in the MVP — it needs to be lightweight, zero-dependency, and ready to evolve.

## Decision

### Tiered Approach

| Tier   | Description                                      | Status              |
| ------ | ------------------------------------------------ | ------------------- |
| Tier 1 | In-memory stats, session-end logging             | ✅ Shipped in 0.1.0 |
| Tier 2 | Persistent daily JSON stats + `npx ag stats` CLI | Deferred            |
| Tier 3 | Real-time event stream for audit/telemetry       | Deferred            |

### Tier 1: In-Memory Stats (MVP)

`StatsTracker` (`src/engine/stats-tracker.ts`) accumulates counts in memory:

- Total checks, blocks, and suggests

Public API: `getStats()` for snapshots, `resetStats()` to zero counters. Adapters call `getStats()` at session end and log to their harness-native output.

### Domain Events (Planned)

Domain events (`RuleMatchedEvent`, `FallbackTriggeredEvent`) are planned but not yet implemented. When added, the engine will produce them internally — `matchAndResolve()` will continue to return only the `GuardrailAction` in its public signature. Events will serve as groundwork for Tier 2/3 observability.

## Rationale

- **Zero overhead:** In-memory counters are ~20 lines, no I/O
- **Immediate value:** Users see "X checks, Y blocks" right away
- **Non-breaking evolution:** Exposing events later is additive, not a breaking change

## Consequences

- Stats are lost on process restart — Tier 2 needed for historical analysis
- Domain events are not exposed yet — the public API returns only actions
- Tier 2 requires file I/O infrastructure; Tier 3 requires an event system
