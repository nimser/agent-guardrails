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
3. Define GuardrailMatcher discriminated union (bash-command, file-path, predicate) in core
4. Define ToolCallContext discriminated union (on toolName) in core
5. Define Rule Pack interface in `src/rule-pack.ts`
6. Define Harness Capabilities in `src/harness.ts`
7. Create `@agent-guardrails/engine` package with `matchAndResolve()`
8. Set up vitest for deterministic unit tests

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
  | { type: "suggest"; replacement: string; message?: string }
  | { type: "run"; replacement: string; message?: string }
  | { type: "redact"; replacement: string }
  | { type: "confirm"; message: string; fallback?: GuardrailAction };
```

Note: Messages support `{matched}` template placeholder, interpolated by the engine with the actual matched value (file path or command). `suggest` and `run` carry a single Replacement string.

### Action Fallback Chain

The engine resolves Actions via a formalized fallback chain:
```
run → suggest → block
confirm → suggest
suggest (no safer command found) → block (generic contextual message)
```

When a Harness lacks the required Capability, the engine walks the chain. When `suggest` cannot find a safer command, it falls back to `block` with the generic message: `"Blocked: \`{matched}\` — no safer alternative available."`

### GuardrailMatcher Type
```typescript
type GuardrailMatcher =
  | { type: "bash-command"; pattern: RegExp }
  | { type: "file-path"; pattern: RegExp }
  | { type: "predicate"; test: (ctx: ToolCallContext) => boolean };
```

Core owns the full discriminated union. Adding a new matcher type is a core change that forces engine updates.

### ToolCallContext Type
```typescript
type ToolCallContext =
  | { toolName: "bash"; command: string; filePath?: string }
  | { toolName: "read"; filePath: string }
  | { toolName: "write"; filePath: string }
  | { toolName: string; command?: string; filePath?: string };
```

Discriminated union on `toolName`. The compiler enforces required fields per variant.

### Engine Package

`@agent-guardrails/engine` centralizes matching and Action resolution:
```typescript
function matchAndResolve(
  ctx: ToolCallContext,
  packs: RulePack[],
  caps: HarnessCapabilities
): GuardrailAction | null
```

Adapters are thin shims: normalize Harness event → ToolCallContext, call `matchAndResolve`, translate result to Harness-specific block mechanism.

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
- [ ] GuardrailMatcher discriminated union compiles (bash-command, file-path, predicate)
- [ ] ToolCallContext discriminated union compiles with strict per-variant fields
- [ ] Rule Pack interface is clean and extensible
- [ ] Harness Capabilities model reflects real limitations
- [ ] Engine `matchAndResolve()` resolves Actions with fallback chain
- [ ] Message templates interpolate `{matched}` correctly
- [ ] vitest runs and passes for type tests
- [ ] Zero dependencies in core package

## Dependencies

None - this is the foundational change.

## Risks

- **Risk**: Over-engineering types upfront
  - **Mitigation**: Start with minimal interfaces, extend as needed
- **Risk**: Harness Capabilities change over time
  - **Mitigation**: Model is easy to update, test with real Harnesses
- **Risk**: Regex-based matchers are bypassable via command composition (redirects, string concatenation, alternative tools)
  - **Mitigation**: Regex is best-effort first layer; `redact` Behavior (change-9) is the backstop. Shell tokenizer post-POC for more robust matching.
