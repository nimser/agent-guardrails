---
status: accepted
---

# ADR-004: YAML Rule Packs

## Context

Not everyone who wants to contribute a guardrail rule knows TypeScript. Security teams, DevOps engineers, and curious users should be able to write rules in a format they already know — without setting up a build toolchain.

## Decision

### YAML for Both Built-in and User Packs

All built-in rule packs (`env`, `sops`, `private-key`, `encryption-tools`, `secret-managers`, `kubernetes`, `direnv`, `gh-cli`, `hardening`) are defined in YAML, not TypeScript. Users extend the system with the same format — drop a `.yaml` file in `.agent-guardrails/packs/` and it's loaded automatically.

This means no dual-maintenance: built-in packs and community packs use identical formats and the same validation pipeline.

### One External Dependency

The `yaml` npm package lives in `infrastructure/` only. `core/` remains zero-dependency. Adapters that don't need YAML loading can omit this dependency entirely.

### Predicate Matchers Require a TypeScript Add-On

`predicate` matchers execute JavaScript functions for complex conditions. YAML can't embed functions, so predicates are registered in TypeScript code via the `PredicateRegistry` and referenced by name in YAML. A YAML pack using a predicate depends on the adapter (or bootstrap code) having registered that predicate under the matching `predicateName`.

## Rationale

- **Lowest barrier to contribution:** Anyone familiar with Kubernetes or CI/CD YAML can write a rule pack
- **Consistency:** Built-in packs and user packs share the same format and validation
- **Ecosystem:** Community packs can be shared without requiring TypeScript knowledge from reviewers
- **Isolated dependency:** `yaml` is the only runtime dependency outside `core/`

## Consequences

- Adding a rule pack = writing a YAML file + validation passes at load time
- Predicate-based matching requires a predicate function registered in TypeScript code (see [rule-pack-guide.md](../rule-pack-guide.md))
- Schema validation at load time catches errors before any tool call is evaluated
- See [rule-pack-guide.md](../rule-pack-guide.md) for the complete format specification and examples
