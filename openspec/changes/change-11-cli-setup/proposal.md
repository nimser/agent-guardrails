# Proposal: CLI Setup

## Intent

Create the CLI for zero-friction installation of Agent Guardrails across different agents.

## Problem

Users need a simple way to install and manage Agent Guardrails. Manual installation is error-prone.

## Solution

Create a CLI that:
1. Detects agent config locations
2. Copies adapter files
3. Registers hooks
4. Reports installed versions

## Scope

### In Scope
- `npx agent-guardrails setup <agent>` - Install for current project
- `npx agent-guardrails status` - Show installed agents + versions
- `npx agent-guardrails test` - Run self-test

### Out of Scope
- Core logic (covered in earlier changes)
- Configuration system (covered in `change-12-rule-configuration`)

## Approach

1. Create `packages/cli/` directory
2. Implement CLI with commander.js
3. Detect agent config locations
4. Copy adapter files and register hooks

## Success Criteria

- [ ] `npx agent-guardrails setup opencode` installs without manual steps
- [ ] `npx agent-guardrails setup pi` installs without manual steps
- [ ] `npx agent-guardrails status` reports installed versions
- [ ] Works on macOS and Linux

## Dependencies

- Depends on `change-3-opencode-adapter` (opencode adapter)
- Depends on `change-4-pi-adapter` (Pi adapter)
