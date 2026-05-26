## ADDED Requirements

### Requirement: matchAndResolve Function
The system MUST provide a `matchAndResolve()` function in `@agent-guardrails/engine` that evaluates a `ToolCallContext` against Rule Packs and returns the effective Guardrail Action.

#### Scenario: Function signature
- **WHEN** `matchAndResolve(ctx, packs, capabilities)` is called
- **THEN** it MUST accept:
  - `ctx: ToolCallContext` — the normalized tool call context from an Adapter
  - `packs: RulePack[]` — the Rule Packs to evaluate against
  - `capabilities: HarnessCapabilities` — the Harness capabilities for fallback resolution
- **AND** it MUST return `GuardrailAction | null`
  - `null` means no rules matched, tool call is allowed
  - non-null is the effective action after fallback resolution

#### Scenario: No matching rules
- **WHEN** no rule in any pack matches the `ToolCallContext`
- **THEN** the function MUST return `null`

#### Scenario: Matching rule with supported action
- **WHEN** a rule matches and its action is supported by the Harness capabilities
- **THEN** the function MUST return that action with `{matched}` template interpolated

#### Scenario: Matching rule with unsupported action
- **WHEN** a rule matches but its action is not supported by the Harness
- **THEN** the function MUST walk the fallback chain (`run → suggest → block`, `confirm → suggest`)
- **AND** return the first action in the chain that IS supported

#### Scenario: suggest with no safer command
- **WHEN** a rule matches with a `suggest` action but `findSaferCommand()` returns `null`
- **THEN** the function MUST fall back to `block`
- **AND** use the generic fallback message with `{matched}` interpolated

### Requirement: Tool-Type Early Exit
The system's `matchAndResolve()` function MUST skip rule evaluation entirely when the `ToolCallContext` has no fields that any active matcher type can evaluate against.

#### Scenario: Tool with no matchable fields
- **WHEN** a tool call produces a `ToolCallContext` with no `command` and no `filePath` (e.g., a `search` tool that only returns text)
- **THEN** `matchAndResolve()` MUST return `null` immediately without iterating rules
- **AND** the tool call MUST be allowed through

#### Scenario: Tool with only filePath
- **WHEN** a tool call produces a `ToolCallContext` with `filePath` but no `command` (e.g., `read` tool)
- **THEN** `matchAndResolve()` MUST evaluate only rules with `file-path` matchers
- **AND** rules with `bash-command` matchers MUST be skipped

#### Scenario: Tool with only command
- **WHEN** a tool call produces a `ToolCallContext` with `command` but no `filePath` (e.g., `bash` tool)
- **THEN** `matchAndResolve()` MUST evaluate only rules with `bash-command` matchers
- **AND** rules with `file-path` matchers MUST be skipped

#### Scenario: Tool with both fields
- **WHEN** a tool call produces a `ToolCallContext` with both `command` and `filePath`
- **THEN** `matchAndResolve()` MUST evaluate all matcher types
