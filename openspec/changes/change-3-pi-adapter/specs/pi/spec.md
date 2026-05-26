# Delta for Pi Adapter

## ADDED Requirements

### Requirement: Pi Extension Structure
The system MUST implement a Pi extension for guardrails.

#### Scenario: Extension loads
- WHEN the extension is loaded by Pi
- THEN it MUST export a default function that registers hooks

### Requirement: PreToolUse Block
The system MUST block dangerous commands in `tool_call`.

#### Scenario: Block .env file read
- WHEN agent runs bash command that reads `.env`
- THEN extension MUST return `{ block: true, reason: "..." }`

#### Scenario: Block sops -d command
- WHEN agent runs `sops -d secrets.yaml`
- THEN extension MUST return `{ block: true, reason: "..." }`

#### Scenario: Block secret manager commands
- WHEN agent runs `op read`, `pass show`, `gopass show`, `bw get`
- THEN extension MUST return `{ block: true, reason: "..." }`

#### Scenario: Block encryption tool commands
- WHEN agent runs `age -d`, `gpg --decrypt`, `openssl enc -d`
- THEN extension MUST return `{ block: true, reason: "..." }`

#### Scenario: Allow safe commands
- WHEN agent runs `ls -la`, `cat README.md`, `git status`
- THEN extension MUST NOT return block

### Requirement: Rule Pack Consumption
The system MUST import and use rule packs from `@agent-guardrails/secrets`.

#### Scenario: Import rule packs
- WHEN extension is loaded
- THEN it MUST import ALL rule packs from `@agent-guardrails/secrets`

#### Scenario: Check rules
- WHEN tool call is intercepted
- THEN extension MUST check against all rules in all packs

### Requirement: Reason Messages
The system MUST provide clear reason messages when blocking.

#### Scenario: Reason message content
- WHEN a command is blocked
- THEN reason MUST include rule description

### Requirement: Performance
The system MUST add minimal overhead to tool execution.

#### Scenario: PreToolUse performance baseline
- WHEN guardrails are disabled (no rules loaded)
- THEN baseline tool_call execution time MUST be measured

#### Scenario: PreToolUse performance with rules
- WHEN guardrails are enabled with all rules loaded
- THEN tool_call execution time MUST be < 10ms
- AND overhead compared to baseline MUST be < 50%

#### Scenario: Performance with many rule packs
- WHEN 10+ rule packs are loaded
- THEN tool_call execution time MUST still be < 10ms

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
