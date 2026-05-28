# Delta for Project Foundation

## ADDED Requirements

### Requirement: Behavior Enum
The system MUST define a TypeScript enum for guardrail Behaviors.

#### Scenario: Behavior types
- WHEN the Behavior enum is defined
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
The system MUST define a discriminated union type for Guardrail Matchers. Core owns this type and all matcher variants.

#### Scenario: Matcher types
- WHEN the GuardrailMatcher type is defined
- THEN it MUST be a discriminated union on `type`:
  - `{ type: "bash-command"; pattern: RegExp }` - Matches against bash command strings
  - `{ type: "file-path"; pattern: RegExp }` - Matches against file path strings
  - `{ type: "predicate"; test: (ctx: ToolCallContext) => boolean }` - Function-based matcher for complex logic
- AND adding a new matcher type MUST be a core change that forces updates to the engine
- AND the engine MUST exhaustively handle all matcher variants (compiler-checked)

### Requirement: Matcher Registry
The system MUST provide a matcher registry that enables Open/Closed Principle (OCP) compliance for matcher types.

#### Scenario: Registry structure
- WHEN the matcher registry is implemented
- THEN it MUST provide a `register(handler: MatcherHandler): void` method
- AND it MUST provide a `matches(matcher: GuardrailMatcher, ctx: ToolCallContext): boolean` method
- AND it MUST provide a `clear(): void` method for test isolation
- AND it MUST reject duplicate type registrations (error or override)

#### Scenario: MatcherHandler interface
- WHEN a matcher handler is defined
- THEN it MUST implement:
  ```typescript
  interface MatcherHandler<T extends string = string> {
    type: T;
    matches(matcher: MatcherOf<T>, ctx: ToolCallContext): boolean;
  }
  ```
- AND the `matches` method MUST evaluate the matcher against the context
- AND TypeScript exhaustiveness checks MUST be enforced at compile time

#### Scenario: Explicit initialization lifecycle
- WHEN adapters bootstrap the system
- THEN they MUST call `initializeMatcherRegistry()` exactly once before handling tool calls
- AND the initialization function MUST register all built-in matchers:
  - `bash-command` handler
  - `file-path` handler
  - `predicate` handler
- AND the initialization MUST NOT use module-level side effects
- AND the initialization function signature MUST be:
  ```typescript
  export function initializeMatcherRegistry(): void;
  ```

#### Scenario: Test isolation
- WHEN tests require a subset of matchers
- THEN they MUST create a fresh registry instance
- AND they MUST register only the matchers needed for the test
- AND they MUST NOT rely on global registry state between tests
- AND test setup MUST call `registry.clear()` if reusing a shared instance

#### Scenario: Adding new matcher types
- WHEN a new matcher type is added (e.g., `shell-ast`)
- THEN a new handler file MUST be created in `src/matchers/`
- AND the handler MUST be imported into `src/matchers/registry-setup.ts`
- AND the handler MUST be registered in `initializeMatcherRegistry()`
- AND the matcher type MUST be added to the `GuardrailMatcher` discriminated union
- AND TypeScript compiler MUST enforce exhaustiveness in all switch statements

### Requirement: ToolCallContext Type
The system MUST define a discriminated union type for tool call context, used by the engine to evaluate Matchers.

#### Scenario: ToolCallContext structure
- WHEN a ToolCallContext is created
- THEN it MUST be a discriminated union on `toolName`:
  - `{ toolName: "bash"; command: string; filePath?: string }`
  - `{ toolName: "read"; filePath: string }`
  - `{ toolName: "write"; filePath: string }`
  - `{ toolName: string; command?: string; filePath?: string }` (catch-all for unknown tools)
- AND the compiler MUST enforce that required fields are present for each toolName variant

### Requirement: Guardrail Rule Interface
The system MUST define a TypeScript interface for guardrail Rules.

#### Scenario: Rule structure
- WHEN a Guardrail Rule is defined
- THEN it MUST have:
  - `id: string` - Stable Rule ID (e.g., `sops.decrypt`, `git.reset-hard`)
  - `title: string` - Human-readable name
  - `description: string` - What the Rule matches
  - `phase: "before-tool" | "after-tool"` - Phase when the Rule fires
  - `match: GuardrailMatcher` - Guardrail Matcher for matching the condition
  - `defaultAction: GuardrailAction` - Default Action

### Requirement: Guardrail Action Types
The system MUST define TypeScript types for guardrail Actions.

#### Scenario: Action types
- WHEN a Guardrail Action is defined
- THEN it MUST be one of:
  - `{ type: "allow" }` - Allow without modification
  - `{ type: "block"; message: string }` - Block with Message
  - `{ type: "suggest"; replacement: string; message?: string }` - Block + suggest single Replacement
  - `{ type: "run"; replacement: string; message?: string }` - Block + execute Replacement, optional Message shown to user
  - `{ type: "redact"; replacement: string }` - Allow + sanitize Output
  - `{ type: "confirm"; message: string; fallback?: GuardrailAction }` - Ask user with Fallback

#### Scenario: Message templates
- WHEN a Guardrail Action has a `message` field
- THEN the message MUST support the `{matched}` placeholder
- AND the engine MUST interpolate `{matched}` with the actual matched value (file path or command) at match time
- AND `{matched}` MUST be available for all Action types (block, suggest, run, confirm)

#### Scenario: Run with message
- WHEN a run Action has a `message` field
- THEN the Message MUST be shown to the user/agent before or during execution
- AND the Message SHOULD explain what the safer alternative does

### Requirement: Rule Pack Interface
The system MUST define a TypeScript interface for Rule Packs.

#### Scenario: Rule Pack structure
- WHEN a Rule Pack is defined
- THEN it MUST have:
  - `id: string` - Unique identifier (e.g., `env`, `sops`, `git`)
  - `name: string` - Human-readable name
  - `description: string` - What the pack covers
  - `rules: GuardrailRule[]` - Rules in the pack

### Requirement: Harness Capabilities
The system MUST define a TypeScript interface for Harness Capabilities.

#### Scenario: Capability model
- WHEN Harness Capabilities are defined
- THEN it MUST have:
  - `block: boolean` - Can block Tool Calls (all Harnesses: true)
  - `suggest: boolean` - Can suggest alternatives (all Harnesses: true)
  - `run: boolean` - Can execute Replacement commands (opencode, Pi only)
  - `redact: boolean` - Can modify Tool Output (opencode, Pi only)
  - `confirm: boolean` - Has native confirmation UI (Pi, Codex only)

### Requirement: Built-in Harness Capabilities
The system MUST define Capabilities for supported Harnesses.

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
The system MUST define a formalized fallback chain for resolving Actions when a Harness lacks the required Capability or when a safer command cannot be found.

#### Scenario: Fallback chain definition
- WHEN the fallback chain is defined
- THEN it MUST follow this order:
  - `run` → `suggest` → `block`
  - `confirm` → `suggest`
  - `suggest` (when `findSaferCommand` returns null) → `block` (with generic contextual message)

#### Scenario: resolveAction function
- WHEN the engine calls `resolveAction(action, capabilities, matchContext)`
- THEN it MUST walk the fallback chain if the Harness lacks the required Capability
- AND if a `suggest` Action cannot find a safer command, it MUST fall back to `block`
- AND the fallback `block` message MUST include `{matched}` interpolation
- AND the fallback `block` message MUST be: `"Blocked: \`{matched}\` — no safer alternative available."`

### Requirement: Engine Package
The system MUST provide a engine (`src/engine/`) package that centralizes matching and Action resolution.

#### Scenario: Engine package structure
- WHEN the engine package is created
- THEN it MUST export a `matchAndResolve(ctx: ToolCallContext, packs: RulePack[], caps: HarnessCapabilities): GuardrailAction | null` function
- AND it MUST evaluate all Matcher types against the appropriate ToolCallContext fields
- AND it MUST apply the Action Fallback Chain when resolving Actions
- AND Adapters MUST use the engine rather than implementing their own matching logic

#### Scenario: Engine matcher evaluation
- WHEN `matchAndResolve` is called with a ToolCallContext
- THEN it MUST iterate all Rules in all Rule Packs
- AND for each Rule, evaluate its GuardrailMatcher against the ToolCallContext:
  - `bash-command` matcher: test `pattern` against `ctx.command` (if present)
  - `file-path` matcher: test `pattern` against `ctx.filePath` (if present)
  - `predicate` matcher: call `test(ctx)`
- AND return the resolved GuardrailAction for the first matching Rule
- AND return `null` if no Rules match

### Requirement: Zero Dependencies
The core module MUST have zero external dependencies.

#### Scenario: Dependency policy
- WHEN the core module package is checked
- THEN `dependencies` in package.json MUST be empty
- AND only `devDependencies` for testing are allowed
