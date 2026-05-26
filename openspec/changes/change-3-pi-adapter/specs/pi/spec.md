# Delta for Pi Adapter

## ADDED Requirements

### Requirement: Pi Adapter Structure
The system MUST implement a Pi Adapter for guardrails.

#### Scenario: Adapter loads
- WHEN the Adapter is loaded by Pi
- THEN it MUST export a default function that registers hooks

### Requirement: Tool Call Hook for All Tools
The system MUST hook `tool_call` (Tool Call) for ALL tools, not just bash.

#### Scenario: Hook registration
- WHEN the Adapter registers its hook
- THEN it MUST intercept tool_call events for all tool types (bash, read, write, and any future tools)
- AND it MUST normalize each event into a `ToolCallContext` discriminated union
- AND it MUST delegate matching to `matchAndResolve()` from `@agent-guardrails/engine`
- AND it MUST NOT implement its own matching logic

#### Scenario: Bash tool normalization
- WHEN a bash tool_call event is received
- THEN the Adapter MUST normalize to `{ toolName: "bash", command: event.input.command }`

#### Scenario: Read/Write tool normalization
- WHEN a read or write tool_call event is received
- THEN the Adapter MUST normalize to `{ toolName: "read"|"write", filePath: event.input.path }`

#### Scenario: Unknown tool normalization
- WHEN an unrecognized tool_call event is received
- THEN the Adapter MUST normalize to `{ toolName: event.toolName }`
- AND no matchers will fire, so the tool call passes through

### Requirement: Tool Call Block
The system MUST block dangerous commands in `tool_call` (Tool Call hook).

#### Scenario: Block .env file read via bash
- WHEN agent runs bash command that reads `.env`
- THEN engine MUST return a block Action
- AND Adapter MUST return `{ block: true, reason: "..." }` (reason carries the Message)

#### Scenario: Block .env file read via read tool
- WHEN agent reads `.env` file using Pi's read tool
- THEN engine MUST return a block Action via file-path matcher
- AND Adapter MUST return `{ block: true, reason: "..." }`

#### Scenario: Block sops -d command
- WHEN agent runs `sops -d secrets.yaml`
- THEN Adapter MUST return `{ block: true, reason: "..." }`

#### Scenario: Block private key read via read tool
- WHEN agent reads `~/.ssh/id_rsa` using Pi's read tool
- THEN engine MUST return a block Action via predicate matcher
- AND Adapter MUST return `{ block: true, reason: "..." }`

#### Scenario: Block secret manager commands
- WHEN agent runs `op read`, `pass show`, `gopass show`, `bw get`
- THEN Adapter MUST return `{ block: true, reason: "..." }`

#### Scenario: Block encryption tool commands
- WHEN agent runs `age -d`, `gpg --decrypt`, `openssl enc -d`
- THEN Adapter MUST return `{ block: true, reason: "..." }`

#### Scenario: Allow safe commands
- WHEN agent runs `ls -la`, `cat README.md`, `git status`
- THEN Adapter MUST NOT return block

#### Scenario: Allow safe file reads
- WHEN agent reads `config.yaml`, `src/index.ts`, `README.md`
- THEN Adapter MUST NOT return block

### Requirement: Rule Pack Consumption
The system MUST import and use ALL Rule Packs from `@agent-guardrails/secrets`.

#### Scenario: Import all Rule Packs
- WHEN Adapter is loaded
- THEN it MUST import `ALL_RULE_PACKS` from `@agent-guardrails/secrets`
- AND it MUST NOT curate or filter individual packs
- AND it MUST pass ALL_RULE_PACKS to the engine

#### Scenario: Check Rules
- WHEN Tool Call is intercepted
- THEN the engine MUST check against all Rules in all Rule Packs

### Requirement: Messages
The system MUST provide clear Messages when blocking.

#### Scenario: Message content
- WHEN a command is blocked
- THEN the reason field MUST carry a Message that includes the `{matched}` template interpolated by the engine

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

#### Scenario: Test file-path matching via read tool
- WHEN test reads `.env` or `id_rsa` via read tool
- THEN the Adapter MUST block via file-path or predicate matcher

#### Scenario: Test unknown tool passthrough
- WHEN test invokes an unrecognized tool
- THEN the Adapter MUST NOT block
