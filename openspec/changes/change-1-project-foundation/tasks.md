## 1. Workspace Setup

- [ ] 1.1 Create monorepo root `package.json` with npm workspaces
- [ ] 1.2 Create `packages/core/` directory structure
- [ ] 1.3 Create `packages/core/package.json` with zero dependencies
- [ ] 1.4 Create `packages/core/tsconfig.json`
- [ ] 1.5 Create `packages/core/vitest.config.ts`

## 2. Behavior Model

- [ ] 2.1 Create `src/types.ts` with `GuardrailBehavior` type: `"block" | "suggest" | "run" | "redact" | "confirm"`
- [ ] 2.2 Define `GuardrailMatcher` type: `{ type: "file-path" | "bash-command"; pattern: RegExp }`
- [ ] 2.3 Define `GuardrailAction` discriminated union:
  - `{ type: "allow" }`
  - `{ type: "block"; message: string }`
  - `{ type: "suggest"; replacement: string | string[]; message?: string }`
  - `{ type: "run"; replacement: string | string[]; message?: string }`
  - `{ type: "redact"; replacement: string }`
  - `{ type: "confirm"; message: string; fallback?: GuardrailAction }`
- [ ] 2.4 Define `GuardrailRule` interface with id, title, description, phase, match, defaultAction
- [ ] 2.5 Define `RulePack` interface with id, name, description, rules
- [ ] 2.6 Add JSDoc documentation for all types

## 3. Harness Capabilities

- [ ] 3.1 Create `src/harness.ts` with `HarnessCapabilities` interface
- [ ] 3.2 Implement `HARNESSES` constant with Capabilities for pi, opencode, codex, claude-code
- [ ] 3.3 Implement `hasCapability(harness, Behavior)` helper function
- [ ] 3.4 Add unit tests for Capability lookups per Harness

## 4. Module Exports

- [ ] 4.1 Create `src/index.ts` exporting all types from types.ts
- [ ] 4.2 Export Harness Capabilities from harness.ts

## 5. Testing

- [ ] 5.1 Test Behavior enum values compile correctly
- [ ] 5.2 Test rule type compilation with sample rules
- [ ] 5.3 Test Harness Capabilities match spec (pi: all true, opencode: confirm false, etc.)
- [ ] 5.4 Test hasCapability helper returns correct booleans
- [ ] 5.5 Verify zero dependencies in package.json

## 6. Documentation

- [ ] 6.1 Create `packages/core/README.md` with usage examples
- [ ] 6.2 Document Behavior model and Rule Pack interface
