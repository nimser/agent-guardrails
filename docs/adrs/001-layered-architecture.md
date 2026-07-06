---
status: accepted
---

# ADR-001: Layered Architecture

## Context

Guiderails needs an internal structure that's easy to understand on first glance, but ready to grow. The tension: a single package is easiest to contribute to, but packages can become unstructured monoliths. The answer is strict internal layering from day one.

## Decision

### Single Package, Layered Directories

```
src/
  core/           Types, validation. Zero runtime dependencies.
  matcher/        Rule matching (match conditions + command splitter).
  resolver/       Action resolution, fallback chains, template interpolation.
  engine/         Orchestration — composes the above layers.
  infrastructure/ I/O boundary — YAML loading, config (depends on `yaml` package).
```

Dependency direction: `engine → resolver → matcher → core` and `engine → infrastructure → core`.
Adapters depend on `engine`.

### Engine Decomposition

`engine.ts` is orchestration only. Each layer has a single responsibility:

| Module                               | Responsibility                       | Pure / Stateful         |
| ------------------------------------ | ------------------------------------ | ----------------------- |
| `core/types.ts`                      | Type definitions                     | Pure                    |
| `core/validator.ts`                  | Rule & pack validation               | Pure                    |
| `core/normalizer.ts`                 | Context validation/extraction helpers (`isKnownTool`, `extractTargets`, `isMissingRequiredFields`) | Pure |
| `core/predicate-registry.ts`         | Registry for named predicate matchers | Stateful (encapsulated) |
| `matcher/matchers.ts`                | Evaluates `MatchCondition`s via `matchesMatcher()` | Pure |
| `matcher/command-splitter.ts`        | Shell command splitting              | Pure                    |
| `resolver/action-resolver.ts`        | Fallback chain, interpolation        | Pure                    |
| `engine/engine.ts`                   | Orchestrates match → resolve behind `createEngine()` (ADR-003). Evaluation is pure; the engine instance encapsulates its collaborators (`PredicateRegistry`, `StatsTracker`). | Pure evaluation, encapsulated state |
| `engine/stats-tracker.ts`            | Stats accumulation                   | Stateful (encapsulated) |
| `infrastructure/yaml-pack-loader.ts` | YAML parsing, pack loading           | Stateless               |

### Concrete Infrastructure (No Ports Yet)

`infrastructure/` contains concrete implementations. Loaders are imported directly — no port interfaces. Ports will be introduced when the public embeddable-lib API (ADR-003) ships and embedders need to substitute their own loading — dependency inversion earns its cost then, not before.

### Package Split Trigger

Split into separate packages when:

1. **A community adapter ecosystem exists** (Tier 2 adapters, ADR-009, need a lean core to depend on)
2. **Independent versioning is needed** (adapters and core diverge in release cadence)
3. **Community rule pack registry is needed** (separate publishing lifecycle)

## Rationale

- **Lowest barrier:** One clone, one `npm install`, one `npm test`
- **Test isolation:** Each module independently testable via pure functions
- **Growth path:** Adding features = adding modules, not growing a monolith
- **No over-engineering:** Ports deferred until embedders actually need them

## Consequences

- Adding a feature means creating or extending a module — not modifying `engine.ts` directly
- The layering is a contract: `core` has no dependencies; `resolver` never imports from `infrastructure`
- `core/` remains zero-dep; the `yaml` package lives in `infrastructure/` only
- When the split trigger fires, each directory maps cleanly to a package
- Evaluation is **pure** at the call site: `engine.evaluate(ctx)` has no hidden module-level state; the engine instance owns its collaborators for the session's lifetime.
- Adapter bootstrap: `createEngine(loadAllRulePacks(path, registry), capabilities)` — see ADR-003 for the full pattern.
