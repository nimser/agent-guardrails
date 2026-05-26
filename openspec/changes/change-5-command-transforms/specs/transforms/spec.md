# Delta for Command Transforms

## ADDED Requirements

### Requirement: kubernetes Rule Pack
The system MUST provide a `kubernetes` Rule Pack for kubectl secrets commands.

#### Scenario: Suggest redacted kubectl secrets
- WHEN agent runs `kubectl get secrets`
- THEN rule MUST match and produce `suggest` action with redacted alternative

### Requirement: gh-cli Rule Pack
The system MUST provide a `gh-cli` Rule Pack for GitHub CLI secret commands.

#### Scenario: Suggest gh secret list instead of view
- WHEN agent runs `gh secret view MY_SECRET`
- THEN rule MUST match and produce `suggest` action with `gh secret list`

#### Scenario: Allow non-sensitive gh commands
- WHEN agent runs `gh secret list`, `gh secret set`, `gh pr list`
- THEN rule MUST NOT match

### Requirement: direnv Rule Pack
The system MUST provide a `direnv` Rule Pack for direnv/dotenv commands that evaluate .env files.

#### Scenario: Block direnv exec
- WHEN agent runs `direnv exec . cat .env`
- THEN rule MUST match and produce `block` action

#### Scenario: Block source .env
- WHEN agent runs `source .env` or `. .env`
- THEN rule MUST match and produce `suggest` action with `sed 's/=.*/=[REDACTED]/' .env`

### Requirement: Format-Aware SOPS Redaction (Shell-Based)
The system MUST implement format-aware SOPS redaction using shell pipelines, with format detected from file extension and flags.

#### Scenario: Redact YAML output
- WHEN SOPS command targets a `.yaml` or `.yml` file
- THEN redaction MUST use: `| sed 's/:.*/: [REDACTED]/'`

#### Scenario: Redact JSON output
- WHEN SOPS command targets a `.json` file
- THEN redaction MUST use: `| jq 'walk(if type == "string" then "[REDACTED]" else . end)'`

#### Scenario: Redact ENV output
- WHEN SOPS command targets a `.env` file
- THEN redaction MUST use: `| sed 's/=.*/=[REDACTED]/'`

#### Scenario: Respect --output-type flag (highest priority)
- WHEN SOPS command includes `--output-type json`
- THEN redaction MUST use JSON format regardless of file extension

#### Scenario: Respect --input-type flag (second priority)
- WHEN SOPS command includes `--input-type yaml` and no `--output-type`
- THEN redaction MUST use YAML format

#### Scenario: No detectable format → block
- WHEN SOPS command has no file extension, no `--output-type`, and no `--input-type`
- THEN `findSaferCommand()` MUST return `null`
- AND engine MUST fall back to `block` via Action Fallback Chain

### Requirement: Single Safer Command
The system MUST return a single safer command alternative.

#### Scenario: findSaferCommand returns string or null
- WHEN `findSaferCommand(command)` is called
- THEN it MUST return a `string` (the safer command) or `null` (no known alternative)

#### Scenario: Single suggestion for env read
- WHEN command is `cat .env`
- THEN system MUST return: `sed 's/=.*/=[REDACTED]/' .env`

#### Scenario: Suggest → block fallback
- WHEN `findSaferCommand()` returns `null`
- THEN engine MUST fall back to `block`
- AND block message MUST be: `"Blocked: \`{matched}\` — no safer alternative available."`

### Requirement: Suggest Behavior
The system MUST implement `suggest` Behavior for all Harnesses via the shared engine.

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

#### Scenario: Test gh-cli rules
- WHEN gh-cli rules are tested
- THEN all positive and negative cases MUST pass

#### Scenario: Test direnv rules
- WHEN direnv rules are tested
- THEN all positive and negative cases MUST pass

#### Scenario: Test SOPS format-aware redaction
- WHEN SOPS redaction is tested
- THEN YAML, JSON, and ENV format variants MUST pass

#### Scenario: Test SOPS --output-type handling
- WHEN SOPS command includes --output-type flag
- THEN redaction MUST use the specified format

#### Scenario: Test SOPS --input-type handling
- WHEN SOPS command includes --input-type flag
- THEN redaction MUST use the specified format

#### Scenario: Test SOPS no-format fallback
- WHEN SOPS command has no detectable format
- THEN findSaferCommand MUST return null
- AND engine MUST fall back to block

#### Scenario: Test single suggestion
- WHEN findSaferCommand is called
- THEN it MUST return a single string or null

#### Scenario: Test gh-cli rules
- WHEN gh secret view is tested
- THEN it MUST suggest gh secret list

#### Scenario: Test direnv rules
- WHEN direnv exec or source .env is tested
- THEN it MUST block or suggest accordingly
