## ADDED Requirements

### Requirement: Integration Test Suite
The system MUST have a comprehensive integration test suite.

#### Scenario: Test suite structure
- **WHEN** the integration test suite is run
- **THEN** it MUST test all complete workflows

### Requirement: SOPS Workflow
The system MUST handle the SOPS decrypt workflow end-to-end.

#### Scenario: SOPS decrypt blocked
- **WHEN** agent runs `sops -d secrets.yaml`
- **THEN** system MUST block and suggest **Replacement**

#### Scenario: Agent retries with safe command
- **WHEN** agent retries with **Safer Alternative**
- **THEN** command MUST execute successfully

### Requirement: .env Workflow
The system MUST handle .env file reading workflow end-to-end.

#### Scenario: .env read blocked
- **WHEN** agent runs `cat .env`
- **THEN** system MUST block and suggest redacted version

#### Scenario: Agent reads with redaction
- **WHEN** agent reads .env with redaction
- **THEN** output MUST have values redacted

### Requirement: PostToolUse Workflow
The system MUST handle PostToolUse (Tool Result) redaction workflow end-to-end.

#### Scenario: Unexpected secrets caught
- **WHEN** Tool Output contains unexpected secrets
- **THEN** PostToolUse MUST redact before agent sees Output

### Requirement: Git Workflow
The system MUST handle git guardrails workflow end-to-end.

#### Scenario: git reset --hard blocked
- **WHEN** agent runs `git reset --hard`
- **THEN** system MUST block and suggest `git stash`

#### Scenario: git push allowed
- **WHEN** agent runs `git push` (without --force)
- **THEN** command MUST execute successfully

### Requirement: Performance Targets
The system MUST meet performance targets.

#### Scenario: PreToolUse performance
- **WHEN** PreToolUse hook executes
- **THEN** it MUST complete in < 10ms

#### Scenario: PostToolUse performance
- **WHEN** PostToolUse hook executes
- **THEN** it MUST complete in < 50ms for typical output

#### Scenario: Total overhead
- **WHEN** tool call is made with guardrails
- **THEN** total overhead MUST be < 50ms

### Requirement: No Regressions
The system MUST not regress existing functionality.

#### Scenario: Safe commands pass through
- **WHEN** safe commands are executed
- **THEN** they MUST pass through without blocking

#### Scenario: Non-secret content preserved
- **WHEN** content doesn't contain secrets
- **THEN** it MUST be preserved exactly

### Requirement: Documentation
The system MUST have complete documentation.

#### Scenario: README completeness
- **WHEN** README is reviewed
- **THEN** it MUST contain:
  - Installation instructions
  - Usage examples
  - Configuration options
  - Troubleshooting guide

#### Scenario: API documentation
- **WHEN** API documentation is reviewed
- **THEN** it MUST document all exported functions
