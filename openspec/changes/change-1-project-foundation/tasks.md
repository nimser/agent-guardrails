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
- [ ] 4.4 Create `src/matcher/handlers/bash-command.ts` implementing `MatcherHandler`
- [ ] 4.5 Create `src/matcher/handlers/file-path.ts` implementing `MatcherHandler`
- [ ] 4.6 Create `src/matcher/handlers/predicate.ts` implementing `MatcherHandler`
- [ ] 4.7 Register all built-in handlers at module load time
- [ ] 4.8 Add unit tests for each handler type
- [ ] 4.9 Add unit tests for registry (register, evaluate, unknown type handling)

## 5. Multi-Line Splitting (in `src/matcher/`)

- [ ] 5.1 Implement `splitCommands(cmd: string): string[]` splitting on `;`, `&&`, `||`, `\n`
- [ ] 5.2 Evaluate matchers against each segment independently
- [ ] 5.3 Add unit tests for splitting (chained commands, multi-line)
- [ ] 5.4 Add unit tests: matches fire on individual segments

## 6. Resolver Layer (in `src/resolver/`)

- [ ] 6.1 Implement `resolveAction(action: GuardrailAction, caps: HarnessCapabilities, matchContext): GuardrailAction`
- [ ] 6.2 Implement Action Fallback Chain: `run → suggest → block`, `confirm → suggest`, `suggest (no cmd) → block`
- [ ] 6.3 Implement `{matched}` message template interpolation
- [ ] 6.4 Implement generic fallback block message: `"Blocked: \`{matched}\` — no safer alternative available."`
- [ ] 6.5 Add unit tests for fallback chain (run→suggest→block, confirm→suggest, suggest→block)
- [ ] 6.6 Add unit tests for message template interpolation

## 7. Engine Layer (in `src/engine/`)

- [ ] 7.1 Implement `matchAndResolve(ctx: ToolCallContext, packs: RulePack[], caps: HarnessCapabilities): GuardrailAction | null`
- [ ] 7.2 Implement internal `processMatch()` that returns `{ action, events }` with domain events
- [ ] 7.3 `matchAndResolve` calls `processMatch` and returns only the action (events discarded in MVP)
- [ ] 7.4 Add unit tests for engine orchestration
- [ ] 7.5 Test Behavior enum values compile correctly
- [ ] 7.6 Test rule type compilation with sample rules
- [ ] 7.7 Test GuardrailMatcher discriminated union compiles
- [ ] 7.8 Test ToolCallContext discriminated union enforces required fields
- [ ] 7.9 Test Harness Capabilities match spec (pi: all true, opencode: confirm false, etc.)
- [ ] 7.10 Test hasCapability helper returns correct booleans
- [ ] 7.11 Verify zero dependencies in `src/core/` (yaml dep lives in infrastructure)

## 8. Observability Tier 1 (in `src/engine/`)

- [ ] 8.1 Create `src/engine/stats.ts` with `GuardrailStats` interface and counters
- [ ] 8.2 Implement `getStats(): GuardrailStats` and `resetStats(): void`
- [ ] 8.3 Engine increments counters (totalChecks, matches, blocks, suggests) during `matchAndResolve`
- [ ] 8.4 Track top rule IDs (map of ruleId → count)
- [ ] 8.5 Add unit tests: stats increment correctly
- [ ] 8.6 Add unit tests: stats reset to zero

## 9. Module Exports

- [ ] 9.1 Create `src/index.ts` exporting all types from core
- [ ] 9.2 Export matcher registry from matcher layer
- [ ] 9.3 Export resolver functions from resolver layer
- [ ] 9.4 Export `matchAndResolve` and `getStats` from engine layer

## 10. Documentation

- [ ] 10.1 Create top-level `README.md` with usage examples
- [ ] 10.2 Document Behavior model, Rule Pack interface, and Fallback Chain
- [ ] 10.3 Document GuardrailMatcher types and ToolCallContext structure
- [ ] 10.4 Document multi-layer matching strategy (reference `docs/matching-strategy.md`)
- [ ] 10.5 Document YAML rule pack format (reference `docs/yaml-rule-packs.md`)
- [ ] 10.6 Create `SECURITY.md` with regex bypassability disclaimer
- [ ] 10.7 Create `CONTRIBUTING.md` with 5-minute YAML rule pack path
