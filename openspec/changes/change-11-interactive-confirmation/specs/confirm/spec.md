# Delta for Interactive Confirmation

## ADDED Requirements

### Requirement: Pi Native Confirmation
The system MUST use `ctx.ui.confirm()` for confirmation in Pi.

#### Scenario: Show confirmation dialog
- WHEN Pi Adapter encounters `confirm` Action
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
- WHEN Codex Adapter encounters `confirm` Action
- THEN it MUST show native approval prompt

### Requirement: Fallback to Suggest
The system MUST fall back to `suggest` for Harnesses without native confirmation.

#### Scenario: Fallback in Claude Code
- WHEN Claude Code Adapter encounters `confirm` Action
- THEN it MUST fall back to `suggest` Behavior

#### Scenario: Fallback in opencode
- WHEN opencode Adapter encounters `confirm` Action
- THEN it MUST fall back to `suggest` Behavior
