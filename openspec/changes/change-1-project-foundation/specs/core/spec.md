# Delta for Project Foundation

## ADDED Requirements

### Requirement: Behavior Enum
The system MUST define a TypeScript enum for guardrail behaviors.

#### Scenario: Behavior types
- WHEN the behavior enum is defined
- THEN it MUST contain:
  - `block` - Stop tool call, no alternative
  - `suggest` - Stop tool call, suggest safer alternative to LLM
  - `run` - Stop tool call, execute safer alternative in hook
  - `redact` - Allow tool call, sanitize output before LLM sees it
  - `confirm` - Ask user (native UI or fallback to suggest)

### Requirement: Guardrail Rule Interface
The system MUST define a TypeScript interface for guardrail rules.

#### Scenario: Rule structure
- WHEN a guardrail rule is defined
- THEN it MUST have:
  - `id: string` - Unique identifier (e.g., `sops.decrypt`, `git.reset-hard`)
  - `title: string` - Human-readable name
  - `description: string` - What the rule detects
  - `phase: "before-tool" | "after-tool"` - When the rule fires
  - `match: GuardrailMatcher` - How to detect the condition
  - `defaultAction: GuardrailAction` - Default behavior

### Requirement: Guardrail Action Types
The system MUST define TypeScript types for guardrail actions.

#### Scenario: Action types
- WHEN a guardrail action is defined
- THEN it MUST be one of:
  - `{ type: "allow" }` - Allow without modification
  - `{ type: "block"; message: string }` - Block with explanation
  - `{ type: "suggest"; replacement: string | string[]; message?: string }` - Block + suggest alternative(s)
  - `{ type: "run"; replacement: string | string[]; message?: string }` - Block + execute alternative, optional message shown to user
  - `{ type: "redact"; replacement: string }` - Allow + sanitize output
  - `{ type: "confirm"; message: string; fallback?: GuardrailAction }` - Ask user

#### Scenario: Multiple replacements
- WHEN a suggest or run action has `replacement: string[]`
- THEN the first element is the primary recommendation
- AND subsequent elements are alternative approaches
- AND the harness selects the most appropriate based on context

#### Scenario: Run with message
- WHEN a run action has a `message` field
- THEN the message MUST be shown to the user/agent before or during execution
- AND the message SHOULD explain what the safe alternative does

### Requirement: Rule Pack Interface
The system MUST define a TypeScript interface for rule packs.

#### Scenario: Rule pack structure
- WHEN a rule pack is defined
- THEN it MUST have:
  - `id: string` - Unique identifier (e.g., `env`, `sops`, `git`)
  - `name: string` - Human-readable name
  - `description: string` - What the pack covers
  - `rules: GuardrailRule[]` - Rules in the pack

### Requirement: Harness Capabilities
The system MUST define a TypeScript interface for harness capabilities.

#### Scenario: Capability model
- WHEN harness capabilities are defined
- THEN it MUST have:
  - `block: boolean` - Can block tool calls (all harnesses: true)
  - `suggest: boolean` - Can suggest alternatives (all harnesses: true)
  - `run: boolean` - Can execute replacement commands (opencode, Pi only)
  - `redact: boolean` - Can modify tool output (opencode, Pi only)
  - `confirm: boolean` - Has native confirmation UI (Pi, Codex only)

### Requirement: Built-in Harness Capabilities
The system MUST define capabilities for supported harnesses.

#### Scenario: opencode capabilities
- WHEN opencode capabilities are queried
- THEN it MUST return: `{ block: true, suggest: true, run: true, redact: true, confirm: false }`

#### Scenario: Pi capabilities
- WHEN Pi capabilities are queried
- THEN it MUST return: `{ block: true, suggest: true, run: true, redact: true, confirm: true }`

#### Scenario: Claude Code capabilities
- WHEN Claude Code capabilities are queried
- THEN it MUST return: `{ block: true, suggest: true, run: false, redact: false, confirm: false }`

#### Scenario: Codex capabilities
- WHEN Codex capabilities are queried
- THEN it MUST return: `{ block: true, suggest: true, run: false, redact: false, confirm: true }`

### Requirement: Zero Dependencies
The core module MUST have zero external dependencies.

#### Scenario: Dependency policy
- WHEN the core module package is checked
- THEN `dependencies` in package.json MUST be empty
- AND only `devDependencies` for testing are allowed
