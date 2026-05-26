# Proposal: Rule Configuration

## Intent

Implement the configuration file system for customizing guardrails Behavior.

## Problem

Users need to customize guardrails Behavior:
- Enable/disable specific Rules
- Configure Rule Actions (block, suggest, run, redact, confirm, off) via Configured Action
- Different settings per project

## Solution

Implement configuration system that:
1. Reads config from project and global locations
2. Merges with proper precedence
3. Validates configuration

## Scope

### In Scope
- `agent-guardrails.json` schema
- Project-level config (repo root)
- Global config (`~/.config/agent-guardrails.json`)
- Priority: project > global > built-in defaults
- Rule Actions: `block`, `suggest`, `run`, `redact`, `confirm`, `off` (Configured Action overrides Default Action)

### Out of Scope
- Core logic (covered in earlier changes)
- CLI (covered in `change-12-cli-setup`)

## Approach

1. Define config schema
2. Implement config file reading
3. Implement config merging
4. Add validation

## Success Criteria

- [ ] Config files are parsed correctly
- [ ] Priority order is respected
- [ ] Invalid configs are rejected with clear errors

## Dependencies

- Depends on `change-1-project-foundation` (types)
