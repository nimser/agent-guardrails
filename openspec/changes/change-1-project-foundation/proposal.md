# Proposal: Project Foundation

## Intent

Establish the shared foundation that defines the behavior model, rule pack interface, and core types for Agent Guardrails. This is the minimal base needed to build the first vertical slice (block behavior in opencode and Pi).

## Problem

Agent Guardrails needs a common foundation that:
- Defines the behavior vocabulary: `block`, `suggest`, `run`, `redact`, `confirm`
- Defines the rule pack interface for extensibility
- Defines harness capability model (which behaviors work where)
- Provides test infrastructure for deterministic code
- Maintains zero external dependencies

## Solution

Create `packages/core/` with:
1. Behavior enum and rule types
2. Rule pack interface for static extension loading
3. Harness capability model
4. Test infrastructure with vitest

## Scope

### In Scope
- `GuardrailBehavior` enum: `block`, `suggest`, `run`, `redact`, `confirm`
- `GuardrailRule` interface with phase (`before-tool`, `after-tool`) and action
- `RulePack` interface for static extension loading
- `HarnessCapabilities` model (which behaviors each harness supports)
- npm workspace setup
- vitest test infrastructure

### Out of Scope
- Actual detection logic (covered in `change-2-secret-blocking`)
- Transform logic (covered in `change-5-command-transforms`)
- Redaction logic (covered in `change-9-redact-output`)
- Platform adapters (covered in `change-3-opencode-adapter`, `change-4-pi-adapter`)

## Approach

1. Create monorepo structure with npm workspaces
2. Define behavior enum and rule types in `src/types.ts`
3. Define rule pack interface in `src/rule-pack.ts`
4. Define harness capabilities in `src/harness.ts`
5. Set up vitest for deterministic unit tests

## Key Design Decisions

### Behavior Model
```typescript
type GuardrailBehavior = "block" | "suggest" | "run" | "redact" | "confirm";
```

- **block**: Stop tool call, no alternative
- **suggest**: Stop tool call, suggest safer alternative to LLM
- **run**: Stop tool call, execute safer alternative in hook, return sanitized output
- **redact**: Allow tool call, sanitize output before LLM sees it
- **confirm**: Ask user (native UI or fallback to suggest)

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

Note: `suggest` and `run` support multiple replacement alternatives. The harness selects the most appropriate based on context.

### Rule Pack Interface
```typescript
interface RulePack {
  id: string;
  name: string;
  description: string;
  rules: GuardrailRule[];
}
```

Built-in packs: `env`, `sops`, `private-key`, `secret-managers`, `encryption-tools`, `kubernetes`, `vault`, `git`

### Harness Capabilities
```typescript
interface HarnessCapabilities {
  block: boolean;      // All harnesses
  suggest: boolean;    // All harnesses
  run: boolean;        // Only opencode, Pi
  redact: boolean;     // Only opencode, Pi
  confirm: boolean;    // Only Pi, Codex (native)
}
```

## Success Criteria

- [ ] Behavior enum compiles and is used consistently
- [ ] Rule pack interface is clean and extensible
- [ ] Harness capabilities model reflects real limitations
- [ ] vitest runs and passes for type tests
- [ ] Zero dependencies in core package

## Dependencies

None - this is the foundational change.

## Risks

- **Risk**: Over-engineering types upfront
  - **Mitigation**: Start with minimal interfaces, extend as needed
- **Risk**: Harness capabilities change over time
  - **Mitigation**: Model is easy to update, test with real harnesses
