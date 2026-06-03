---
status: accepted
decisions: [13, 17]
ref: openspec/changes/change-1-project-foundation/design.md (internal use only)
---

# ADR-005: Observability Strategy
**Related:** `openspec/could-have-features.md` § Observability Tier 2

## Context

Engine owners need to know: how many tool calls were checked? How many were blocked? Which rules fire most often? Without this, Agent Guardrails is a black box. But we can't build a full observability suite in the MVP — it needs to be lightweight, zero-dependency, and ready to evolve.

## Decision

### Tier 1: In-Memory Stats (MVP)

`StatsTracker` (`src/engine/stats-tracker.ts`) accumulates counts in memory:
- Total checks
- Blocks, suggests, runs per behavior
- Optional: per-rule match counts

Public API:
- `getStats(): Stats` — snapshot
- `resetStats(): void` — zero counters

Adapters call `getStats()` at session end and log to the harness-native output.

### Domain Events (Internal)

The engine produces domain events internally (`RuleMatchedEvent`, `FallbackTriggeredEvent`) but discards them in the public API (`matchAndResolve` returns only the `GuardrailAction`). Events are consumed internally for future observability.

### Post-MVP: Tier 2 & Beyond

Deferred features documented in `openspec/could-have-features.md` and `openspec/future-architecture-decisions.md`:

| Tier | Description | Status |
|------|-------------|--------|
| Tier 1 | In-memory stats, session-end logging | ✅ Shipped in 0.1.0 |
| Tier 2 | Persistent daily JSON stats + `npx ag stats` CLI | Deferred |
| Tier 3 | Real-time event stream for audit/telemetry | Deferred |

### Package Split Trigger

When introducing Tier 2 or exposing domain events externally, add `core/ports.ts` with a `StatsWriter` interface. This coincides with the 3rd adapter (Clean Architecture ports — see ADR-003).

### Rationale

- **Zero overhead:** In-memory counters are ~20 lines, no I/O
- **Immediate value:** Users see "X checks, Y blocks" right away
- **Migration path:** `processMatch()` already returns `{ action, events }` — exposing events is a non-breaking API addition
- **Deferred cost:** Tier 2 requires file I/O infrastructure; Tier 3 requires an event system. Neither justifies the complexity in 0.1.0.

## Consequences

- Stats are lost on process restart — Tier 2 is needed for historical analysis
- `getStats()` is global state — thread-safe in Node but not across processes
- Domain events are not exposed yet — the `matchAndResolve` API returns only the action
- Tier 2/3 implementation will require a non-breaking API change (new function, not modifying existing)