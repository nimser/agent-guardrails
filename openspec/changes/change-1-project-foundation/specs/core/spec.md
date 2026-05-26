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
  - `{ type: "suggest"; replacement: string | string[]; message?: string }` - Block + suggest Replacement(s)
  - `{ type: "run"; replacement: string | string[]; message?: string }` - Block + execute Replacement, optional Message shown to user
  - `{ type: "redact"; replacement: string }` - Allow + sanitize Output
  - `{ type: "confirm"; message: string; fallback?: GuardrailAction }` - Ask user with Fallback

#### Scenario: Multiple replacements
- WHEN a suggest or run Action has `replacement: string[]`
- THEN the first element is the primary recommendation (highest Confidence)
- AND subsequent elements are alternative approaches
- AND the Harness selects the most appropriate based on context

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

### Requirement: Zero Dependencies
The core module MUST have zero external dependencies.

#### Scenario: Dependency policy
- WHEN the core module package is checked
- THEN `dependencies` in package.json MUST be empty
- AND only `devDependencies` for testing are allowed
