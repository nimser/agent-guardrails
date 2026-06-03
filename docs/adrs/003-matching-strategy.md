---
status: accepted
---

# ADR-003: Multi-Layer Matching Strategy

## Context

A single regex layer isn't enough. Standard patterns miss adversarial shell wrapping (`eval "sops -d file"`), while substring-only matching produces false positives. The engine needs a defense-in-depth approach that catches both naive misuse and deliberate evasion without overwhelming legitimate usage.

## Decision

### Three-Layer Risk Escalation

| Layer | Name                 | What it detects                                     | Characteristic                       |
| ----- | -------------------- | --------------------------------------------------- | ------------------------------------ |
| L1    | Substring pre-filter | Risky keyword pairs (`sops` + `-d`, `cat` + `.env`) | Fast O(n) scan, catches wrappers     |
| L2    | Structural regex     | Command structure (flag positioning, arguments)     | Precise, misses adversarial wrapping |
| L3    | Wrapper detection    | Shell evasion (`eval`, `bash -c`, `$()`)            | Triggers force-block                 |

Layers run independently, then results combine via a risk-escalation matrix:

- **L2 matches alone** → configured behavior (suggest, run, etc.)
- **L1 + L3 match** → force-block, regardless of L2 (adversarial pattern detected)
- **L1 alone** → allow (substring false positive, L2 didn't confirm)

### Risk Escalation Principle

**"Guilty until proven innocent" for adversarial patterns.**

When wrapper detection (L3) fires alongside risky keywords (L1), the command is blocked even if the structural regex (L2) didn't match. This prevents evasion through shell composition:

```bash
# Standard usage → configured behavior applies:
sops -d secrets.yaml
# → suggest: a safer alternative

# Adversarial wrapping → force-block:
eval "sops -d secrets.yaml"
# → block: "eval can hide dangerous commands"
```

### Command Splitting

Commands are split on `;`, `&&`, `||`, and `\n` before matching. This catches composition via chaining:

```bash
FILE=.env; cat "$FILE"
# Split into: ["FILE=.env", "cat \"$FILE\""]
```

## Rationale

- **Defense in depth:** Each layer catches what the others miss
- **Low false positives:** L1 alone doesn't block — L2 must confirm
- **Anti-evasion:** L3 escalation prevents common shell tricks from bypassing rules
- **Incremental hardening:** Layers can be added independently as threats evolve

## Consequences

- Rules can opt into any subset of layers
- New evasion patterns require L3 updates, not L2 regex changes
- Command splitting doesn't track variable values or substitution — that needs a shell tokenizer (planned post-MVP)
- See [how-matching-works.md](../how-matching-works.md) for the detailed layer-by-layer breakdown with examples
