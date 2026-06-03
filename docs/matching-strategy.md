# Multi-Layer Matching Strategy

Agent Guardrails uses a risk-escalation model with three matching layers. This approach balances precision (avoiding false positives) with security (catching adversarial patterns).

## Layer 1: Substring Pre-Filter

Fast, broad screening for risky keyword combinations:

```typescript
function containsRiskyKeywords(cmd: string): boolean {
  const riskyPairs = [
    ["sops", "-d"],
    ["sops", "--decrypt"],
    ["cat", ".env"],
    ["kubectl", "secret"],
  ];
  return riskyPairs.some(([a, b]) => cmd.includes(a) && cmd.includes(b));
}
```

**Characteristics:**

- O(n) string scan (very fast)
- Catches wrapped commands: `eval "sops -d file"`, `$(sops -d file)`
- Some false positives: `echo "use sops -d to decrypt"` (but these are safe to block)

## Layer 2: Structural Regex Matching

Precise pattern matching that checks command structure:

```typescript
const sopsPattern = /sops\s+(-{1,2}d(ecrypt)?\s+|.*\s+-{1,2}d(ecrypt)?\b)/;
```

**Characteristics:**

- Checks flag structure and positioning
- Catches standard usage patterns
- Misses adversarial wrapping

## Layer 3: Adversarial Wrapper Detection

Detects shell constructs that hide intent:

```typescript
const wrappers = ["eval ", "bash -c", "sh -c", "$("];

function hasAdversarialWrappers(cmd: string): boolean {
  return wrappers.some((w) => cmd.includes(w));
}
```

**Characteristics:**

- Identifies potential evasion attempts
- Triggers risk escalation regardless of Layer 2 result

## Behavior Matrix

| Substring (L1) | Regex (L2) | Wrappers (L3) | Interpretation                 | Behavior                                |
| -------------- | ---------- | ------------- | ------------------------------ | --------------------------------------- |
| ❌             | ❌         | ❌            | Safe                           | Allow                                   |
| ✅             | ✅         | ❌            | Standard dangerous command     | Configured behavior (suggest/run/etc.)  |
| ✅             | ❌         | ❌            | Substring false positive       | Allow (regex didn't match)              |
| ✅             | ✅         | ✅            | Adversarial wrapping detected  | **Force block** (escalate)              |
| ✅             | ❌         | ✅            | Adversarial but unclear intent | **Force block** (escalate, log warning) |

## Risk Escalation Principle

**"Guilty until proven innocent" for adversarial patterns.**

When Layer 3 detects wrappers (eval, bash -c, etc.) AND Layer 1 detects risky keywords, the command is treated as adversarial regardless of whether Layer 2's regex matched. This prevents evasion through shell composition:

```bash
# Standard usage (Layer 2 matches, configured behavior applies):
sops -d secrets.yaml
# → suggest: sops -d secrets.yaml | sed 's/:.*/: [REDACTED]/'

# Adversarial wrapping (Layer 3 forces block):
eval "sops -d secrets.yaml"
# → block: "Blocked: eval can hide dangerous commands."

# Subshell (Layer 3 forces block):
$(sops -d secrets.yaml)
# → block: "Blocked: subshell can hide dangerous commands."
```

## Multi-Line Command Splitting

Commands are split on `;`, `&&`, `||`, and `\n` before matching. This catches composition via command chaining:

```bash
FILE=.env; cat "$FILE"
# Split into: ["FILE=.env", "cat \"$FILE\""]
# Second segment matches .env pattern
```

**Limitations:** Does not track variable values or evaluate command substitution. These require shell parsing (planned for post-MVP shell tokenizer).

## Implementation Order

1. Layer 2 (structural regex) - core matching
2. Layer 1 (substring pre-filter) - performance optimization
3. Multi-line splitting - composition defense
4. Layer 3 (wrapper detection) - adversarial escalation

This order ensures basic functionality works first, then adds hardening incrementally.
