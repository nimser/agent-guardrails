# Delta for Pi Adapter — Engine Consumption (No New Engine Requirements)

> **This spec change adds no new engine requirements.** The engine
> (`matchAndResolve`, `getStats`, `resetStats`, tool-type early exit,
> engine decomposition) is fully specified in `change-1-project-foundation/specs/core/spec.md`.
>
> This file exists only to document how the Pi adapter **consumes** the
> engine's public API, and to assert the interface contract the adapter
> depends on.

## Engine Interface Contract (consumed, not defined here)

### Requirement: matchAndResolve Signature (from change-1)
The Pi adapter depends on the engine's `matchAndResolve` function.

#### Scenario: Adapter calls matchAndResolve
- WHEN the Pi adapter invokes `matchAndResolve(ctx, ALL_RULE_PACKS, PI_CAPABILITIES)`
- THEN it MUST receive `GuardrailAction | null`
- AND the engine MUST have been initialized (via `initializeMatcherRegistry()`) before this call
- AND `null` means no rules matched → tool call passes through

### Requirement: Stats API (from change-1)
The Pi adapter depends on `getStats()` and `resetStats()`.

#### Scenario: Adapter reads stats at session end
- WHEN the adapter calls `getStats()` during `session_end`
- THEN it MUST receive an object with at least: `{ matches: number, blocks: number, suggests: number }`
- AND calling `resetStats()` MUST zero all counters for the next session
