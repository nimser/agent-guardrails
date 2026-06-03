---
status: accepted
decisions: [16]
ref: openspec/changes/change-1-project-foundation/design.md (internal use only)
---

# ADR-004: YAML Rule Packs for Community Extensibility

## Context

We need a contribution path that doesn't require TypeScript knowledge. Security teams, DevOps engineers, and curious users should be able to write guardrails using a format they already know — not by writing TypeScript code and setting up a build toolchain.

## Decision

### Built-in Rule Packs as YAML

All built-in rule packs (`env`, `sops`, `private-key`, `encryption-tools`, `secret-managers`, `kubernetes`, `direnv`, `gh-cli`, `hardening`) are defined in YAML, not TypeScript. The engine loads them via `loadAllRulePacks()` in `src/infrastructure/yaml-pack-loader.ts`.

### User Rule Packs from a Directory

Users can drop YAML files into a directory (default: `.agent-guardrails/packs/`) and load them via `loadYamlRulePack(path)` or `loadAllRulePacks(path)`. Packs are validated on load — invalid packs fail with descriptive errors.

### Format

```yaml
id: my-pack
name: My Rule Pack
description: What this pack protects
rules:
  - id: my-pack.rule
    title: Human-readable title
    description: What this catches
    phase: before-tool
    match:
      type: bash-command  # or file-path (not predicate in YAML)
      pattern: "regex-pattern"
    action:
      type: block
      message: "Why it was blocked — `{matched}` caught"
```

### Limits

- **Predicate matchers cannot be defined in YAML.** They require calling a JavaScript function, which YAML has no mechanism for. Use TypeScript rule packs for predicate logic.
- `{matched}` template placeholder is supported in all message fields.

### Dependencies

The `yaml` npm package lives in `infrastructure/` only. `core/` remains zero-dependency. Adapters that don't need YAML loading can omit this dependency entirely.

### Rationale

- **Lowest barrier to contribution:** Anyone who knows Kubernetes/Ci/Ansible YAML can write a rule pack
- **Consistency:** Built-in packs use the same format users extend — no dual-maintenance burden
- **Ecosystem:** Community packs can be shared via `awesome-agent-guardrails` without a code review requiring TypeScript knowledge
- **Single dependency:** `yaml` is the only runtime dependency in `infrastructure/`, isolated from core

## Consequences

- Predicate-based matching requires TypeScript rule packs (for `src/resolver/` logic or advanced conditions)
- YAML packs are limited to `bash-command` and `file-path` matcher types
- Schema validation is enforced by `validateRulePack()` at load time
- The `yaml` package adds one external dependency to the project
