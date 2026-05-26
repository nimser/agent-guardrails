# Delta for opencode Adapter

## ADDED Requirements

### Requirement: opencode Plugin Structure
The system MUST implement an opencode plugin for guardrails.

#### Scenario: Plugin loads
- WHEN the plugin is loaded by opencode
- THEN it MUST export a function that returns hooks

### Requirement: PreToolUse Block
The system MUST block dangerous commands in `tool.execute.before`.

#### Scenario: Block .env file read
- WHEN agent runs bash command that reads `.env`
- THEN plugin MUST throw Error with block message

#### Scenario: Block sops -d command
- WHEN agent runs `sops -d secrets.yaml`
- THEN plugin MUST throw Error with block message

#### Scenario: Block secret manager commands
- WHEN agent runs `op read`, `pass show`, `gopass show`, `bw get`
- THEN plugin MUST throw Error with block message

#### Scenario: Block encryption tool commands
- WHEN agent runs `age -d`, `gpg --decrypt`, `openssl enc -d`
- THEN plugin MUST throw Error with block message

#### Scenario: Allow safe commands
- WHEN agent runs `ls -la`, `cat README.md`, `git status`
- THEN plugin MUST NOT throw Error

### Requirement: Rule Pack Consumption
The system MUST import and use rule packs from `@agent-guardrails/secrets`.

#### Scenario: Import rule packs
- WHEN plugin is loaded
- THEN it MUST import ALL rule packs from `@agent-guardrails/secrets`

#### Scenario: Check rules
- WHEN tool call is intercepted
- THEN plugin MUST check against all rules in all packs

### Requirement: Error Messages
The system MUST provide clear error messages when blocking.

#### Scenario: Block message content
- WHEN a command is blocked
- THEN error message MUST include rule description

### Requirement: Performance
The system MUST add minimal overhead to tool execution.

#### Scenario: PreToolUse performance baseline
- WHEN guardrails are disabled (no rules loaded)
- THEN baseline tool.execute.before execution time MUST be measured

#### Scenario: PreToolUse performance with rules
- WHEN guardrails are enabled with all rules loaded
- THEN tool.execute.before execution time MUST be < 10ms
- AND overhead compared to baseline MUST be < 50%

#### Scenario: Performance with many rule packs
- WHEN 10+ rule packs are loaded
- THEN tool.execute.before execution time MUST still be < 10ms

#### Scenario: Performance test suite
- WHEN performance tests are run
- THEN they MUST measure: min, max, mean, p95, p99 latencies
- AND tests MUST run with: 0 rules, 10 rules, 50 rules, 100 rules

### Requirement: Integration Tests
The system MUST have integration tests.

#### Scenario: Test blocking
- WHEN test runs with dangerous commands
- THEN commands MUST be blocked

#### Scenario: Test allowing
- WHEN test runs with safe commands
- THEN commands MUST be allowed

#### Scenario: Test all rule packs
- WHEN test runs with commands from each rule pack
- THEN all rule packs MUST be exercised
