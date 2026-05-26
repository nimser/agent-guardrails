## 1. Setup

- [ ] 1.1 Create `packages/codex/` directory structure
- [ ] 1.2 Create `packages/codex/package.json`
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
- [ ] 3.3 Output JSON with `permissionDecision: deny` when rule matches
- [ ] 3.4 Include suggestion in `permissionDecisionReason` when available
- [ ] 3.5 Output empty JSON when no rules match (allow)

## 4. PostToolUse Logic

- [ ] 4.1 Scan tool output for secret patterns
- [ ] 4.2 Output JSON with `additionalContext` warning when secrets detected
- [ ] 4.3 Output empty JSON when no secrets detected

## 5. Hook Registration

- [ ] 5.1 Create `hooks.json` for hook registration
- [ ] 5.2 Register PreToolUse hook
- [ ] 5.3 Register PostToolUse hook

## 6. Unit Tests

- [ ] 6.1 Test .env file read is blocked
- [ ] 6.2 Test cat .env command is blocked with suggestion
- [ ] 6.3 Test sops -d command is blocked with suggestion
- [ ] 6.4 Test safe commands pass through
- [ ] 6.5 Test PostToolUse detects secrets in output
- [ ] 6.6 Test JSON output is valid

## 7. Integration Tests

- [ ] 7.1 Create mock Codex environment
- [ ] 7.2 Test hook receives correct JSON input
- [ ] 7.3 Test hook outputs correct JSON for block
- [ ] 7.4 Test hook outputs correct JSON for allow
- [ ] 7.5 Test hook outputs warning for PostToolUse secrets

## 8. Installation

- [ ] 8.1 Create setup script for Codex CLI
- [ ] 8.2 Copy guard.sh to `.codex/hooks/`
- [ ] 8.3 Register hooks in Codex configuration
- [ ] 8.4 Test `npx ag setup codex` installation
