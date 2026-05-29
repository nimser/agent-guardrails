# Future Architecture Decisions

Decisions made during MVP design phase that apply to post-MVP iterations.

## [HIGH PRIORITY] Pipeline/Chain of Responsibility Pattern

**Status:** Implicit in design, should become explicit post-0.1.0

The engine's matching logic should be formalized as a processing pipeline rather than a monolithic function. Each stage transforms the match request through a chain of responsibility:

```
ToolCall → Normalize → SplitCommand → MatchRules → ResolveAction → RecordStats
```

### Benefits
- **Testability:** Each stage can be unit tested in isolation with predictable inputs/outputs
- **Extensibility:** New stages (e.g., caching, audit logging) can be inserted without modifying existing code
- **Separation of concerns:** Pure matching logic separated from side effects (stats, events)
- **Debugging:** Pipeline stages can log intermediate results for troubleshooting

### Current State (MVP)
The engine uses a decomposed architecture (see Engine Decomposition below) but still exposes a monolithic public API:
```typescript
export function matchAndResolve(ctx: ToolCallContext): GuardrailAction | null {
  // 1. Normalize (via core/normalizer.ts)
  // 2. Split (via matcher/command-splitter.ts)
  // 3. Match rules (via registry)
  // 4. Resolve action (via resolver/action-resolver.ts, with fallback chains)
  // 5. Track stats (via engine/stats-tracker.ts)
  // 6. Emit events (internally, discarded)
  return processMatch(ctx, packs, caps).action;
}
```

### Post-MVP Refactor
Formalize as explicit pipeline stages:
```typescript
interface PipelineStage<I, O> {
  process(input: I): O;
}

class MatchingPipeline {
  private stages: PipelineStage<any, any>[] = [];

  addStage(stage: PipelineStage<any, any>): void {
    this.stages.push(stage);
  }

  run<I, O>(input: I): O {
    return this.stages.reduce((acc, stage) => stage.process(acc), input);
  }
}

// Stages
class NormalizeStage implements PipelineStage<ToolCall, NormalizedContext> { ... }
class SplitCommandStage implements PipelineStage<NormalizedContext, NormalizedContext[]> { ... }
class MatchRulesStage implements PipelineStage<NormalizedContext, MatchResult[]> { ... }
class ResolveActionStage implements PipelineStage<MatchResult[], GuardrailAction | null> { ... }
class StatsStage implements PipelineStage<GuardrailAction | null, GuardrailAction | null> { ... }

// Assembly
const pipeline = new MatchingPipeline();
pipeline.addStage(new NormalizeStage());
pipeline.addStage(new SplitCommandStage());
pipeline.addStage(new MatchRulesStage(registry));
pipeline.addStage(new ResolveActionStage(resolver));
pipeline.addStage(new StatsStage(statsTracker));

export const matchAndResolve = (ctx: ToolCallContext) => pipeline.run(ctx);
```

### When to Implement
- After 0.1.0 release, when adding new features (caching, audit trails)
- Or when test coverage becomes difficult due to monolithic engine function
- Estimated effort: 2-3 days of refactoring

**Related:** Domain Events section (exposing pipeline events for observability)

---

## [COMPLETED] Engine Decomposition

**Status:** ✅ Completed in OpenSpec changes 1-5. The 0.1.0 MVP now uses a decomposed engine architecture.

The engine's 8+ responsibilities have been extracted into focused modules. The public API (`matchAndResolve()`) remains the same — only the internal architecture changed.

### Extracted Modules (0.1.0)

**1. Normalizer** (`src/core/normalizer.ts`):
```typescript
export function normalizeToolCall(tool: string, args: any): ToolCallContext {
  if (tool === 'Bash' && typeof args.command === 'string') {
    return { tool: 'Bash', command: args.command };
  }
  if (tool === 'Read' && typeof args.file_path === 'string') {
    return { tool: 'Read', path: args.file_path };
  }
  // ... other tools
  return { tool, ...args };
}
```

**2. Command Splitter** (`src/matcher/command-splitter.ts`):
```typescript
export function splitCommands(command: string): string[] {
  return command.split(/[;&\n]+|\|\|/).map(s => s.trim()).filter(Boolean);
}
```

**3. Action Resolver** (`src/resolver/action-resolver.ts`):
```typescript
export function resolveAction(
  action: GuardrailAction,
  capabilities: HarnessCapabilities,
  saferCommand?: string
): GuardrailAction {
  // Apply fallback chains
  // Handle capability checks
  // Interpolate templates
}
```

**4. Safer Commands** (`src/resolver/safer-commands.ts`):
```typescript
export function findSaferCommand(command: string): string | null {
  // Lookup safer alternative for known dangerous commands
  // Delegates to src/resolver/sops-format.ts for SOPS format detection
}
```

**5. Stats Tracker** (`src/engine/stats-tracker.ts`):
```typescript
export class StatsTracker {
  private stats = { checks: 0, blocks: 0, suggests: 0 };
  
  record(action: GuardrailAction | null): void {
    this.stats.checks++;
    if (action?.behavior === 'block') this.stats.blocks++;
    if (action?.behavior === 'suggest') this.stats.suggests++;
  }
  
  getStats(): Stats { return { ...this.stats }; }
  reset(): void { this.stats = { checks: 0, blocks: 0, suggests: 0 }; }
}
```

**Engine after extraction:**
```typescript
// src/engine/engine.ts — Orchestration only
import { splitCommands } from '../matcher/command-splitter';
import { resolveAction } from '../resolver/action-resolver';
import { findSaferCommand } from '../resolver/safer-commands';
import { StatsTracker } from './stats-tracker';

const statsTracker = new StatsTracker();

export function matchAndResolve(ctx: ToolCallContext, packs: RulePack[], caps: HarnessCapabilities): GuardrailAction | null {
  // 1. Split commands
  const commands = splitCommands(ctx.command || '');
  
  // 2. For each command segment, match rules
  for (const cmd of commands) {
    const matchCtx = { ...ctx, command: cmd };
    const matches = matchRules(matchCtx, packs, registry);
    
    if (matches.length > 0) {
      // 3. Look up safer command if suggest behavior
      const rule = matches[0].rule;
      const saferCmd = rule.defaultAction.type === 'suggest'
        ? findSaferCommand(cmd)
        : undefined;
      
      // 4. Resolve action (fallback chain, capability checks, template interpolation)
      const action = resolveAction(rule.defaultAction, caps, saferCmd);
      
      // 5. Track stats
      statsTracker.record(action);
      
      return action;
    }
  }
  
  statsTracker.record(null);
  return null;
}

export function getStats() { return statsTracker.getStats(); }
export function resetStats() { statsTracker.reset(); }
```

### Module Layout After Decomposition
```
src/
  core/
    types.ts              # Type definitions
    normalizer.ts         # Pure function: normalizeToolCall()
    validation.ts         # Validation functions (validateRulePack, validateRule)
  matcher/
    registry.ts           # Matcher registry (MatcherRegistry class)
    command-splitter.ts   # Pure function: splitCommands()
    handlers/             # Individual matchers (bash-command, file-path, predicate)
  resolver/
    action-resolver.ts    # Pure function: resolveAction() with fallback chains
    safer-commands.ts     # Pure function: findSaferCommand()
    sops-format.ts        # Pure function: detectSupsFormat()
  engine/
    engine.ts             # Orchestration only — composes the above
    stats-tracker.ts      # StatsTracker class (stateful, encapsulated)
```

### Benefits Achieved
- **Test isolation:** Test `resolveAction` without a full engine setup; test `splitCommands` independently
- **Reusability:** Adapters can call `normalizeToolCall` directly; resolver layer usable standalone
- **Clarity:** Each module has one clear responsibility
- **Performance:** Pure functions are memoizable (matcher results, template interpolation)
- **Migration path to pipeline:** Each module naturally maps to a pipeline stage (see Pipeline section)

### Post-0.1.0 Evolution Path

After 0.1.0, can refactor to full pipeline/chain-of-responsibility pattern:
```typescript
// Post-0.1.0 option: Pipeline architecture (wraps existing modules)
interface Stage<I, O> {
  execute(input: I, next: (input: I) => O): O;
}

class NormalizeStage implements Stage<RawEvent, ToolCallContext> { /* uses core/normalizer */ }
class SplitStage implements Stage<ToolCallContext, ToolCallContext[]> { /* uses matcher/command-splitter */ }
class MatchStage implements Stage<ToolCallContext, RuleMatch[]> { /* uses matcher/registry */ }
class ResolveStage implements Stage<RuleMatch[], GuardrailAction[]> { /* uses resolver/action-resolver + resolver/safer-commands */ }
class StatsStage implements Stage<GuardrailAction[], GuardrailAction | null> { /* uses engine/stats-tracker */ }
```

**Trigger for refactor:** When adding features requiring cross-cutting concerns (logging, caching, metrics, async operations).

**Current approach proven successful:** Extracted pure functions provide testability and reusability while keeping orchestration simple and API stable.

---

## Package Structure Split Trigger

**Current (MVP):** Single package with clear internal structure:
```
src/
  core/        ← types only
  matcher/     ← GuardrailMatcher evaluation
  resolver/    ← Action resolution + fallback + safer commands
  engine/      ← orchestrator + stats
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
