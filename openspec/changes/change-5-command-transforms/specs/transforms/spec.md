# Delta for Command Transforms

## ADDED Requirements

### Requirement: kubernetes Rule Pack
The system MUST provide a `kubernetes` Rule Pack for kubectl secrets commands.

#### Scenario: Suggest redacted kubectl secrets
- WHEN agent runs `kubectl get secrets`
- THEN rule MUST match and produce `suggest` action with redacted alternative

### Requirement: vault Rule Pack
The system MUST provide a `vault` Rule Pack for vault read commands.

#### Scenario: Suggest redacted vault read
- WHEN agent runs `vault kv get secret/data`
- THEN rule MUST match and produce `suggest` action with redacted alternative

### Requirement: Format-Aware SOPS Redaction
The system MUST implement format-aware SOPS redaction in TypeScript.

#### Scenario: Redact YAML output
- WHEN SOPS output is YAML format
- THEN redaction MUST replace values after `:` with `[REDACTED]`

#### Scenario: Redact JSON output
- WHEN SOPS output is JSON format
- THEN redaction MUST replace all string values with `[REDACTED]`

#### Scenario: Redact ENV output
- WHEN SOPS output is ENV format
- THEN redaction MUST replace values after `=` with `[REDACTED]`

#### Scenario: Respect --output-type flag
- WHEN SOPS command includes `--output-type json`
- THEN redaction MUST use JSON format regardless of file extension
- WHEN SOPS command includes `--output-type yaml`
- THEN redaction MUST use YAML format

### Requirement: Multiple Suggestions
The system MUST support returning multiple safer alternatives.

#### Scenario: findSaferCommands returns array
- WHEN `findSaferCommands(command)` is called
- THEN it MUST return an array of `SaferCommand` objects
- AND each object MUST have `command`, `description`, and `confidence` fields
- AND results MUST be sorted by confidence (highest first)

#### Scenario: Multiple suggestions for env read
- WHEN command is `cat .env`
- THEN system MUST return multiple alternatives:
  - `sed 's/=.*/=[REDACTED]/' .env` (full redaction, high confidence)
  - `head -c 4 .env && echo '...'` (first 4 chars, medium confidence)
  - `grep -c '=' .env` (count keys only, low confidence)

#### Scenario: Multiple suggestions for sops decrypt
- WHEN command is `sops -d secrets.yaml`
- THEN system MUST return multiple alternatives:
  - `sops -d secrets.yaml | sed 's/:.*/: [REDACTED]/'` (full redaction)
  - `sops -d secrets.yaml | grep -o '.\\{0,4\\}password.\\{0,4\\}'` (limited context)

### Requirement: Smart Piped Command Detection
The system MUST detect when piped commands already have proper precautions.

#### Scenario: Allow grep with limited context
- WHEN command is `sops -d secrets.yaml | grep -o '.{0,4}password.{0,4}'`
- THEN system MUST NOT block (grep -o with limited context is safe)

#### Scenario: Allow head/tail limiting
- WHEN command is `sops -d secrets.yaml | head -5`
- THEN system MUST NOT block (only shows first 5 lines)

#### Scenario: Allow word count
- WHEN command is `sops -d secrets.yaml | wc -l`
- THEN system MUST NOT block (only shows line count)

#### Scenario: Block grep without context limit
- WHEN command is `sops -d secrets.yaml | grep password`
- THEN system MUST block (grep without -o shows full line with secrets)

### Requirement: Suggest Behavior
The system MUST implement `suggest` Behavior for all Harnesses.

#### Scenario: Suggest in Claude Code
- WHEN Claude Code Adapter encounters suggest Action
- THEN it MUST throw Error with suggestion Message

#### Scenario: Suggest in Codex
- WHEN Codex Adapter encounters suggest Action
- THEN it MUST return deny with suggestion Message

#### Scenario: Suggest in opencode
- WHEN opencode Adapter encounters suggest Action
- THEN it MUST throw Error with suggestion Message

#### Scenario: Suggest in Pi
- WHEN Pi Adapter encounters suggest Action
- THEN it MUST return `{ block: true, reason: "..." }`

### Requirement: Action Configuration
The system MUST allow users to configure actions per rule.

#### Scenario: Override default action
- WHEN user configures `sops.decrypt` action to `suggest`
- THEN the rule MUST use `suggest` instead of default `block`

### Requirement: Unit Tests
The system MUST have comprehensive unit tests for all transforms.

#### Scenario: Test kubernetes rules
- WHEN kubernetes rules are tested
- THEN all positive and negative cases MUST pass

#### Scenario: Test vault rules
- WHEN vault rules are tested
- THEN all positive and negative cases MUST pass

#### Scenario: Test SOPS redaction
- WHEN SOPS redaction is tested
- THEN all format variants MUST pass

#### Scenario: Test SOPS --output-type handling
- WHEN SOPS command includes --output-type flag
- THEN redaction MUST use the specified format

#### Scenario: Test multiple suggestions
- WHEN findSaferCommands is called
- THEN it MUST return multiple alternatives sorted by confidence

#### Scenario: Test smart piped detection
- WHEN piped commands have proper precautions
- THEN they MUST NOT be blocked
