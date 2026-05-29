# Tasks: Project Foundation

> **TDD MANDATE**: Every implementation task below MUST follow Test-Driven
> Development via RED→GREEN→REFACTOR vertical slices. Write ONE failing test,
> then write minimal code to pass, then refactor. Never write all tests first
> then all implementation. See `.agents/skills/tdd/SKILL.md` for full workflow.

## 1. Project Setup

- [ ] 1.1 Create `package.json` with vitest, typescript, yaml dev dependencies
- [ ] 1.2 Create `tsconfig.json`
- [ ] 1.3 Create `vitest.config.ts`
- [ ] 1.4 Create directory structure:
  - `src/core/` (types, validator, predicate-registry)
  - `src/matcher/handlers/` (bash-command, file-path, predicate)
  - `src/matcher/` (registry, command-splitter)
  - `src/resolver/` (action-resolver)
  - `src/engine/` (engine, stats-tracker)
  - `src/infrastructure/` (yaml-pack-loader)
  - `src/packs/` (YAML rule packs + predicates.ts)
  - `src/adapters/`

## 2. Core Types (`src/core/`)

### 2.1 Behavior and Action types

> **TDD**: Write failing type tests first, then implement types.

- [ ] 2.1.0 RED: Write compile-time tests for `GuardrailBehavior` (must be union of 5 strings)
- [ ] 2.1.1 GREEN: Define `GuardrailBehavior` type in `src/core/types.ts`
- [ ] 2.1.2 RED: Write compile-time tests for `GuardrailAction` discriminated union
- [ ] 2.1.3 GREEN: Define `GuardrailAction` discriminated union in `src/core/types.ts`
- [ ] 2.1.4 REFACTOR: Verify both pass

### 2.2 Matcher and Context types

> **TDD**: Write failing tests for ToolCallContext and GuardrailMatcher.

- [ ] 2.2.0 RED: Write tests for `ToolCallContext` discriminated union (toolName="bash" requires command, toolName="read" requires filePath, catch-all variant)
- [ ] 2.2.1 GREEN: Define `ToolCallContext` in `src/core/types.ts`
- [ ] 2.2.2 RED: Write tests for `GuardrailMatcher` discriminated union (bash-command with pattern, file-path with pattern, predicate with predicateName)
- [ ] 2.2.3 GREEN: Define `GuardrailMatcher` in `src/core/types.ts`
  - `{ type: "bash-command"; pattern: RegExp }`
  - `{ type: "file-path"; pattern: RegExp }`
  - `{ type: "predicate"; predicateName: string }`
- [ ] 2.2.4 REFACTOR: Verify both pass

### 2.3 Rule and RulePack interfaces

> **TDD**: Write tests for GuardrailRule and RulePack structure.

- [ ] 2.3.0 RED: Write tests for `GuardrailRule` (must have id, title, description, phase, match, defaultAction)
- [ ] 2.3.1 GREEN: Define `GuardrailRule` interface
- [ ] 2.3.2 RED: Write tests for `RulePack` (must have id, name, description, rules)
- [ ] 2.3.3 GREEN: Define `RulePack` interface
- [ ] 2.3.4 REFACTOR: Verify both pass

## 3. Predicate Registry (`src/core/predicate-registry.ts`)

> **TDD**: Test predicate registration and resolution before using it.

- [ ] 3.0 RED: Write tests for `PredicateRegistry`:
  - Register a predicate by name, resolve returns the function
  - Resolve unknown name returns undefined
  - Clear removes all registered predicates
  - Duplicate registration throws or overwrites (document behavior)
- [ ] 3.1 GREEN: Implement `PredicateRegistry` class:
  ```typescript
  export class PredicateRegistry {
    register(name: string, fn: (ctx: ToolCallContext) => boolean): void
    resolve(name: string): ((ctx: ToolCallContext) => boolean) | undefined
    clear(): void
  }
  ```
- [ ] 3.2 REFACTOR: Verify all tests pass

## 4. Validation (`src/core/validator.ts`)

> **TDD**: Write failing tests for validation before implementing.

- [ ] 4.0 RED: Write tests for `validateRule()`:
  - Valid rule passes
  - Missing required field fails
  - phase="after-tool" with action.type="block" fails (invalid phase-behavior combination)
- [ ] 4.1 GREEN: Implement `validateRule()`
- [ ] 4.2 RED: Write tests for `validateRulePack()`:
  - Valid pack passes
  - Duplicate rule IDs fail
  - Invalid rule fails
- [ ] 4.3 GREEN: Implement `validateRulePack()`
- [ ] 4.4 REFACTOR: Verify all validation tests pass

## 5. Matcher Layer (`src/matcher/`)

### 5.1 Matcher Registry

> **TDD**: Test the registry with isolated handlers before implementing handlers.

- [ ] 5.1.0 RED: Write tests for `MatcherRegistry`:
  - Register handler, evaluate calls it
  - Unknown matcher type throws
  - Clear removes all handlers
  - Duplicate type registration behavior (throw or overwrite)
- [ ] 5.1.1 GREEN: Implement `MatcherRegistry` class:
  ```typescript
  export class MatcherRegistry {
    register(handler: MatcherHandler): void
    evaluate(matcher: GuardrailMatcher, ctx: ToolCallContext): boolean
    clear(): void
  }
  ```
- [ ] 5.1.2 REFACTOR: Verify all registry tests pass

### 5.2 Matchers

> **TDD**: Write failing tests for each matcher type individually.

- [ ] 5.2.0 RED: Write tests for `bash-command` matcher (pattern matches/doesn't match command)
- [ ] 5.2.1 GREEN: Implement `bash-command.ts` handler
- [ ] 5.2.2 RED: Write tests for `file-path` matcher (pattern matches/doesn't match filePath)
- [ ] 5.2.3 GREEN: Implement `file-path.ts` handler
- [ ] 5.2.4 RED: Write tests for `predicate` matcher (resolves predicateName, calls function)
- [ ] 5.2.5 GREEN: Implement `predicate.ts` handler
  - Must accept matcher with `predicateName: string` and a resolved `test` function
  - Must call `test(ctx)` and return the result
- [ ] 5.2.6 REFACTOR: Verify all matcher tests pass

### 5.3 Registry Setup

- [ ] 5.3.1 Implement `initializeMatcherRegistry()` in `src/matcher/setup.ts`:
  ```typescript
  export function initializeMatcherRegistry(): void {
    matcherRegistry.register(bashCommandHandler);
    matcherRegistry.register(filePathHandler);
    matcherRegistry.register(predicateHandler);
  }
  ```
- [ ] 5.3.2 Add test: calling `initializeMatcherRegistry()` registers all 3 handlers

## 6. Command Splitter (`src/matcher/command-splitter.ts`)

> **TDD**: Write failing tests for command splitting before implementing.

- [ ] 6.0 RED: Write tests for `splitCommands()`:
  - Split on `;`, `&&`, `||`, `\n`
  - Trim whitespace
  - Filter empty segments
  - Handle nested quotes correctly (don't split inside quotes)
- [ ] 6.1 GREEN: Implement `splitCommands(command: string): string[]`
- [ ] 6.2 REFACTOR: Verify all splitting tests pass

## 7. Resolver (`src/resolver/action-resolver.ts`)

> **TDD**: Write failing tests for resolution logic before implementing.

- [ ] 7.0 RED: Write tests for `resolveAction()`:
  - `run` with `run: true` capability → returns run action
  - `run` with `run: false` capability → falls back to suggest
  - `suggest` with safer command → returns suggest action with replacement
  - `suggest` with no safer command → falls back to block
  - `confirm` with `confirm: false` capability → falls back to suggest
  - `block` → always returns block (no fallback needed)
  - `{matched}` interpolation in messages
- [ ] 7.1 GREEN: Implement `resolveAction()`:
  ```typescript
  export function resolveAction(
    action: GuardrailAction,
    capabilities: HarnessCapabilities,
    matchContext?: { matched?: string; saferCommand?: string }
  ): GuardrailAction
  ```
- [ ] 7.2 RED: Write tests for action fallback chain:
  - `run` → `suggest` → `block`
  - `confirm` → `suggest`
  - `suggest` (no safer command) → `block`
- [ ] 7.3 GREEN: Implement fallback chain logic
- [ ] 7.4 REFACTOR: Verify all resolver tests pass

## 8. Engine (`src/engine/`)

### 8.1 Stats Tracker

> **TDD**: Write failing tests for stats tracking before implementing.

- [ ] 8.1.0 RED: Write tests for `StatsTracker`:
  - Initial stats are zero
  - Incrementing a counter works
  - `getStats()` returns current state
  - `resetStats()` zeroes everything
- [ ] 8.1.1 GREEN: Implement `StatsTracker` class
- [ ] 8.1.2 REFACTOR: Verify all stats tests pass

### 8.2 Engine Logic

> **TDD**: Write failing tests for `matchAndResolve()` before implementing.

- [ ] 8.2.0 RED: Write tests for `matchAndResolve()`:
  - Tool call with no matching rules → returns `undefined`
  - Tool call matching a rule → returns resolved action
  - Multiple rules match → returns first match (priority order)
  - Tool call with no `command` or `filePath` → returns `undefined` (early exit)
  - Stats are incremented on each call
- [ ] 8.2.1 GREEN: Implement `matchAndResolve()`:
  ```typescript
  export function matchAndResolve(
    ctx: ToolCallContext,
    packs: RulePack[],
    caps: HarnessCapabilities
  ): GuardrailAction | undefined
  ```
  - Early exit if no command and no filePath
  - Split command (if present)
  - Iterate packs → rules → evaluate matcher
  - On first match, resolve action
  - Increment stats
- [ ] 8.2.2 RED: Write tests for `getStats()` and `resetStats()`
- [ ] 8.2.3 GREEN: Implement stats accessors
- [ ] 8.2.4 REFACTOR: Verify all engine tests pass

## 9. Infrastructure (`src/infrastructure/`)

### 9.1 YAML Rule Pack Loader

> **TDD**: Write failing tests for YAML loading before implementing.

- [ ] 9.1.0 RED: Write tests for `loadYamlRulePack()`:
  - Valid YAML file → returns parsed RulePack
  - Invalid schema → throws validation error
  - Predicate matcher with registered name → resolves to function
  - Predicate matcher with unknown name → throws clear error
- [ ] 9.1.1 GREEN: Implement `loadYamlRulePack()`:
  ```typescript
  export async function loadYamlRulePack(
    filePath: string,
    predicateRegistry: PredicateRegistry
  ): Promise<RulePack>
  ```
- [ ] 9.1.2 RED: Write tests for `loadAllRulePacks()`:
  - Loads all `.yaml` files from directory
  - Registers built-in predicates before loading
  - Returns array of RulePack objects
  - Validates each pack before returning
- [ ] 9.1.3 GREEN: Implement `loadAllRulePacks()`:
  ```typescript
  export async function loadAllRulePacks(
    packDir: string,
    predicateRegistry: PredicateRegistry
  ): Promise<RulePack[]>
  ```
- [ ] 9.1.4 REFACTOR: Verify all loader tests pass

## 10. Export Layer (`src/index.ts`)

- [ ] 10.1 Create `src/index.ts` that re-exports:
  - All types from `src/core/types.ts`
  - `PredicateRegistry` from `src/core/predicate-registry.ts`
  - `validateRule`, `validateRulePack` from `src/core/validator.ts`
  - `MatcherRegistry`, `initializeMatcherRegistry` from `src/matcher/`
  - `splitCommands` from `src/matcher/command-splitter.ts`
  - `resolveAction` from `src/resolver/action-resolver.ts`
  - `matchAndResolve`, `getStats`, `resetStats` from `src/engine/`
  - `loadYamlRulePack`, `loadAllRulePacks`, `registerBuiltInPredicates` from `src/infrastructure/`
