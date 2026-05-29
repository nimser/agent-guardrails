## Context

Agent Guardrails needs a foundation that defines the Behavior model, Rule Pack interface, and Harness Capabilities. This enables consistent implementation across all components.

## Goals / Non-Goals

**Goals:**
- Define clear Behavior vocabulary
- Define GuardrailMatcher discriminated union (bash-command, file-path, predicate)
- Define ToolCallContext discriminated union (on toolName)
- Enable static Rule Pack loading
- Model Harness Capabilities accurately
- Define Phase-Behavior Matrix
- Create engine package with matchAndResolve and fallback chain
- Provide test infrastructure

**Non-Goals:**
- Actual detection logic
- Platform-specific Adapters
- Configuration file loading

## Decisions

### Decision 1: Five Behavior types

**Choice**: `block`, `suggest`, `run`, `redact`, `confirm`

**Rationale**:
- `block`: Universal, works in all Harnesses, all Phases
- `suggest`: Universal, works in all Harnesses, before-tool Phase only
- `run`: opencode/Pi only, requires shell execution Capability
- `redact`: opencode/Pi only, after-tool Phase only, Defense in Depth
- `confirm`: Pi/Codex native, others Fallback to `suggest`

### Decision 2: Phase-based Rule model

**Choice**: Rules have `phase: "before-tool" | "after-tool"`

**Rationale**:
- `before-tool`: Tool Call phase, can block/suggest/run/confirm
- `after-tool`: Tool Result phase, can only redact (for opencode/Pi) or warn (for Claude Code/Codex)
- Clear separation of concerns
- Matches Harness hook APIs
- Phase constrains which Behaviors are available (Phase-Behavior Matrix)

### Decision 3: Static Rule Pack interface

**Choice**: Rule Packs are TypeScript modules with static exports

**Rationale**:
- No dynamic loading complexity
- Easy to test
- Easy to contribute
- Can be published as npm packages later

### Decision 4: Harness Capability model

**Choice**: Explicit Capability flags per Harness

**Rationale**:
- Adapters can check Capabilities before using a Behavior
- Clear documentation of limitations
- Easy to add new Harnesses
- Enables Fallback logic (e.g., `confirm` → `suggest`)

### Decision 5: Action Fallback Chain

**Choice**: Formalized fallback chain in core: `run → suggest → block`, `confirm → suggest`, `suggest (no safer cmd) → block`

**Rationale**:
- Deterministic behavior when Harness lacks Capability
- Adapters don't reinvent fallback logic
- `suggest` gracefully degrades to `block` when no safer command exists
- Testable as a pure function in the engine

### Decision 6: Shared engine package

**Choice**: Create engine (`src/engine/`) with `matchAndResolve()` function

**Rationale**:
- Adapters become thin shims (normalize event → call engine → translate result)
- Single source of truth for matching and Action resolution
- Adding new Adapters is trivial
- Centralizes fallback chain logic

### Decision 7: Matcher Registry with Explicit Initialization

**Choice**: Core defines `bash-command`, `file-path`, and `predicate` matcher types, registered via a `MatcherRegistry` class with explicit initialization through `initializeMatcherRegistry()` function (not module-level side effects).

**Problem statement**: We need a way to register matcher handlers that is:
- **Testable**: Tests should be able to register only the matchers they need
- **Predictable**: No hidden side effects on module import
- **OCP-compliant**: New matchers added without modifying existing code

**Solution**: Explicit initialization lifecycle
```typescript
// src/matcher/registry.ts
export class MatcherRegistry {
  private handlers = new Map<string, MatcherHandler>();
  register(handler: MatcherHandler): void { /* ... */ }
  evaluate(matcher: GuardrailMatcher, ctx: ToolCallContext): boolean { /* ... */ }
  clear(): void { /* ... */ }  // For test isolation
}
export const matcherRegistry = new MatcherRegistry();

// src/matcher/handlers/bash-command.ts
export const bashCommandHandler: MatcherHandler = { /* ... */ };

// src/matcher/registry-setup.ts
import { matcherRegistry } from './registry';
import { bashCommandHandler } from './handlers/bash-command';
import { filePathHandler } from './handlers/file-path';
import { predicateHandler } from './handlers/predicate';

export function initializeMatcherRegistry(): void {
  matcherRegistry.register(bashCommandHandler);
  matcherRegistry.register(filePathHandler);
  matcherRegistry.register(predicateHandler);
}

// Adapter bootstrap
initializeMatcherRegistry();  // Called once before handling tool calls
```

**Alternatives considered**:
- **Module-level side effects** (auto-register on import): Rejected because tests become fragile (import order matters, global state leaks between tests)
- **Constructor injection** (pass handlers to registry in adapter): Rejected because it duplicates registration logic across adapters

**Why explicit initialization wins**:
- Tests create fresh `MatcherRegistry` instances and register only needed handlers
- No import order dependencies
- Initialization call site is visible in adapter bootstrap code
- Adding a new matcher = create handler file + add one line to `registry-setup.ts`

### Decision 8: ToolCallContext as discriminated union

**Choice**: Discriminated union on `toolName` with strict per-variant fields

**Rationale**:
- Compiler enforces required fields per tool type
- Engine evaluates all matcher types against whatever fields are present
- Adapters just normalize Harness events into this shape

### Decision 9: Aggregate validation

**Choice**: Validate Rule Packs and Rules on load with pure functions

**Rationale**:
- Catches invalid combinations early (duplicate rule IDs, phase-behavior mismatches)
- Clear error messages for contributors
- Prevents silent failures (rules that compile but don't work)
- Pure functions: no side effects, easy to test

**Implementation**:
```typescript
function validateRulePack(pack: RulePack): ValidationResult
function validateRule(rule: GuardrailRule): ValidationResult
```

Validation runs when built-in packs load and when user YAML packs are parsed.

### Decision 10: Contextual message templates

**Choice**: Messages support `{matched}` placeholder interpolated by engine

**Rationale**:
- Agent learns which specific file/command was caught
- More actionable than generic messages
- Single placeholder covers 90% of cases
- Available for all Action types

### Decision 11: Multi-layer matching strategy

**Choice**: Three-layer risk-escalation model (substring + regex + wrapper detection)

**Rationale**:
- Layer 1 (substring): Fast O(n) screening, catches wrapped commands
- Layer 2 (regex): Precise structural matching, standard usage
- Layer 3 (wrappers): Adversarial detection, forces block
- Risk escalation: wrappers + risky keywords = force block ("guilty until proven innocent")
- Implemented as `hardening` rule pack, no engine changes needed

See `docs/matching-strategy.md` for full specification.

### Decision 12: Multi-line command splitting

**Choice**: Split commands on `;`, `&&`, `||`, `\n` before matching. Implemented as the extracted `splitCommands()` pure function in `src/matcher/command-splitter.ts` (see Decision 19).

**Rationale**:
- Catches composition via command chaining
- Cheap string operation, no shell parsing required
- Catches ~80% of composition cases
- Limitations (variable tracking, command substitution) deferred to shell tokenizer (Change 8)
- Extracted as standalone pure function for independent testability and reuse

### Decision 13: Domain events (internal only)

**Choice**: Engine produces events internally but doesn't expose them in public API

**Rationale**:
- Enables future observability without breaking MVP API
- Events: `RuleMatchedEvent`, `FallbackTriggeredEvent`, `ActionOverridden`
- Internal `processMatch()` returns `{ action, events }`
- Public `matchAndResolve()` returns only `action`
- Post-MVP: expose events for telemetry, audit, debugging

See `openspec/future-architecture-decision.md` for post-MVP event API.

### Decision 14: Single package with clear internal structure

**Choice**: Ship as one package with layered directories

**Rationale**:
- Reduces contributor mental overhead (one repo, one install, one test run)
- Eliminates TypeScript project references complexity
- Clear boundaries: `core/ → matcher/ → resolver/ → engine/`
- Infrastructure layer: `infrastructure/config-loader.ts`, `infrastructure/yaml-pack-loader.ts`
- Split trigger: 3+ adapters or independent versioning needs

See `openspec/future-architecture-decision.md` for split criteria.

### Decision 15: Infrastructure layer

**Choice**: Concrete config/pack loaders in `infrastructure/` directory

**Rationale**:
- Keeps dependency direction correct: `adapters → engine → infrastructure → core`
- Post-MVP: introduce port interfaces in `core/ports.ts`
- MVP: concrete classes, no interfaces yet
- Clean architecture without over-engineering

### Decision 16: YAML rule packs in MVP

**Choice**: Ship built-in rule packs as YAML, support user YAML packs from day 1

**Rationale**:
- Lowers contribution barrier (no TypeScript required)
- Enables per-project custom rules via `.agent-guardrails/packs/`
- Community rule pack ecosystem (awesome-agent-guardrails)
- One dependency (`yaml` npm package) lives in infrastructure layer
- Drives adoption: 3-step workflow in README

See `docs/yaml-rule-packs.md` for user documentation.

### Decision 17: Observability Tier 1 (in-memory stats)

**Choice**: In-memory stats counter, log summary at session end

**Rationale**:
- ~20 lines of code
- Engine increments counters during `matchAndResolve`
- Adapters call `getStats()` and log to harness-native output
- Pi: `pi.log()`, opencode: `console.log()`, Claude Code: stderr, Codex: feedback hook
- Provides immediate value without persistence

Post-MVP: Tier 2 (JSON file + CLI query) in `openspec/could-have-features.md`.

### Decision 18: Contextual message templates

**Choice**: Regex-only matching for MVP, document the gap

**Rationale**:
- Regex is deterministic, fast, testable
- Inherently bypassable via command composition (redirects, string concat, alternative tools)
- `redact` Behavior (change-10) is the backstop for anything that slips through
- Shell tokenizer planned for post-MVP for more robust matching

### Decision 19: Engine Decomposition into Pure Function Modules

**Choice**: Decompose the engine into focused modules from the start of 0.1.0, rather than building a monolithic `engine.ts` and refactoring later.

**Problem**: The engine module would otherwise handle 8+ distinct responsibilities:
1. Orchestration (coordinating matching and resolution flow)
2. Normalization (adapters normalize, but engine could own this)
3. Command splitting (multi-line matching logic)
4. Rule matching (iterating rules and evaluating matchers)
5. Action resolution (fallback chains and capability checks)
6. Statistics tracking (incrementing counters)
7. Event emission (domain events, discarded in MVP)
8. Template interpolation (`{variable}` substitution in messages)

**Solution**: Extract each concern into its own module as pure functions or small classes:

```
src/
  core/
    types.ts              # Type definitions
    normalizer.ts         # Pure function: normalizeToolCall(tool, args) → ToolCallContext
    validation.ts         # Validation functions
  matcher/
    registry.ts           # Matcher registry
    command-splitter.ts   # Pure function: splitCommands(command) → string[]
    handlers/             # Individual matchers
  resolver/
    action-resolver.ts    # Pure function: resolveAction(action, caps, ctx?) → GuardrailAction
    fallback-chain.ts     # Fallback logic (part of action-resolver)
  engine/
    engine.ts             # Orchestration only — composes the above modules
    stats-tracker.ts      # StatsTracker class (stateful, encapsulated)
```

**Extracted Modules**:

1. **Normalizer** (`src/core/normalizer.ts`):
   ```typescript
   export function normalizeToolCall(tool: string, args: any): ToolCallContext {
     if (tool === 'Bash' && typeof args.command === 'string') {
       return { toolName: 'bash', command: args.command };
     }
     if (tool === 'Read' && typeof args.path === 'string') {
       return { toolName: 'read', filePath: args.path };
     }
     // ... other tools
     return { toolName: tool };
   }
   ```

2. **Command Splitter** (`src/matcher/command-splitter.ts`):
   ```typescript
   export function splitCommands(command: string): string[] {
     return command.split(/[;&
]+|\|\|/).map(s => s.trim()).filter(Boolean);
   }
   ```

3. **Action Resolver** (`src/resolver/action-resolver.ts`):
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

4. **Stats Tracker** (`src/engine/stats-tracker.ts`):
   ```typescript
   export class StatsTracker {
     private stats = { checks: 0, blocks: 0, suggests: 0 };
     record(action: GuardrailAction | null): void { /* ... */ }
     getStats(): Stats { return { ...this.stats }; }
     reset(): void { this.stats = { checks: 0, blocks: 0, suggests: 0 }; }
   }
   ```

**Engine after decomposition:**
```typescript
// src/engine/engine.ts — orchestration only
import { splitCommands } from '../matcher/command-splitter';
import { StatsTracker } from './stats-tracker';

const statsTracker = new StatsTracker();

export function matchAndResolve(ctx: ToolCallContext, packs: RulePack[], caps: HarnessCapabilities): GuardrailAction | null {
  const commands = splitCommands(ctx.command || '');

  for (const cmd of commands) {
    const matchCtx = { ...ctx, command: cmd };
    const matches = matchRules(matchCtx, packs, registry);

    if (matches.length > 0) {
      const action = resolveAction(matches[0].rule.defaultAction, caps);
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

**Rationale**:
- **Test isolation**: Test `resolveAction` without full engine setup, test `splitCommands` independently
- **Reusability**: Adapters can call `normalizeToolCall` directly if needed
- **Clarity**: Each module has one clear responsibility
- **Growth path**: Adding caching, audit trails, or new features means adding modules, not growing a monolith
- **No extra cost**: These are simple extractions (move function to file, export/import) — no architectural overhead

**Relation to post-0.1.0 pipeline**: This decomposition is the prerequisite for the Pipeline/Chain of Responsibility Pattern (see `openspec/future-architecture-decisions.md`). Once functions are in separate modules, wrapping them in pipeline stages is straightforward.

**Alternatives considered**:
- **Build monolithic first, refactor later**: Rejected — the refactor cost is higher than doing it right the first time, and the extractions are trivial
- **Full pipeline pattern in MVP**: Rejected — over-engineering for 2-3 adapters; decomposition gives 80% of the benefit at 20% of the cost

## Risks / Trade-offs

### Risk: Multi-layer matching complexity
**Mitigation**: Layers are additive and optional. Core matching (Layer 2) works standalone. Layers 1 and 3 are hardening rules, not engine changes.

### Risk: YAML dependency breaks "zero dependencies" goal
**Mitigation**: `yaml` package lives in `infrastructure/`, not `core/`. Core directory remains zero-dep. Infrastructure is optional (adapters can use it or not).

### Risk: Harness Capabilities change
**Mitigation**: Update Capability model, test with real Harnesses

### Risk: Rule Pack interface too rigid
**Mitigation**: Start simple, extend as needed

### Risk: Regex-based matchers are bypassable
**Mitigation**: Regex is best-effort first layer. Shell tokenizer planned post-MVP. `redact` Behavior (change-10) is backstop for anything that slips through.

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should Rule Packs be able to declare required Capabilities?
2. How to handle rules that only work in certain phases?
