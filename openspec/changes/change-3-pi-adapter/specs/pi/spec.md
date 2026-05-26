# Delta for Pi Adapter

## ADDED Requirements

### Requirement: Pi Adapter Structure
The system MUST implement a Pi Adapter for guardrails.

#### Scenario: Adapter loads
- WHEN the Adapter is loaded by Pi
- THEN it MUST export a default function that registers hooks

### Requirement: Tool Call Block
The system MUST block dangerous commands in `tool_call` (Tool Call hook).

#### Scenario: Block .env file read
- WHEN agent runs bash command that reads `.env`
- THEN Adapter MUST return `{ block: true, reason: "..." }` (reason carries the Message)

#### Scenario: Block sops -d command
- WHEN agent runs `sops -d secrets.yaml`
- THEN Adapter MUST return `{ block: true, reason: "..." }`

#### Scenario: Block secret manager commands
- WHEN agent runs `op read`, `pass show`, `gopass show`, `bw get`
- THEN Adapter MUST return `{ block: true, reason: "..." }`

#### Scenario: Block encryption tool commands
- WHEN agent runs `age -d`, `gpg --decrypt`, `openssl enc -d`
- THEN Adapter MUST return `{ block: true, reason: "..." }`

#### Scenario: Allow safe commands
- WHEN agent runs `ls -la`, `cat README.md`, `git status`
- THEN Adapter MUST NOT return block

### Requirement: Rule Pack Consumption
The system MUST import and use Rule Packs from `@agent-guardrails/secrets`.

#### Scenario: Import Rule Packs
- WHEN Adapter is loaded
- THEN it MUST import ALL Rule Packs from `@agent-guardrails/secrets`

#### Scenario: Check Rules
- WHEN Tool Call is intercepted
- THEN Adapter MUST check against all Rules in all Rule Packs

### Requirement: Messages
The system MUST provide clear Messages when blocking.

#### Scenario: Message content
- WHEN a command is blocked
- THEN the reason field MUST carry a Message that includes the Rule description

### Requirement: Performance
The system MUST add minimal overhead to tool execution.

#### Scenario: PreToolUse performance baseline
- WHEN guardrails are disabled (no rules loaded)
- THEN baseline tool_call execution time MUST be measured

#### Scenario: PreToolUse performance with rules
- WHEN guardrails are enabled with all rules loaded
- THEN tool_call execution time MUST be < 10ms
- AND overhead compared to baseline MUST be < 50%

#### Scenario: Performance with many Rule Packs
- WHEN 10+ Rule Packs are loaded
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

#### Scenario: Test all Rule Packs
- WHEN test runs with commands from each Rule Pack
- THEN all Rule Packs MUST be exercised
