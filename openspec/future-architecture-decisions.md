# Future Architecture Decisions

Decisions made during MVP design phase that apply to post-MVP iterations.

## Package Structure Split Trigger

**Current (MVP):** Single package with clear internal structure:
```
src/
  core/        ← types only
  matcher/     ← GuardrailMatcher evaluation
  resolver/    ← Action resolution + fallback
  engine/      ← orchestrator
  packs/       ← built-in rule packs
  adapters/
    pi/
    opencode/
```

**Split when:**
- Reaching 3+ adapters (agent-guardrails + separate adapter packages)
- Independent versioning needs arise
- Community rule pack registry required

**Split structure:**
```
packages/
  agent-guardrails/  (core + engine + built-in packs)
  adapter-pi/
  adapter-opencode/
  adapter-codex/
```

Rationale: Reduces mental overhead for contributors (one package to clone, one `npm install`, one test run). Eliminates TypeScript project references complexity during MVP.

## Domain Events

### What's in MVP
Engine produces events internally but doesn't expose them:
```typescript
// Internal processing
function processMatch(ctx, packs, caps): { action: GuardrailAction | null, events: DomainEvent[] } {
  const events = [];
  // ... matching logic ...
  events.push({ type: "RuleMatched", ruleId, matched });
  events.push({ type: "FallbackTriggered", requested: "run", actual: "suggest" });
  return { action, events };
}

// Public API (MVP)
function matchAndResolve(ctx, packs, caps): GuardrailAction | null {
  return processMatch(ctx, packs, caps).action;  // Discards events
}
```

### What post-MVP brings
Exposes events for observability and audit:
```typescript
// Public API (post-MVP)
function matchAndResolveWithEvents(ctx, packs, caps): MatchResult {
  return processMatch(ctx, packs, caps);
}

type MatchResult = {
  action: GuardrailAction | null;
  events: DomainEvent[];
};

// Use cases:
// - Telemetry: "which rules fire most often?"
// - Audit trail: "why was this command blocked?"
// - Debugging: "did the fallback chain activate?"
```

This enables observability features (Tier 2 stats, audit logs) without breaking the MVP API.

## Clean Architecture: Input/Output Ports

**Current (MVP):** Adapters depend on concrete engine implementation:
```typescript
import { matchAndResolve } from "../../../engine";
const action = matchAndResolve(ctx, packs, caps);
```

**Post-MVP (when adding Codex adapter):** Introduce port interface:
```typescript
// core/ports.ts
export interface GuardrailEngine {
  evaluate(ctx: ToolCallContext): Promise<GuardrailAction | null>;
}

// engine/adapter.ts
export class DefaultGuardrailEngine implements GuardrailEngine {
  constructor(private matcher: Matcher, private resolver: Resolver) {}
  async evaluate(ctx) { ... }
}

// adapters depend on port, not implementation
export function createPiAdapter(engine: GuardrailEngine) { ... }
```

**Trigger:** Adding the 3rd adapter (Codex) forces this refactor. By then, the pattern is clear and the cost of introducing the interface is amortized across 3 adapters.

**Benefits:**
- Test adapters with mock engines
- Swap engine implementations (caching, telemetry)
- Adapters don't know about matcher/resolver internals

## Infrastructure Layer

**MVP structure:**
```
infrastructure/
  config-loader.ts      ← implements config loading (reads JSON files)
  yaml-pack-loader.ts   ← implements rule pack loading (reads YAML files)
```

Dependency direction: `adapters → engine → infrastructure → core`

**Post-MVP:** Formalize ports in `core/ports.ts`:
```typescript
export interface ConfigLoader {
  load(): Promise<Config>;
}

export interface RulePackLoader {
  loadFromDirectory(path: string): Promise<RulePack[]>;
}
```

Infrastructure classes implement these ports. Engine depends on ports, not concrete loaders.

## Cross-Package Dependency Management

When splitting to multiple packages, adopt [Changesets](https://github.com/changesets/changesets) for:
- Semantic versioning across packages
- Changelog generation
- Publishing in correct dependency order

MVP: Single package, single version number. No tooling needed.
