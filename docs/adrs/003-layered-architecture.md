---
status: accepted
decisions: [14, 15, 19]
ref: openspec/changes/change-1-project-foundation/design.md (internal use only)
---

# ADR-003: Layered Package Architecture

## Context

The MVP must ship quickly with a clear internal architecture that scales. The tension is between "one package is easiest to contribute to" and "monolithic packages become unmaintainable." The solution is a single package with strict internal layering — decomposing the engine into focused modules from day one, rather than building a monolith and refactoring later.

## Decision

### Single Package, Layered Directories

```
src/
  core/           Types, validation. Zero runtime dependencies.
  matcher/        GuardrailMatcher evaluation (handlers + registry).
  resolver/       Action resolution, fallback chains, template interpolation.
  engine/         Orchestration — composes the above layers.
  infrastructure/ I/O boundary — YAML loading, config (depends on `yaml` package).
```

Dependency direction: `engine → resolver → matcher → core` and `engine → infrastructure → core`.
Adapters (not yet in `public/`) depend on `engine`.

### Engine Decomposition

`src/engine/engine.ts` is orchestration only (~60 lines). Responsibility is distributed:

| Module                               | Responsibility                       | Pure / Stateful         |
| ------------------------------------ | ------------------------------------ | ----------------------- |
| `core/types.ts`                      | Type definitions                     | Pure                    |
| `core/validator.ts`                  | Rule & pack validation               | Pure                    |
| `matcher/registry.ts`                | Handler lookup                       | Stateful (singleton)    |
| `matcher/command-splitter.ts`        | Shell command splitting              | Pure                    |
| `matcher/handlers/*`                 | Pattern matching logic               | Pure                    |
| `resolver/action-resolver.ts`        | Fallback chain, interpolation        | Pure                    |
| `engine/engine.ts`                   | Orchestrates match → resolve → stats | Pure                    |
| `engine/stats-tracker.ts`            | Stats accumulation                   | Stateful (encapsulated) |
| `infrastructure/yaml-pack-loader.ts` | YAML parsing, pack validation        | Stateless               |

### Concrete Infrastructure (MVP)

`infrastructure/` contains concrete implementations (no port interfaces). `ConfigLoader` and `YamlPackLoader` are imported directly by the engine. Ports will be introduced when the 3rd adapter forces dependency inversion (see ADR-005 § "Package Split Trigger").

### Package Split Trigger

Split into separate packages when:

1. **3+ adapters exist** (amortized cost of interfaces exceeds single-package benefit)
2. **Independent versioning needed** (adapters and core diverge in release cadence)
3. **Community rule pack registry required** (separate publishing lifecycle)

### Rationale

- **Contribution friction:** One clone, one `npm install`, one `npm test` — lowest barrier for new contributors
- **Test isolation:** Each module independently testable via pure functions
- **Growth path:** Adding features = adding modules, not growing a monolith
- **No over-engineering:** Ports deferred until the 3rd adapter forces them

## Consequences

- Adding a feature means creating a new module or extending an existing one — not modifying `engine.ts` directly
- The internal layering is a contract: `resolver` must not import from `infrastructure`; `core` must have no dependencies
- When the split trigger fires, the migration is straightforward: each directory maps to a package, port interfaces go in `core/`, and adapters depend on ports
- The `yaml` dependency lives in `infrastructure/` only — `core/` remains zero-dep
