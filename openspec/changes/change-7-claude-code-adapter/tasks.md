## 1. Setup

- [ ] 1.1 Create `packages/claude-code/` directory structure
- [ ] 1.2 Create `packages/claude-code/package.json`
- [ ] 1.3 Create build script to compile TypeScript rules to shell patterns

## 2. Shell Hook Implementation

- [ ] 2.1 Create `src/guard.sh` shell hook script
- [ ] 2.2 Parse JSON input from stdin using `jq`
- [ ] 2.3 Extract `hook_event_name`, `tool_name`, `tool_input`
- [ ] 2.4 Handle PreToolUse events
- [ ] 2.5 Handle PostToolUse events

## 3. PreToolUse Logic

- [ ] 3.1 Match bash commands against embedded rule patterns
- [ ] 3.2 Match file paths against embedded rule patterns
- [ ] 3.3 Exit with code 2 and JSON `decision: block` when rule matches
- [ ] 3.4 Include suggestion in `reason` when available
- [ ] 3.5 Exit with code 0 when no rules match (allow)

## 4. PostToolUse Logic

- [ ] 4.1 Scan tool output for secret patterns
- [ ] 4.2 Exit with code 2 and JSON warning when secrets detected
- [ ] 4.3 Exit with code 0 when no secrets detected

## 5. Settings Configuration

- [ ] 5.1 Create `settings.json` snippet for hook configuration
- [ ] 5.2 Register PreToolUse hook
- [ ] 5.3 Register PostToolUse hook

## 6. Unit Tests

- [ ] 6.1 Test .env file read is blocked with exit code 2
- [ ] 6.2 Test cat .env command is blocked with suggestion
- [ ] 6.3 Test sops -d command is blocked with suggestion
- [ ] 6.4 Test safe commands pass through with exit code 0
- [ ] 6.5 Test PostToolUse detects secrets in output
- [ ] 6.6 Test JSON output is valid

## 7. Integration Tests

- [ ] 7.1 Create mock Claude Code environment
- [ ] 7.2 Test hook receives correct JSON input
- [ ] 7.3 Test hook outputs correct JSON for block
- [ ] 7.4 Test hook exits with correct codes
- [ ] 7.5 Test hook outputs warning for PostToolUse secrets

## 8. Installation

- [ ] 8.1 Create setup script for Claude Code
- [ ] 8.2 Copy guard.sh to `.claude/hooks/`
- [ ] 8.3 Add hook configuration to settings.json
- [ ] 8.4 Test `npx ag setup claude-code` installation
