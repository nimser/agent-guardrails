## ADDED Requirements

### Requirement: CLI Interface
The system MUST provide a CLI interface for Agent Guardrails management.

#### Scenario: CLI structure
- **WHEN** the CLI is invoked
- **THEN** it MUST support commands:
  - `setup <agent>` - Install for current project
  - `setup --global <agent>` - Install globally
  - `status` - Show installed agents + versions
  - `test` - Run self-test

### Requirement: Setup Command
The system MUST install Agent Guardrails for specified Harnesses.

#### Scenario: Setup opencode
- **WHEN** `npx ag setup opencode` is executed
- **THEN** it MUST:
  - Detect opencode config location (`.opencode/plugins/`)
  - Copy Adapter file
  - Register hook in opencode config
  - Print success message with version

#### Scenario: Setup Pi
- **WHEN** `npx ag setup pi` is executed
- **THEN** it MUST:
  - Detect Pi config location (`.pi/extensions/`)
  - Copy Adapter file
  - Print success message with version

#### Scenario: Setup Codex CLI
- **WHEN** `npx ag setup codex` is executed
- **THEN** it MUST:
  - Detect Codex config location (`.codex/hooks/`)
  - Copy hook script
  - Copy hooks.json
  - Print success message with version

#### Scenario: Setup Claude Code
- **WHEN** `npx ag setup claude-code` is executed
- **THEN** it MUST:
  - Detect Claude Code config location (`.claude/`)
  - Copy hook script
  - Copy settings.json snippet
  - Print success message with version

#### Scenario: Global setup
- **WHEN** `npx ag setup --global <agent>` is executed
- **THEN** it MUST install globally (e.g., `~/.config/agent-guardrails/`)

### Requirement: Status Command
The system MUST report installed Harnesses and versions.

#### Scenario: Show status
- **WHEN** `npx ag status` is executed
- **THEN** it MUST:
  - Check each Harness's config directory
  - Report installed version
  - Show which features are enabled

### Requirement: Test Command
The system MUST validate hook functionality.

#### Scenario: Run self-test
- **WHEN** `npx ag test` is executed
- **THEN** it MUST:
  - Pipe sample commands through hooks
  - Validate blocking Behavior
  - Validate redaction Behavior
  - Report test results

### Requirement: Version Embedding
The system MUST embed version information.

#### Scenario: Version in output
- **WHEN** CLI outputs messages
- **THEN** it MUST include version number

### Requirement: Error Handling
The system MUST provide clear error messages.

#### Scenario: Harness not found
- **WHEN** Harness config directory doesn't exist
- **THEN** CLI MUST output clear error message

#### Scenario: Permission denied
- **WHEN** file copy fails due to permissions
- **THEN** CLI MUST output clear error message with fix suggestion

### Requirement: Cross-Platform Support
The system MUST work on macOS and Linux.

#### Scenario: macOS support
- **WHEN** CLI is run on macOS
- **THEN** all commands MUST work correctly

#### Scenario: Linux support
- **WHEN** CLI is run on Linux
- **THEN** all commands MUST work correctly
