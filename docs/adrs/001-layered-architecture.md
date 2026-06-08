---
status: accepted
---

# ADR-001: Layered Architecture

## Context

Agent Guardrails needs an internal structure that's easy to understand on first glance, but ready to grow. The tension: a single package is easiest to contribute to, but packages can become unstructured monoliths. The answer is strict internal layering from day one.

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

`engine.ts` is orchestration only (~60 lines). Each layer has a single responsibility:

| Module                               | Responsibility                       | Pure / Stateful         |
| ------------------------------------ | ------------------------------------ | ----------------------- |
| `core/types.ts`                      | Type definitions                     | Pure                    |
| `core/validator.ts`                  | Rule & pack validation               | Pure                    |
| `matcher/matchers.ts`                | Evaluates `MatchCondition`s via `matchesMatcher()` | Pure |
| `matcher/command-splitter.ts`        | Shell command splitting              | Pure                    |
| `resolver/action-resolver.ts`        | Fallback chain, interpolation        | Pure                    |
| `engine/engine.ts`                   | Orchestrates match → resolve → stats | Pure                    |
| `engine/stats-tracker.ts`            | Stats accumulation                   | Stateful (encapsulated) |
| `infrastructure/yaml-pack-loader.ts` | YAML parsing, pack loading           | Stateless               |

### Concrete Infrastructure (No Ports Yet)

`infrastructure/` contains concrete implementations. Loaders are imported directly — no port interfaces. Ports will be introduced when the 3rd adapter forces dependency inversion (see § Package Split Trigger).

### Package Split Trigger

Split into separate packages when:

1. **3+ adapters exist** (the cost of interfaces is amortized)
2. **Independent versioning is needed** (adapters and core diverge in release cadence)
3. **Community rule pack registry is needed** (separate publishing lifecycle)

## Rationale

- **Lowest barrier:** One clone, one `npm install`, one `npm test`
- **Test isolation:** Each module independently testable via pure functions
- **Growth path:** Adding features = adding modules, not growing a monolith
- **No over-engineering:** Ports deferred until the 3rd adapter forces them

## Consequences

- Adding a feature means creating or extending a module — not modifying `engine.ts` directly
- The layering is a contract: `core` has no dependencies; `resolver` never imports from `infrastructure`
- `core/` remains zero-dep; the `yaml` package lives in `infrastructure/` only
- When the split trigger fires, each directory maps cleanly to a package
