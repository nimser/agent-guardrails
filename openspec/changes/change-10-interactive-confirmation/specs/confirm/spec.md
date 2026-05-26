# Delta for Interactive Confirmation

## ADDED Requirements

### Requirement: Pi Native Confirmation
The system MUST use `ctx.ui.confirm()` for confirmation in Pi.

#### Scenario: Show confirmation dialog
- WHEN Pi adapter encounters `confirm` action
- THEN it MUST show native confirmation dialog via `ctx.ui.confirm()`

#### Scenario: User approves
- WHEN user approves in confirmation dialog
- THEN operation MUST proceed

#### Scenario: User rejects
- WHEN user rejects in confirmation dialog
- THEN operation MUST be blocked

### Requirement: Codex Native Confirmation
The system MUST use Codex approval prompt for confirmation.

#### Scenario: Show approval prompt
- WHEN Codex adapter encounters `confirm` action
- THEN it MUST show native approval prompt

### Requirement: Fallback to Suggest
The system MUST fall back to `suggest` for harnesses without native confirmation.

#### Scenario: Fallback in Claude Code
- WHEN Claude Code adapter encounters `confirm` action
- THEN it MUST fall back to `suggest` behavior

#### Scenario: Fallback in opencode
- WHEN opencode adapter encounters `confirm` action
- THEN it MUST fall back to `suggest` behavior
