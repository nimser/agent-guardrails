## ADDED Requirements

### Requirement: Configuration File Schema
The system MUST define a schema for configuration files.

#### Scenario: Configuration file structure
- **WHEN** a configuration file is created
- **THEN** it MUST have the following structure:
  - `secrets: { enabled: boolean, rules: Record<string, string>, customRules: SecretRule[] }`
  - `git: { enabled: boolean, rules: Record<string, string> }`
  - `mode: "block" | "warn" | "off"`

### Requirement: Project Configuration
The system MUST read configuration from project root.

#### Scenario: Project config location
- **WHEN** the system loads configuration
- **THEN** it MUST check for `agent-guardrails.json` in project root

### Requirement: Global Configuration
The system MUST read configuration from global location.

#### Scenario: Global config location
- **WHEN** the system loads configuration
- **THEN** it MUST check for `~/.config/agent-guardrails.json`

### Requirement: Configuration Precedence
The system MUST merge configurations with proper precedence.

#### Scenario: Config precedence
- **WHEN** multiple configuration sources exist
- **THEN** precedence MUST be:
  1. Project config (highest priority)
  2. Global config
  3. Built-in defaults (lowest priority)

### Requirement: Rule Actions
The system MUST support different rule actions.

#### Scenario: Rule Action types
- **WHEN** a Rule Action is specified as a Configured Action
- **THEN** it MUST be one of:
  - `block` - Hard block, no alternative suggested
  - `suggest` - Block + suggest safer alternative (Replacement)
  - `warn` - Allow but warn
  - `off` - Rule disabled
- **AND** it MUST override the Default Action for that Rule ID

### Requirement: Custom Rules
The system MUST support custom Rules via configuration.

#### Scenario: Custom secret Rules
- **WHEN** configuration contains `customRules` array
- **THEN** custom Rules MUST be merged with built-in Rules

#### Scenario: Custom Rule structure
- **WHEN** a custom Rule is defined
- **THEN** it MUST have:
  - `name: string` - Unique identifier (Rule ID)
  - `pattern: string` - Regex pattern (as string, used in Guardrail Matcher)
  - `description: string` - Human-readable description
  - `severity: "critical" | "high" | "medium"` - Severity level

### Requirement: Configuration Validation
The system MUST validate configuration files.

#### Scenario: Valid configuration
- **WHEN** a valid configuration file is loaded
- **THEN** it MUST be parsed without errors

#### Scenario: Invalid configuration
- **WHEN** an invalid configuration file is loaded
- **THEN** it MUST be rejected with clear error message

### Requirement: Init Command
The system MUST provide a command to generate default configuration.

#### Scenario: Generate default config
- **WHEN** `npx ag init` is executed
- **THEN** it MUST generate `agent-guardrails.json` with sensible defaults

### Requirement: Configuration Merging
The system MUST merge configurations correctly.

#### Scenario: Merge rules
- **WHEN** merging rule configurations
- **THEN** rules from higher priority config MUST override lower priority

#### Scenario: Merge custom rules
- **WHEN** merging custom rules
- **THEN** custom rules from all sources MUST be combined
