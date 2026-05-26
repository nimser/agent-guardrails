# Delta for Codex CLI Adapter

## ADDED Requirements

### Requirement: Shell Hook Script
The system MUST implement a shell hook script for Codex CLI.

#### Scenario: Hook script is executable
- WHEN the hook script is installed
- THEN it MUST be executable (`chmod +x`)

#### Scenario: Hook receives JSON input
- WHEN Codex CLI invokes the hook
- THEN hook MUST parse JSON from stdin using `jq`

### Requirement: PreToolUse Block
The system MUST block dangerous commands via PreToolUse hook (Tool Call).

#### Scenario: Block .env file read
- WHEN agent runs bash command that reads `.env`
- THEN hook MUST output JSON with `permissionDecision: deny`

#### Scenario: Block sops -d command
- WHEN agent runs `sops -d secrets.yaml`
- THEN hook MUST output JSON with `permissionDecision: deny`

#### Scenario: Block secret manager commands
- WHEN agent runs `op read`, `pass show`, `gopass show`, `bw get`
- THEN hook MUST output JSON with `permissionDecision: deny`

#### Scenario: Block encryption tool commands
- WHEN agent runs `age -d`, `gpg --decrypt`, `openssl enc -d`
- THEN hook MUST output JSON with `permissionDecision: deny`

#### Scenario: Allow safe commands
- WHEN agent runs `ls -la`, `cat README.md`, `git status`
- THEN hook MUST output empty JSON (allow)

### Requirement: PreToolUse Suggest
The system MUST suggest safer alternatives for dangerous commands.

#### Scenario: Suggest safer sops command
- WHEN agent runs `sops -d secrets.yaml`
- THEN `permissionDecisionReason` MUST include `sops -d secrets.yaml | sed 's/:.*/: [REDACTED]/'` (Replacement as Message)

#### Scenario: Suggest safer cat .env command
- WHEN agent runs `cat .env`
- THEN `permissionDecisionReason` MUST include `sed 's/=.*/=[REDACTED]/' .env`

#### Scenario: Suggest force-with-lease
- WHEN agent runs `git push --force`
- THEN `permissionDecisionReason` MUST include `git push --force-with-lease`

### Requirement: PostToolUse Secret Detection
The system MUST detect secrets in Tool Output.

#### Scenario: Detect AWS key in output
- WHEN Tool Output contains `AKIAIOSFODNN7EXAMPLE`
- THEN hook MUST output JSON with `additionalContext` warning

#### Scenario: Detect GitHub token in output
- WHEN Tool Output contains `ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh`
- THEN hook MUST output JSON with `additionalContext` warning

### Requirement: Hook Registration
The system MUST provide hooks.json for hook registration.

#### Scenario: hooks.json structure
- WHEN hooks.json is present
- THEN it MUST register PreToolUse and PostToolUse hooks

### Requirement: Performance
The system MUST add minimal overhead to tool execution.

#### Scenario: PreToolUse performance baseline
- WHEN guardrails are disabled (no rules loaded)
- THEN baseline hook execution time MUST be measured

#### Scenario: PreToolUse performance with rules
- WHEN guardrails are enabled with all rules loaded
- THEN hook execution time MUST be < 10ms
- AND overhead compared to baseline MUST be < 50%

#### Scenario: Performance with many Rule Packs
- WHEN 10+ Rule Packs are loaded
- THEN hook execution time MUST still be < 10ms

#### Scenario: Performance test suite
- WHEN performance tests are run
- THEN they MUST measure: min, max, mean, p95, p99 latencies
- AND tests MUST run with: 0 rules, 10 rules, 50 rules, 100 rules

#### Scenario: PostToolUse performance
- WHEN guard hook is invoked for output scanning
- THEN execution time MUST be < 10ms for typical output (< 100KB)
