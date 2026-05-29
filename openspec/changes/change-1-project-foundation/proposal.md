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

Create a single package with internal layered structure:
1. Core types (`src/core/`) — Behavior enum, Rule types, interfaces
2. Matcher layer (`src/matcher/`) — GuardrailMatcher evaluation with matcher registry
3. Resolver layer (`src/resolver/`) — Action resolution with fallback chain
4. Engine layer (`src/engine/`) — orchestrator composing matcher + resolver
5. Harness Capability model
6. Test infrastructure with vitest
7. Infrastructure layer (`src/infrastructure/`) — config-loader, yaml-pack-loader

See `openspec/future-architecture-decisions.md` for post-MVP package split triggers.

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
- Redaction logic (covered in `change-10-redact-output`)
- Platform Adapters (covered in `change-3-opencode-adapter`, `change-4-pi-adapter`)

## Approach

1. Create monorepo structure with npm workspaces
2. Define Behavior enum and Rule types in `src/types.ts`
3. Define GuardrailMatcher discriminated union (bash-command, file-path, predicate) in core
4. Define ToolCallContext discriminated union (on toolName) in core
5. Define Rule Pack interface in `src/rule-pack.ts`
6. Define Harness Capabilities in `src/harness.ts`
7. Create engine (`src/engine/`) package with `matchAndResolve()`
8. Set up vitest for deterministic unit tests

## Key Design Decisions

### Behavior Model
```typescript
type GuardrailBehavior = "block" | "suggest" | "run" | "redact" | "confirm";
```

- **block**: Stop Tool Call, no alternative. Works in all Harnesses, all Phases.
- **suggest**: Stop Tool Call, provide **Replacement** to LLM. Works in all Harnesses, before-tool Phase only.
- **run**: Stop Tool Call, execute **Replacement** in hook, return redacted Output. Requires shell execution Capability.
- **redact**: Allow Tool Call, redact Output before LLM sees it. Works in after-tool Phase only.
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
suggest (no **Replacement** found) → **Block Action** (generic contextual message)
```

When a Harness lacks the required Capability, the engine walks the chain. When `suggest` cannot find a **Replacement**, it falls back to `block` with the generic message: `"Blocked: \`{matched}\` — no Replacement available."`

### GuardrailMatcher Type and Matcher Registry

```typescript
type GuardrailMatcher =
  | { type: "bash-command"; pattern: RegExp }
  | { type: "file-path"; pattern: RegExp }
  | { type: "predicate"; test: (ctx: ToolCallContext) => boolean };
```

**Matcher Registry Pattern (OCP-compliant):**

Rather than a closed discriminated union handled by an exhaustive switch in the engine, matchers are registered in a registry:

```typescript
interface MatcherHandler<T extends string = string> {
  type: T;
  matches(matcher: MatcherOf<T>, ctx: ToolCallContext): boolean;
}

class MatcherRegistry {
  private handlers = new Map<string, MatcherHandler>();

  register(handler: MatcherHandler): void { ... }
  evaluate(matcher: GuardrailMatcher, ctx: ToolCallContext): boolean { ... }
}
```

Built-in handlers: `bash-command`, `file-path`, `predicate`.
New matcher types are registered without modifying core's switch statement — they call `registry.register()` at load time.
The engine iterates the registry instead of a hardcoded switch, satisfying the Open/Closed Principle.

### ToolCallContext Type
```typescript
type ToolCallContext =
  | { toolName: "bash"; command: string; filePath?: string }
  | { toolName: "read"; filePath: string }
  | { toolName: "write"; filePath: string }
  | { toolName: string; command?: string; filePath?: string };
```

Discriminated union on `toolName`. The compiler enforces required fields per variant.

### Engine Composition

The engine composes the matcher and resolver layers:
```typescript
function matchAndResolve(
  ctx: ToolCallContext,
  packs: RulePack[],
  caps: HarnessCapabilities
): GuardrailAction | null
```

Internally, the engine:
1. Iterates rules across all loaded packs
2. Evaluates each rule's matcher via the matcher registry
3. Resolves the matched action via the resolver (fallback chain, capability check)
4. Returns the final resolved action

Internally the engine produces domain events (`RuleMatchedEvent`, `FallbackTriggeredEvent`) but the public API (`matchAndResolve`) only returns the final action. Events are consumed internally for future observability (see `openspec/future-architecture-decisions.md`).

Adapters are thin shims: normalize Harness event → ToolCallContext, call `matchAndResolve`, translate result to Harness-specific block mechanism.

### Rule Pack Interface with Aggregate Validation

```typescript
interface RulePack {
  id: string;
  name: string;
  description: string;
  rules: GuardrailRule[];
}
```

Built-in Rule Packs: `env`, `sops`, `private-key`, `secret-managers`, `encryption-tools`, `kubernetes`, `direnv`, `gh-cli`, `hardening`

**Aggregate Validation:**

Rule packs are validated on load via pure functions:

```typescript
function validateRulePack(pack: RulePack): ValidationResult {
  // No duplicate rule IDs within a pack
  // Each rule's phase is compatible with its matcher type
  //   (bash-command/file-path only make sense for before-tool)
  // Each rule's action is compatible with its phase
  //   (after-tool can only use redact)
}

function validateRule(rule: GuardrailRule): ValidationResult {
  // Phase-Behavior Matrix is enforced at rule level
  // Action fields are complete for their type
}
```

Validation runs when built-in packs are loaded and when user-provided YAML packs are parsed. Invalid packs fail fast with descriptive error messages.

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
- [ ] MatcherRegistry registers built-in handlers and evaluates matchers correctly
- [ ] ToolCallContext discriminated union compiles with strict per-variant fields
- [ ] Rule Pack interface is clean and extensible
- [ ] `validateRulePack()` and `validateRule()` catch invalid combinations with clear errors
- [ ] Harness Capabilities model reflects real limitations
- [ ] Engine `matchAndResolve()` resolves Actions with fallback chain
- [ ] Engine produces internal domain events (not exposed in public API)
- [ ] Message templates interpolate `{matched}` correctly
- [ ] Internal structure follows `core/ → matcher/ → resolver/ → engine/` layering
- [ ] Infrastructure layer contains `config-loader.ts` and `yaml-pack-loader.ts`
- [ ] vitest runs and passes for type tests
- [ ] Zero dependencies in core subdirectory (yaml dependency lives in infrastructure)

## Dependencies

None - this is the foundational change.

## Multi-Layer Matching Strategy

The engine uses a risk-escalation model with three matching layers. See [docs/matching-strategy.md](../../docs/matching-strategy.md) for full details.

| Layer | Mechanism | Purpose |
|-------|-----------|--------|
| 1 | Substring pre-filter | Fast O(n) screening for risky keyword pairs |
| 2 | Structural regex | Precise command structure matching |
| 3 | Adversarial wrapper detection | Detects eval, bash -c, $(), subshells |

**Risk escalation:** When Layer 3 detects wrappers AND Layer 1 detects risky keywords, the command is blocked with a nonOverridable **Block Action** regardless of configuration. Standard matches (Layer 1+2, no wrappers) use the configured behavior.

This replaces the previous "regex-only" approach documented in earlier spec versions. The three-layer model is implemented as additional `hardening` rule pack rules, requiring no engine changes beyond the matcher registry.

## Risks

- **Risk**: Over-engineering types upfront
  - **Mitigation**: Start with minimal interfaces, extend as needed
- **Risk**: Harness Capabilities change over time
  - **Mitigation**: Model is easy to update, test with real Harnesses
- **Risk**: Regex-based matchers are bypassable via command composition (redirects, string concatenation, alternative tools)
  - **Mitigation**: Three-layer matching strategy (substring + regex + wrapper detection) catches most evasion. `redact` Behavior (change-10) is the backstop. Shell tokenizer post-MVP for comprehensive structural analysis.
- **Risk**: Layer 3 wrapper detection causes false positives on legitimate eval usage
  - **Mitigation**: eval/bash-c in a coding agent context is rare; users can configure the hardening pack per-rule. A nonOverridable **Block Action** is a safe default.
