# Delta for Git Guardrails

## ADDED Requirements

### Requirement: Git Rule Pack
The system MUST provide a `git` Rule Pack with safety Rules for git operations.

#### Scenario: Block rm -rf
- WHEN agent runs `rm -rf directory`
- THEN rule MUST match and produce `block` action

#### Scenario: Suggest alternative for git reset --hard
- WHEN agent runs `git reset --hard HEAD~1`
- THEN rule MUST match and produce `suggest` action with `git stash`

#### Scenario: Suggest alternative for git push --force
- WHEN agent runs `git push --force origin main`
- THEN rule MUST match and produce `suggest` action with `git push --force-with-lease`

#### Scenario: Block git clean -f
- WHEN agent runs `git clean -f`
- THEN rule MUST match and produce `block` action

#### Scenario: Block git branch -D
- WHEN agent runs `git branch -D feature`
- THEN rule MUST match and produce `block` action

#### Scenario: Allow git push (without --force)
- WHEN agent runs `git push origin main`
- THEN rule MUST NOT match

#### Scenario: Allow git reset (without --hard)
- WHEN agent runs `git reset HEAD~1`
- THEN rule MUST NOT match

### Requirement: Safe Command Allowance
The system MUST allow safe git commands.

#### Scenario: Allow git checkout branch
- WHEN agent runs `git checkout feature`
- THEN rule MUST NOT match

#### Scenario: Allow git restore file
- WHEN agent runs `git restore file.txt`
- THEN rule MUST NOT match

### Requirement: Rule Pack Export
The system MUST export git Rule Pack for Adapter consumption.

#### Scenario: Import git Rule Pack
- WHEN Adapter imports git rule packs from `src/packs/`
- THEN it MUST receive the `gitRulePack` object

### Requirement: Unit Tests
The system MUST have comprehensive unit tests for all git rules.

#### Scenario: Test git rules
- WHEN git rules are tested
- THEN all positive and negative cases MUST pass
