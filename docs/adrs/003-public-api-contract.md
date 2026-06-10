---
status: accepted
---

# ADR-003: Public API Contract

## Context

Agent Guardrails ships as a single package with layered internals (`core/`, `matcher/`, `resolver/`, `engine/`, `infrastructure/`). Without a defined public surface, consumers will import from any layer — creating coupling that makes refactoring impossible. The API contract defines what's public, what's internal, and why.

## Decision

### The Engine Is the Entry Point

All rule evaluation goes through `matchAndResolve()`. Adapters never call the resolver, command splitter, or matcher function directly. This keeps the internal wiring free to change without breaking consumers.

```typescript
import { matchAndResolve, processMatch, PredicateRegistry, StatsTracker } from "agent-guardrails";
```

### Public Exports

| Export                      | Layer          | Purpose                                             |
| --------------------------- | -------------- | --------------------------------------------------- |
| `matchAndResolve`           | engine         | Evaluate a tool call against rule packs (action only). Signature: `(ctx, packs, capabilities, registry, stats) => GuardrailAction \| null` |
| `processMatch`              | engine         | Evaluate a tool call — returns action + domain event trace. Same signature; returns `MatchResult`. |
| `StatsTracker`              | engine         | Class for accumulating intervention counters. Callers own the instance and pass it to `matchAndResolve`. |
| `Stats`                     | engine         | Shape of a stats snapshot: `{ checks, blocks, suggests }` |
| `PredicateRegistry`         | core           | Register predicate matchers referenced by YAML packs. Callers own the instance and pass it to `matchAndResolve` and `loadAllRulePacks`. |
| `validateRule`              | core           | Check if a value is a valid GuardrailRule           |
| `validateRulePack`          | core           | Check if a value is a valid RulePack                |
| `getRuleErrors`             | core           | Descriptive validation errors for a rule            |
| `getRulePackErrors`         | core           | Descriptive errors for a rule pack                  |
| `matchesMatcher`            | matcher        | Evaluate a `MatchCondition` against a `ToolCallContext` |
| `MAX_MATCH_INPUT_LENGTH`    | matcher        | Input length cap at which regex matchers fail-closed |
| `isKnownTool`, `extractTargets`, `isMissingRequiredFields` | core | Context validation/extraction helpers used by adapters and tests |
| `loadYamlRulePack`          | infrastructure | Load a single YAML rule pack from disk              |
| `loadAllRulePacks`          | infrastructure | Load all packs from a directory                     |
| All types                   | core           | `ToolCallContext`, `GuardrailAction`, `RulePack`, `DomainEvent`, `MatchResult`, `MatchCondition`, `PredicateFunction`, etc. |

### Internal (Not Exported)

| Module                     | Why internal                                                      |
| -------------------------- | ----------------------------------------------------------------- |
| `matchesMatcher` switch    | Engine-internal dispatch on `MatchCondition.type` — adapters go through `matchAndResolve` |
| `splitCommands`            | Engine-internal preprocessing — adapters never need raw splitting |
| `resolveAction`            | Engine-internal resolution — adapters get the final action from `matchAndResolve` |
| `ResolveContext`           | Paired with `resolveAction` — both stay internal                  |

### Why `resolveAction` Is Internal

The resolver handles fallback chains, capability checks, and template interpolation. These are engine concerns. If a future change needs resolver extensibility (e.g., custom transform callbacks), that option threads through `matchAndResolve` — not by exposing the resolver directly.

### Why `splitCommands` Is Internal

Command splitting is a preprocessing step the engine applies before matching. Adapters receive the final resolved action; they don't need to split commands themselves. If an adapter needs to reason about sub-commands, that's a signal the engine should expose richer match metadata — not that the splitter should be public.

### Why `matchesMatcher` Is Exported (But Not Required)

`matchesMatcher` is the single matching function. It's exported so adapter authors writing tests or custom tooling can evaluate a `MatchCondition` directly, but production code should go through `matchAndResolve` so the full match → resolve → trace pipeline runs.

### Adapter Bootstrap Pattern

```typescript
import {
  matchAndResolve,
  processMatch,
  loadAllRulePacks,
  PredicateRegistry,
  StatsTracker,
} from "agent-guardrails";

// 1. Construct collaborators (the caller owns their lifecycle)
const registry = new PredicateRegistry();
const stats = new StatsTracker();

// 2. Register adapter-specific predicates (if any)
registry.register("my-check", (ctx) => /* ... */);

// 3. Load rule packs (registry needed to resolve predicate matchers)
const packs = loadAllRulePacks("./path/to/packs", registry);

// 4. On each tool call
const action = matchAndResolve(ctx, packs, capabilities, registry, stats);
// — or, for audit/telemetry, use processMatch() to get the event trace:
// const { action, events } = processMatch(ctx, packs, capabilities, registry, stats);

// 5. On session end
const snapshot = stats.getStats();
stats.resetStats();
```

## Rationale

- **Stable contract:** Consumers depend on a small, intentional surface — not on internal file paths
- **Refactoring freedom:** Internal modules can be restructured without breaking adapters
- **No hidden state:** The engine has no module-level singletons. All collaborators are passed as arguments, so the data flow at every call site is visible and testable.
- **Progressive disclosure:** Types and validators are public for pack authors; engine plumbing is hidden for adapter authors

## Consequences

- Adapters import from the package root, never from internal paths
- Adding new internal modules doesn't expand the public surface unless explicitly intended
- `resolveAction` extensibility (e.g., transform callbacks) is added to `matchAndResolve`'s signature, not by exporting the resolver
- The engine is a pure function. The `PredicateRegistry` and `StatsTracker` are passed as arguments; the caller (adapter or test) owns them.
- The barrel (`src/index.ts`) is the single source of truth for what's public — if it's not re-exported there, it's internal
