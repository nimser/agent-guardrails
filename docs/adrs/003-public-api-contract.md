---
status: accepted
---

# ADR-003: Public API Contract

## Context

Agent Guardrails ships as a single package with layered internals (`core/`, `matcher/`, `resolver/`, `engine/`, `infrastructure/`). Without a defined public surface, consumers will import from any layer — creating coupling that makes refactoring impossible. The API contract defines what's public, what's internal, and why.

## Decision

### The Engine Is the Entry Point

All rule evaluation goes through `matchAndResolve()`. Adapters never call the resolver, command splitter, or matcher registry directly. This keeps the internal wiring free to change without breaking consumers.

```typescript
import { initGuardrails, matchAndResolve, getStats, resetStats } from "agent-guardrails";
```

### Public Exports

| Export                      | Layer          | Purpose                                             |
| --------------------------- | -------------- | --------------------------------------------------- |
| `initGuardrails`            | engine         | Bootstrap: registers built-in matchers, returns `PredicateRegistry` |
| `matchAndResolve`           | engine         | Evaluate a tool call against rule packs (action only) |
| `processMatch`              | engine         | Evaluate a tool call — returns action + domain event trace |
| `getStats` / `resetStats`   | engine         | Session-level intervention counters                 |
| `StatsTracker`              | engine         | Class for adapters that need their own instance     |
| `loadYamlRulePack`          | infrastructure | Load a single YAML rule pack from disk              |
| `loadAllRulePacks`          | infrastructure | Load all packs from a directory                     |
| `PredicateRegistry`         | core           | Register predicate matchers referenced by YAML packs|
| `validateRule`              | core           | Check if a value is a valid GuardrailRule           |
| `validateRulePack`          | core           | Check if a value is a valid RulePack                |
| `getRuleErrors`             | core           | Descriptive validation errors for a rule            |
| `getRulePackErrors`         | core           | Descriptive errors for a rule pack                  |
| All types                   | core           | `ToolCallContext`, `GuardrailAction`, `RulePack`, `DomainEvent`, `MatchResult`, etc. |

### Internal (Not Exported)

| Module                     | Why internal                                                      |
| -------------------------- | ----------------------------------------------------------------- |
| `MatcherRegistry`          | Adapters use `initGuardrails()` — never construct or configure directly |
| `matcherRegistry`          | Singleton managed by `initGuardrails()`                           |
| `initializeMatcherRegistry` | Wrapped by `initGuardrails()` — no reason to call separately     |
| `MatcherHandler`           | Implementation detail of the registry                             |
| `splitCommands`            | Engine-internal preprocessing — adapters never need raw splitting |
| `resolveAction`            | Engine-internal resolution — adapters get the final action from `matchAndResolve` |
| `ResolveContext`           | Paired with `resolveAction` — both stay internal                  |

### Why `resolveAction` Is Internal

The resolver handles fallback chains, capability checks, and template interpolation. These are engine concerns. If a future change needs resolver extensibility (e.g., custom transform callbacks), that option threads through `matchAndResolve` — not by exposing the resolver directly.

### Why `splitCommands` Is Internal

Command splitting is a preprocessing step the engine applies before matching. Adapters receive the final resolved action; they don't need to split commands themselves. If an adapter needs to reason about sub-commands, that's a signal the engine should expose richer match metadata — not that the splitter should be public.

### Adapter Bootstrap Pattern

```typescript
import {
  initGuardrails,
  matchAndResolve,
  loadAllRulePacks,
  getStats,
  resetStats,
} from "agent-guardrails";

// 1. Bootstrap — registers built-in matchers, returns predicate registry
const predicates = initGuardrails();

// 2. Register adapter-specific predicates (if any)
predicates.register("my-check", (ctx) => /* ... */);

// 3. Load rule packs
const packs = loadAllRulePacks("./path/to/packs", predicates);

// 4. On each tool call
const action = matchAndResolve(ctx, packs, capabilities);
// — or, for audit/telemetry, use processMatch() to get the event trace:
// const { action, events } = processMatch(ctx, packs, capabilities);

// 5. On session end
const stats = getStats();
resetStats();
```

## Rationale

- **Stable contract:** Consumers depend on a small, intentional surface — not on internal file paths
- **Refactoring freedom:** Internal modules can be restructured without breaking adapters
- **Facade over raw internals:** `initGuardrails()` replaces direct registry manipulation — one call, one return value
- **Progressive disclosure:** Types and validators are public for pack authors; engine plumbing is hidden for adapter authors

## Consequences

- Adapters import from the package root, never from internal paths
- Adding new internal modules doesn't expand the public surface unless explicitly intended
- `resolveAction` extensibility (e.g., transform callbacks) is added to `matchAndResolve`'s signature, not by exporting the resolver
- The barrel (`src/index.ts`) is the single source of truth for what's public — if it's not re-exported there, it's internal
