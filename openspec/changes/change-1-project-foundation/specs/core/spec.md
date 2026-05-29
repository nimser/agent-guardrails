# Delta for Project Foundation

> **TDD**: See `.agents/skills/tdd/SKILL.md`. Every requirement below MUST be
> implemented via RED→GREEN→REFACTOR vertical slices. Write one failing test,
> then minimal code to pass, then refactor. Never write all tests first.

## ADDED Requirements

### Requirement: Behavior Enum
The system MUST define a TypeScript type for guardrail Behaviors.

#### Scenario: Behavior types
- WHEN the Behavior type is defined
- THEN it MUST contain:
  - `block` - Stop Tool Call, no alternative. Works in all Harnesses, all Phases.
  - `suggest` - Stop Tool Call, suggest safer alternative to LLM. Works in all Harnesses, before-tool Phase only.
  - `run` - Stop Tool Call, execute safer alternative in hook, return sanitized Output. Requires shell execution Capability.
  - `redact` - Allow Tool Call, sanitize Output before LLM sees it. Works in after-tool Phase only.
  - `confirm` - Ask user (native UI or Fallback to suggest).

#### Scenario: Phase-Behavior Matrix
- WHEN Behaviors are defined
- THEN the following Phase constraints MUST apply:
  - `before-tool` Phase: block, suggest, run, confirm are available
  - `after-tool` Phase: only redact is available

### Requirement: GuardrailMatcher Type
The system MUST define a discriminated union type for Guardrail Matchers.

#### Scenario: Matcher types
- WHEN the GuardrailMatcher type is defined
- THEN it MUST be a discriminated union on `type`:
  - `{ type: "bash-command"; pattern: RegExp }` — Matches against bash command strings
  - `{ type: "file-path"; pattern: RegExp }` — Matches against file path strings
  - `{ type: "predicate"; predicateName: string }` — References a registered predicate function by name (used by YAML rule packs)
- AND each rule's `match` field MUST be a single `GuardrailMatcher` (not an array)
- AND rules needing multiple match conditions MUST be split into separate rules

> **Design note**: The `predicate` type uses a `predicateName: string` reference
> (not a function pointer) so that rule packs can be fully serialized to/from YAML.
> Predicate functions are registered separately in TypeScript via the
> PredicateRegistry, and `yaml-pack-loader.ts` resolves names to functions at
> load time.

### Requirement: Predicate Registry
The system MUST provide a registry for predicate functions referenced by name in YAML rule packs.

#### Scenario: Registry API
- WHEN the PredicateRegistry is used
- THEN it MUST provide `register(name: string, fn: (ctx: ToolCallContext) => boolean): void`
- AND it MUST provide `resolve(name: string): ((ctx: ToolCallContext) => boolean) | undefined`
- AND it MUST provide `clear(): void` for test isolation

#### Scenario: YAML pack loading with predicates
- WHEN `yaml-pack-loader.ts` loads a YAML rule pack containing a `predicate` matcher
- THEN it MUST look up `predicateName` in the PredicateRegistry
- AND convert it to a runtime `GuardrailMatcher` with the function attached
- AND throw a clear error if the predicate name is not registered

#### Scenario: Built-in predicate registration
- WHEN the system bootstraps
- THEN it MUST register all built-in predicates before loading built-in YAML rule packs
- AND built-in predicates (e.g., `ssh-private-key`) MUST be defined in `src/packs/predicates.ts`

### Requirement: Matcher Registry
The system MUST provide a matcher registry with explicit initialization for evaluating GuardrailMatchers against ToolCallContexts. The registry is the **evaluation mechanism** (OCP-compliant), while the `GuardrailMatcher` discriminated union is the **type contract** (compiler-checked).

#### Scenario: Registry structure
- WHEN the matcher registry is implemented
- THEN it MUST provide `register(handler: MatcherHandler): void`
- AND it MUST provide `evaluate(matcher: GuardrailMatcher, ctx: ToolCallContext): boolean`
- AND it MUST provide `clear(): void` for test isolation
- AND it MUST reject duplicate type registrations (error or override)

#### Scenario: MatcherHandler interface
- WHEN a matcher handler is defined
- THEN it MUST implement:
  ```typescript
  interface MatcherHandler<T extends string = string> {
    type: T;
    matches(matcher: Extract<GuardrailMatcher, { type: T }>, ctx: ToolCallContext): boolean;
  }
  ```
- AND the `matches` method MUST evaluate the matcher against the context

#### Scenario: Explicit initialization lifecycle
- WHEN adapters bootstrap the system
- THEN they MUST call `initializeMatcherRegistry()` exactly once before handling tool calls
- AND the initialization function MUST register all built-in handlers:
  - `bash-command` handler
  - `file-path` handler
  - `predicate` handler
- AND the initialization MUST NOT use module-level side effects

#### Scenario: Test isolation
- WHEN tests require a subset of matchers
- THEN they MUST create a fresh registry instance or call `registry.clear()` first
- AND they MUST register only the matchers needed for the test
- AND they MUST NOT rely on global registry state between tests

### Requirement: ToolCallContext Type
The system MUST define a discriminated union type for tool call context.

#### Scenario: ToolCallContext structure
- WHEN a ToolCallContext is created
- THEN it MUST be a discriminated union on `toolName`:
  - `{ toolName: "bash"; command: string; filePath?: string }`
  - `{ toolName: "read"; filePath: string }`
  - `{ toolName: "write"; filePath: string }`
  - `{ toolName: string; command?: string; filePath?: string }` (catch-all for unknown tools)
- AND the compiler MUST enforce required fields per variant

### Requirement: Guardrail Rule Interface
The system MUST define a TypeScript interface for guardrail Rules.

#### Scenario: Rule structure
- WHEN a Guardrail Rule is defined
- THEN it MUST have:
  - `id: string` — Stable Rule ID (e.g., `sops.decrypt`)
  - `title: string` — Human-readable name
  - `description: string` — What the Rule matches
  - `phase: "before-tool" | "after-tool"` — Phase when the Rule fires
  - `match: GuardrailMatcher` — Single GuardrailMatcher (not array; use separate rules for OR conditions)
  - `defaultAction: GuardrailAction` — Default Action

### Requirement: Guardrail Action Types
The system MUST define TypeScript types for guardrail Actions.

#### Scenario: Action types
- WHEN a Guardrail Action is defined
- THEN it MUST be one of:
  - `{ type: "allow" }`
  - `{ type: "block"; message: string }`
  - `{ type: "suggest"; replacement: string; message?: string }`
  - `{ type: "run"; replacement: string; message?: string }`
  - `{ type: "redact"; replacement: string }`
  - `{ type: "confirm"; message: string; fallback?: GuardrailAction }`

#### Scenario: Message templates
- WHEN a Guardrail Action has a `message` field
- THEN the message MUST support `{matched}` placeholder
- AND the engine MUST interpolate `{matched}` with the actual matched value at match time
- AND `{matched}` MUST be available for all Action types (block, suggest, run, confirm)

### Requirement: Rule Pack Interface
The system MUST define a TypeScript interface for Rule Packs.

#### Scenario: Rule Pack structure
- WHEN a Rule Pack is defined
- THEN it MUST have:
  - `id: string`
  - `name: string`
  - `description: string`
  - `rules: GuardrailRule[]`

### Requirement: Rule Pack Format (YAML for built-in and user packs)

> **Design Decision 16 (authoritative)**: All rule packs — both built-in and
> user-provided — are defined as **YAML files** and loaded via
> `src/infrastructure/yaml-pack-loader.ts`. This lowers the contribution
> barrier (no TypeScript knowledge required), enables a community rule pack
> ecosystem, and ensures consistency between built-in and custom packs.
> See `docs/yaml-rule-packs.md` for the full YAML schema.

#### Scenario: Built-in pack format
- WHEN a built-in rule pack is shipped with Agent Guardrails
- THEN it MUST be a `.yaml` file in `src/packs/`
- AND it MUST conform to the YAML rule pack schema
- AND it MUST be loaded via `yaml-pack-loader.ts` at bootstrap

#### Scenario: User-provided pack format
- WHEN a user provides custom rule packs in `.agent-guardrails/packs/`
- THEN they MUST also be `.yaml` files
- AND they MUST be loaded via the same `yaml-pack-loader.ts`

#### Scenario: Predicate matchers in YAML packs
- WHEN a YAML rule pack needs a `predicate` matcher (e.g., SSH directory heuristic)
- THEN the YAML `match` block MUST use `type: predicate` with `predicateName: <name>`
- AND the named predicate function MUST be registered in `src/packs/predicates.ts`
- AND `yaml-pack-loader.ts` MUST resolve the name to the function at load time
- AND an unregistered predicate name MUST produce a clear error at load time

### Requirement: Harness Capabilities
The system MUST define a TypeScript interface for Harness Capabilities.

#### Scenario: Capability model
- WHEN Harness Capabilities are defined
- THEN it MUST have:
  - `block: boolean`
  - `suggest: boolean`
  - `run: boolean`
  - `redact: boolean`
  - `confirm: boolean`

### Requirement: Built-in Harness Capabilities

#### Scenario: opencode Capabilities
- WHEN opencode Capabilities are queried
- THEN it MUST return: `{ block: true, suggest: true, run: true, redact: true, confirm: false }`

#### Scenario: Pi Capabilities
- WHEN Pi Capabilities are queried
- THEN it MUST return: `{ block: true, suggest: true, run: true, redact: true, confirm: true }`

#### Scenario: Claude Code Capabilities
- WHEN Claude Code Capabilities are queried
- THEN it MUST return: `{ block: true, suggest: true, run: false, redact: false, confirm: false }`

#### Scenario: Codex Capabilities
- WHEN Codex Capabilities are queried
- THEN it MUST return: `{ block: true, suggest: true, run: false, redact: false, confirm: true }`

### Requirement: Action Fallback Chain
The system MUST define a formalized fallback chain for resolving Actions.

#### Scenario: Fallback chain definition
- WHEN the fallback chain is defined
- THEN it MUST follow this order:
  - `run` → `suggest` → `block`
  - `confirm` → `suggest`
  - `suggest` (when `findSaferCommand` returns null, per change-5) → `block`

#### Scenario: resolveAction function
- WHEN the engine calls `resolveAction(action, capabilities, matchContext)`
- THEN it MUST walk the fallback chain if the Harness lacks the required Capability
- AND if `suggest` cannot find a safer command, it MUST fall back to `block`
- AND the fallback message MUST be: `"Blocked: \`{matched}\` — no safer alternative available."`

### Requirement: Engine Package
The system MUST provide an engine (`src/engine/`) package that centralizes matching and Action resolution.

#### Scenario: Engine composition
- WHEN the engine package is created
- THEN it MUST export `matchAndResolve(ctx: ToolCallContext, packs: RulePack[], caps: HarnessCapabilities): GuardrailAction | null`
- AND it MUST compose extracted modules: `splitCommands`, `resolveAction`, `StatsTracker`
- AND it MUST evaluate matchers via the MatcherRegistry
- AND Adapters MUST use the engine, not implement their own matching

#### Scenario: Tool-type early exit
- WHEN `matchAndResolve` receives a ToolCallContext with no `command` and no `filePath`
- THEN it MUST return `null` immediately without iterating rules

### Requirement: Zero Dependencies in Core
The `src/core/` directory MUST have zero external npm dependencies.

#### Scenario: Dependency policy
- WHEN `src/core/` is checked
- THEN its modules MUST NOT import any npm packages
- AND the `yaml` npm package (used by `yaml-pack-loader.ts`) MUST live in `src/infrastructure/`

### Requirement: Infrastructure Layer

#### Scenario: yaml-pack-loader
- WHEN `yaml-pack-loader.ts` is implemented
- THEN it MUST live in `src/infrastructure/`
- AND it MUST load YAML rule packs from a given directory or list of files
- AND it MUST resolve `predicate` matcher names via the PredicateRegistry
- AND it MUST run `validateRulePack()` on each loaded pack (fail fast)
