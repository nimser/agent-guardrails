# Proposal: Project Foundation

## Intent

Establish the shared foundation that defines the Behavior model, Rule Pack interface, and core types for Agent Guardrails. This is the minimal base needed to build the first vertical slice (block Behavior in opencode and Pi).

## Problem

Agent Guardrails needs a common foundation that:
- Defines the Behavior vocabulary: `block`, `suggest`, `run`, `redact`, `confirm`
- Defines the Rule Pack interface for extensibility
- Defines Harness Capability model (which Behaviors work where)
- Defines the Phase-Behavior Matrix (which Behaviors are available per Phase)
- Provides test infrastructure for deterministic code
- Maintains zero external dependencies

## Solution

Create `packages/core/` with:
1. Behavior enum and Rule types
2. Rule Pack interface for static loading
3. Harness Capability model
4. Test infrastructure with vitest

## Scope

### In Scope
- `GuardrailBehavior` enum: `block`, `suggest`, `run`, `redact`, `confirm`
- `GuardrailRule` interface with phase (`before-tool`, `after-tool`) and action
- `RulePack` interface for static extension loading
- `HarnessCapabilities` model (which Behaviors each Harness supports)
- npm workspace setup
- vitest test infrastructure

### Out of Scope
- Actual matching logic (covered in `change-2-secret-blocking`)
- Transform logic (covered in `change-5-command-transforms`)
- Redaction logic (covered in `change-9-redact-output`)
- Platform Adapters (covered in `change-3-opencode-adapter`, `change-4-pi-adapter`)

## Approach

1. Create monorepo structure with npm workspaces
2. Define Behavior enum and Rule types in `src/types.ts`
3. Define Rule Pack interface in `src/rule-pack.ts`
4. Define Harness Capabilities in `src/harness.ts`
5. Set up vitest for deterministic unit tests

## Key Design Decisions

### Behavior Model
```typescript
type GuardrailBehavior = "block" | "suggest" | "run" | "redact" | "confirm";
```

- **block**: Stop Tool Call, no alternative. Works in all Harnesses, all Phases.
- **suggest**: Stop Tool Call, suggest safer alternative to LLM. Works in all Harnesses, before-tool Phase only.
- **run**: Stop Tool Call, execute safer alternative in hook, return sanitized Output. Requires shell execution Capability.
- **redact**: Allow Tool Call, sanitize Output before LLM sees it. Works in after-tool Phase only.
- **confirm**: Ask user (native UI or Fallback to suggest).

### Guardrail Action Types
```typescript
type GuardrailAction =
  | { type: "allow" }
  | { type: "block"; message: string }
  | { type: "suggest"; replacement: string | string[]; message?: string }
  | { type: "run"; replacement: string | string[]; message?: string }
  | { type: "redact"; replacement: string }
  | { type: "confirm"; message: string; fallback?: GuardrailAction };
```

Note: `suggest` and `run` support multiple Replacement alternatives. The Harness selects the most appropriate based on context. The first element is the primary recommendation (highest Confidence).

### Rule Pack Interface
```typescript
interface RulePack {
  id: string;
  name: string;
  description: string;
  rules: GuardrailRule[];
}
```

Built-in Rule Packs: `env`, `sops`, `private-key`, `secret-managers`, `encryption-tools`, `kubernetes`, `vault`, `git`

### Harness Capabilities
```typescript
interface HarnessCapabilities {
  block: boolean;      // All Harnesses
  suggest: boolean;    // All Harnesses
  run: boolean;        // Only opencode, Pi
  redact: boolean;     // Only opencode, Pi
  confirm: boolean;    // Only Pi, Codex (native)
}
```

### Phase-Behavior Matrix

| Phase | block | suggest | run | redact | confirm |
|-------|-------|---------|-----|--------|--------|
| `before-tool` | ✓ | ✓ | ✓ | ✗ | ✓ |
| `after-tool` | ✗ | ✗ | ✗ | ✓ | ✗ |

## Success Criteria

- [ ] Behavior enum compiles and is used consistently
- [ ] Rule Pack interface is clean and extensible
- [ ] Harness Capabilities model reflects real limitations
- [ ] vitest runs and passes for type tests
- [ ] Zero dependencies in core package

## Dependencies

None - this is the foundational change.

## Risks

- **Risk**: Over-engineering types upfront
  - **Mitigation**: Start with minimal interfaces, extend as needed
- **Risk**: Harness Capabilities change over time
  - **Mitigation**: Model is easy to update, test with real Harnesses
