## 1. Workspace Setup

- [ ] 1.1 Create root `package.json` (single package, not workspace yet)
- [ ] 1.2 Create `tsconfig.json`
- [ ] 1.3 Create `vitest.config.ts`
- [ ] 1.4 Create internal directory structure:
  - `src/core/`
  - `src/matcher/`
  - `src/resolver/`
  - `src/engine/`
  - `src/infrastructure/`
  - `src/packs/`
  - `src/adapters/`

## 2. Behavior Model (in `src/core/`)

- [ ] 2.1 Create `src/core/types.ts` with `GuardrailBehavior` type: `"block" | "suggest" | "run" | "redact" | "confirm"`
- [ ] 2.2 Define `GuardrailMatcher` discriminated union:
  - `{ type: "bash-command"; pattern: RegExp }`
  - `{ type: "file-path"; pattern: RegExp }`
  - `{ type: "predicate"; test: (ctx: ToolCallContext) => boolean }`
- [ ] 2.3 Define `ToolCallContext` discriminated union on `toolName`:
  - `{ toolName: "bash"; command: string; filePath?: string }`
  - `{ toolName: "read"; filePath: string }`
  - `{ toolName: "write"; filePath: string }`
  - `{ toolName: string; command?: string; filePath?: string }` (catch-all)
- [ ] 2.4 Define `GuardrailAction` discriminated union:
  - `{ type: "allow" }`
  - `{ type: "block"; message: string }`
  - `{ type: "suggest"; replacement: string; message?: string }`
  - `{ type: "run"; replacement: string; message?: string }`
  - `{ type: "redact"; replacement: string }`
  - `{ type: "confirm"; message: string; fallback?: GuardrailAction }`
- [ ] 2.5 Define `GuardrailRule` interface with id, title, description, phase, match, defaultAction
- [ ] 2.6 Define `RulePack` interface with id, name, description, rules
- [ ] 2.7 Add JSDoc documentation for all types
- [ ] 2.8 Create `src/core/validation.ts` with `validateRulePack(pack): ValidationResult` and `validateRule(rule): ValidationResult`
- [ ] 2.9 Add unit tests for validation (duplicate rule IDs, phase-behavior matrix violations)

## 3. Harness Capabilities (in `src/core/`)

- [ ] 3.1 Create `src/core/harness.ts` with `HarnessCapabilities` interface
- [ ] 3.2 Implement `HARNESSES` constant with Capabilities for pi, opencode, codex, claude-code
- [ ] 3.3 Implement `hasCapability(harness, Behavior)` helper function
- [ ] 3.4 Add unit tests for Capability lookups per Harness

## 4. Matcher Layer (in `src/matcher/`)

- [ ] 4.1 Create `src/matcher/registry.ts` with `MatcherRegistry` class
- [ ] 4.2 Implement `register(handler: MatcherHandler): void`
- [ ] 4.3 Implement `evaluate(matcher: GuardrailMatcher, ctx: ToolCallContext): boolean`
- [ ] 4.4 Implement `clear(): void` for test isolation
- [ ] 4.5 Create `src/matcher/handlers/bash-command.ts` implementing `MatcherHandler`
- [ ] 4.6 Create `src/matcher/handlers/file-path.ts` implementing `MatcherHandler`
- [ ] 4.7 Create `src/matcher/handlers/predicate.ts` implementing `MatcherHandler`
- [ ] 4.8 Create `src/matcher/registry-setup.ts` with explicit initialization:
  ```typescript
  import { matcherRegistry } from './registry';
  import { bashCommandHandler } from './handlers/bash-command';
  import { filePathHandler } from './handlers/file-path';
  import { predicateHandler } from './handlers/predicate';
  
  export function initializeMatcherRegistry(): void {
    matcherRegistry.register(bashCommandHandler);
    matcherRegistry.register(filePathHandler);
    matcherRegistry.register(predicateHandler);
  }
  ```
- [ ] 4.9 Add unit tests for each handler type
- [ ] 4.10 Add unit tests for registry (register, evaluate, clear, duplicate handling)

## 5. Engine Module Extractions (Engine Decomposition)

- [ ] 5.0a Create `src/core/normalizer.ts` with `normalizeToolCall(tool: string, args: any): ToolCallContext` pure function
- [ ] 5.0b Add unit tests for normalizer: bash, read, write, unknown tools
- [ ] 5.0c Create `src/matcher/command-splitter.ts` with `splitCommands(cmd: string): string[]` pure function splitting on `;`, `&&`, `||`, `\n`
- [ ] 5.0d Add unit tests for command splitter (chained commands, multi-line, edge cases)
- [ ] 5.0e Create `src/engine/stats-tracker.ts` with `StatsTracker` class encapsulating stats state
- [ ] 5.0f Implement `StatsTracker.record(action)`, `getStats()`, `reset()` methods
- [ ] 5.0g Add unit tests for StatsTracker (record, getStats, reset isolation)

## 6. Multi-Line Splitting (in `src/matcher/`)

- [ ] 6.1 Engine imports and uses `splitCommands()` from `src/matcher/command-splitter.ts`
- [ ] 6.2 Evaluate matchers against each segment independently
- [ ] 6.3 Add unit tests: matches fire on individual segments
- [ ] 6.4 (splitting logic itself tested in task 5.0d)

## 7. Resolver Layer (in `src/resolver/`) — Action Resolver Extraction

- [ ] 7.1 Create `src/resolver/action-resolver.ts` with `resolveAction(action: GuardrailAction, caps: HarnessCapabilities, matchContext): GuardrailAction` pure function
- [ ] 7.2 Implement Action Fallback Chain: `run → suggest → block`, `confirm → suggest`, `suggest (no cmd) → block`
- [ ] 7.3 Implement `{matched}` message template interpolation
- [ ] 7.4 Implement generic fallback block message: `"Blocked: \`{matched}\` — no safer alternative available."`
- [ ] 7.5 Add unit tests for fallback chain (run→suggest→block, confirm→suggest, suggest→block)
- [ ] 7.6 Add unit tests for message template interpolation
- [ ] 7.7 Add unit tests: resolveAction is testable without full engine setup

## 8. Engine Layer (in `src/engine/`) — Orchestration Only

- [ ] 8.1 Implement `matchAndResolve(ctx: ToolCallContext, packs: RulePack[], caps: HarnessCapabilities): GuardrailAction | null` — orchestrates `splitCommands`, `matchRules`, `resolveAction`, `StatsTracker`
- [ ] 8.2 Import and compose extracted modules: `splitCommands` from `matcher/command-splitter`, `resolveAction` from `resolver/action-resolver`, `StatsTracker` from `engine/stats-tracker`
- [ ] 8.3 Implement internal `processMatch()` that returns `{ action, events }` with domain events
- [ ] 8.4 `matchAndResolve` calls `processMatch` and returns only the action (events discarded in MVP)
- [ ] 8.5 Add unit tests for engine orchestration (engine is thin: only composes imported modules)
- [ ] 8.6 Test Behavior enum values compile correctly
- [ ] 8.7 Test rule type compilation with sample rules
- [ ] 8.8 Test GuardrailMatcher discriminated union compiles
- [ ] 8.9 Test ToolCallContext discriminated union enforces required fields
- [ ] 8.10 Test Harness Capabilities match spec (pi: all true, opencode: confirm false, etc.)
- [ ] 8.11 Test hasCapability helper returns correct booleans
- [ ] 8.12 Verify zero dependencies in `src/core/` (yaml dep lives in infrastructure)

## 9. Observability Tier 1 (in `src/engine/`)

- [ ] 9.1 Engine wraps `StatsTracker` instance (from task 5.0e) and exposes `getStats()` / `resetStats()` as module-level conveniences
- [ ] 9.2 Engine increments counters (totalChecks, matches, blocks, suggests) during `matchAndResolve`
- [ ] 9.3 Track top rule IDs (map of ruleId → count)
- [ ] 9.4 Add unit tests: stats increment correctly
- [ ] 9.5 Add unit tests: stats reset to zero

## 10. Module Exports

- [ ] 10.1 Create `src/index.ts` exporting all types from core
- [ ] 10.2 Export matcher registry from matcher layer
- [ ] 10.3 Export `resolveAction` from resolver layer (`src/resolver/action-resolver.ts`)
- [ ] 10.4 Export `normalizeToolCall` from core (`src/core/normalizer.ts`)
- [ ] 10.5 Export `splitCommands` from matcher layer (`src/matcher/command-splitter.ts`)
- [ ] 10.6 Export `matchAndResolve`, `getStats`, `resetStats` from engine layer

## 11. Documentation

- [ ] 11.1 Create top-level `README.md` with usage examples
- [ ] 11.2 Document Behavior model, Rule Pack interface, and Fallback Chain
- [ ] 11.3 Document GuardrailMatcher types and ToolCallContext structure
- [ ] 11.4 Document multi-layer matching strategy (reference `docs/matching-strategy.md`)
- [ ] 11.5 Document YAML rule pack format (reference `docs/yaml-rule-packs.md`)
- [ ] 11.6 Create `SECURITY.md` with regex bypassability disclaimer
- [ ] 11.7 Create `CONTRIBUTING.md` with 5-minute YAML rule pack path
- [ ] 11.8 Document engine decomposition: which module owns which responsibility, where to add new features
