---
status: accepted
---

# ADR-003: Public API Contract

## Context

The package has two kinds of consumers: the two Tier 1 adapters in this repository, and people building their own harness who want to embed guardrails with one function call. The second door only works if the public surface is small enough to learn in minutes and stable enough to depend on. Without a defined surface, consumers import from any layer — creating coupling that makes refactoring impossible.

## Decision

### A deliberately minimal surface

The public API is three things: an engine factory, the pack loader, and the public types. Everything else is `@internal`.

```typescript
import { createEngine, loadAllRulePacks } from "agent-guardrails";

const packs = loadAllRulePacks("./packs", registry);
const engine = createEngine(packs, capabilities);

// On each event (tool call, tool result, or user prompt):
const action = engine.evaluate(ctx); // GuardrailAction | null
```

| Export             | Purpose                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `createEngine`     | `(packs, capabilities, options?) => Engine`. Owns the collaborators (predicate registry, stats) internally; accepts pre-built ones via `options` for adapters that need to share them. |
| `Engine.evaluate`  | `(ctx: ToolCallContext) => GuardrailAction \| null`. The whole integration: one call per event, covering all three phases via `ctx.phase`. |
| `Engine.processMatch` | Same evaluation, returns `MatchResult` (action + `DomainEvent[]` trace) for audit/telemetry. |
| `Engine.getStats` / `Engine.resetStats` | Session counters (ADR-006).                                              |
| `PredicateRegistry` | Register named TypeScript predicates referenced by YAML packs.                               |
| `loadYamlRulePack`, `loadAllRulePacks` | Load rule packs from disk (the only file-I/O exports).                    |
| Validation helpers | `validateRule`, `validateRulePack`, `getRuleErrors`, `getRulePackErrors` — for pack authors and tooling. |
| Public types       | `ToolCallContext`, `GuardrailAction`, `GuardrailRule`, `RulePack`, `HarnessCapabilities`, `MatchCondition`, `PredicateFunction`, `MatchResult`, `DomainEvent`, `Stats`. |

### Internal (`@internal`, not exported)

The matcher (`matchesMatcher`, command splitter), the resolver (`resolveAction`, fallback chains, interpolation), normalizer helpers, and the stats tracker class are engine plumbing. Adapters and embedders receive the final resolved action from `evaluate()`; they never re-implement matching or resolution. If a future need requires resolver extensibility (e.g. custom transform callbacks), that option threads through `createEngine`'s options — not by exporting the resolver.

Visibility is enforced mechanically: every non-public symbol carries `@internal`, and the docs build strips them, so the published API reference _is_ the contract.

### Adapter bootstrap pattern

```typescript
import { createEngine, loadAllRulePacks, PredicateRegistry } from "agent-guardrails";

const registry = new PredicateRegistry();
registry.register("my-check", (ctx) => /* ... */);

const engine = createEngine(loadAllRulePacks("./packs", registry), capabilities, { registry });

// per event:
const action = engine.evaluate(ctx);
// on session end:
const snapshot = engine.getStats();
```

## Rationale

- **One function to integrate.** A harness author evaluates the library by reading one code block. `evaluate()` is the whole runtime contract.
- **Stable contract for community adapters.** Tier 2 adapters (ADR-009) build against this surface; keeping it minimal keeps it stable, and breaking it is a semver-major event.
- **Refactoring freedom.** The matcher/resolver/normalizer internals can be restructured without breaking anyone.
- **Progressive disclosure.** Types and validators are public for pack authors; engine plumbing is hidden for everyone.

## Consequences

- Consumers import from the package root, never from internal paths.
- The barrel (`src/index.ts`) is the single source of truth for what's public — if it's not re-exported there, it's internal.
- Adding new internal modules doesn't expand the public surface unless explicitly intended.
- An API-visibility check (typedoc/API-extractor) runs in CI so `@internal` drift is caught mechanically.
