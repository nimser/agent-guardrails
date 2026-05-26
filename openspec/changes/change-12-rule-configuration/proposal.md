# Proposal: Rule Configuration

## Intent

Implement the configuration file system for customizing guardrails behavior.

## Problem

Users need to customize guardrails behavior:
- Enable/disable specific rules
- Configure rule actions (block, suggest, run, redact, confirm, off)
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
- Rule actions: `block`, `suggest`, `run`, `redact`, `confirm`, `off`

### Out of Scope
- Core logic (covered in earlier changes)
- CLI (covered in `change-11-cli-setup`)

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
