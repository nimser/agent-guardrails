## 1. Workspace Setup

- [ ] 1.1 Create monorepo root `package.json` with npm workspaces
- [ ] 1.2 Create `packages/core/` directory structure
- [ ] 1.3 Create `packages/core/package.json` with zero dependencies
- [ ] 1.4 Create `packages/core/tsconfig.json`
- [ ] 1.5 Create `packages/core/vitest.config.ts`

## 2. Behavior Model

- [ ] 2.1 Create `src/types.ts` with `GuardrailBehavior` type: `"block" | "suggest" | "run" | "redact" | "confirm"`
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

## 3. Harness Capabilities

- [ ] 3.1 Create `src/harness.ts` with `HarnessCapabilities` interface
- [ ] 3.2 Implement `HARNESSES` constant with Capabilities for pi, opencode, codex, claude-code
- [ ] 3.3 Implement `hasCapability(harness, Behavior)` helper function
- [ ] 3.4 Add unit tests for Capability lookups per Harness

## 4. Engine Package

- [ ] 4.1 Create `packages/engine/` directory structure with `@agent-guardrails/core` dependency
- [ ] 4.2 Implement `matchAndResolve(ctx: ToolCallContext, packs: RulePack[], caps: HarnessCapabilities): GuardrailAction | null`
- [ ] 4.3 Implement `matches(matcher: GuardrailMatcher, ctx: ToolCallContext): boolean` with exhaustive switch
- [ ] 4.4 Implement `resolveAction(action: GuardrailAction, caps: HarnessCapabilities, matchContext): GuardrailAction`
- [ ] 4.5 Implement Action Fallback Chain: `run → suggest → block`, `confirm → suggest`, `suggest (no cmd) → block`
- [ ] 4.6 Implement `{matched}` message template interpolation
- [ ] 4.7 Implement generic fallback block message: `"Blocked: \`{matched}\` — no safer alternative available."`
- [ ] 4.8 Add unit tests for matching (bash-command, file-path, predicate)
- [ ] 4.9 Add unit tests for fallback chain (run→suggest→block, confirm→suggest, suggest→block)
- [ ] 4.10 Add unit tests for message template interpolation

## 5. Module Exports

- [ ] 5.1 Create `src/index.ts` exporting all types from types.ts
- [ ] 5.2 Export Harness Capabilities from harness.ts
- [ ] 5.3 Export `matchAndResolve` from `@agent-guardrails/engine`

## 6. Testing

- [ ] 6.1 Test Behavior enum values compile correctly
- [ ] 6.2 Test rule type compilation with sample rules
- [ ] 6.3 Test GuardrailMatcher discriminated union compiles
- [ ] 6.4 Test ToolCallContext discriminated union enforces required fields
- [ ] 6.5 Test Harness Capabilities match spec (pi: all true, opencode: confirm false, etc.)
- [ ] 6.6 Test hasCapability helper returns correct booleans
- [ ] 6.7 Verify zero dependencies in core package.json

## 7. Documentation

- [ ] 7.1 Create `packages/core/README.md` with usage examples
- [ ] 7.2 Create `packages/engine/README.md` with usage examples
- [ ] 7.3 Document Behavior model, Rule Pack interface, and Fallback Chain
- [ ] 7.4 Document GuardrailMatcher types and ToolCallContext structure
