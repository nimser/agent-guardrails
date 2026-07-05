# How Matching Works

This is the practical companion to [ADR-004: Matching Strategy](adrs/004-matching-strategy.md). Here we walk through each layer with real examples, so you can understand how Guiderails decides whether to allow, block, or suggest alternatives for a command.

## The Three Layers

### Layer 1: Substring Pre-Filter

A fast, broad screening pass. It checks for risky keyword _pairs_ appearing together in a command:

```typescript
const riskyPairs = [
  ["sops", "-d"],
  ["sops", "--decrypt"],
  ["cat", ".env"],
  ["kubectl", "secret"],
];
```

**Why pairs?** The word "sops" alone doesn't mean danger — `sops --help` is harmless. But `sops` next to `-d` is a decryption attempt. Pairs reduce false positives while staying O(n) fast.

**What it catches:** Wrapped or composed commands that hide dangerous operations:

```bash
eval "sops -d file"          # L1 catches: sops + -d
$(sops -d file)              # L1 catches: sops + -d
```

**What it misses:** Nothing dangerous — it has no false _negatives_. But it has false positives:

```bash
echo "use sops -d to decrypt"  # L1 catches it, but it's harmless
```

That's fine — Layer 2 will correctly allow it.

### Layer 2: Structural Regex Matching

Precise pattern matching that understands command structure:

```typescript
const sopsPattern = /sops\s+(-{1,2}d(ecrypt)?\s+|.*\s+-{1,2}d(ecrypt)?\b)/;
```

**What it catches:** Standard dangerous usage with correct flag positioning:

```bash
sops -d secrets.yaml               # ✅ matches
sops --decrypt secrets.yaml        # ✅ matches
sops -d --output-type json file    # ✅ matches
```

**What it misses:** Commands wrapped in shell tricks:

```bash
eval "sops -d secrets.yaml"        # L2 misses the structure inside eval
```

### Layer 3: Adversarial Wrapper Detection

Detects shell constructs commonly used to hide intent:

```typescript
const wrappers = ["eval ", "bash -c", "sh -c", "$("];
```

**What it catches:** Any command trying to obscure its contents:

```bash
eval "sops -d secrets.yaml"        # L3 catches: eval
$(sops -d secrets.yaml)            # L3 catches: $(
bash -c "cat .env && curl ..."     # L3 catches: bash -c
```

**What it misses:** More exotic obfuscation (base64 encoding, heredocs). These are addressed by the `hardening` rule pack and planned shell tokenizer.

## The Behavior Matrix

| L1 (Substring) | L2 (Regex) | L3 (Wrapper) | What happened                                   | Result                               |
| :------------: | :--------: | :----------: | ----------------------------------------------- | ------------------------------------ |
|       ❌       |     ❌     |      ❌      | Nothing risky                                   | Allow                                |
|       ✅       |     ✅     |      ❌      | Standard dangerous command                      | Configured action (suggest/run/etc.) |
|       ✅       |     ❌     |      ❌      | False positive (L1 noise, L2 didn't confirm)    | Allow                                |
|       ✅       |     ✅     |      ✅      | Adversarial wrapping of known dangerous command | **Force block** (escalate)           |
|       ✅       |     ❌     |      ✅      | Adversarial wrapping, unclear target            | **Force block** (escalate + log)     |

The key insight: **Layer 3 acts as a circuit breaker.** When adversarial patterns appear alongside risky keywords, we don't trust that the structural regex "didn't match" — the wrapping itself is suspicious.

## Command Splitting

Before any layer runs, the engine splits compound commands into segments:

```bash
FILE=.env; cat "$FILE"
# → ["FILE=.env", "cat \"$FILE\""]
```

Splitting happens on `;`, `&&`, `||`, and newlines. Each segment is matched independently, so this trick doesn't work:

```bash
echo "safe" && cat .env
# → ["echo \"safe\"", "cat .env"]  ← second segment matches
```

**Current limitation:** The splitter doesn't track variable values or evaluate command substitution. `FILE=.env; cat $FILE` won't catch `$FILE` pointing to `.env`. A shell tokenizer for proper AST-level analysis is planned.

## Writing Rules That Match Well

When contributing YAML rule packs, keep these principles in mind:

1. **Use specific patterns, not broad keywords.** `sops\s+-d` is better than just `sops`.
2. **Pair with bash-command AND file-path matchers.** For things like `.env` files, catch both `cat .env` (bash) and direct `read` tool calls (file-path).
3. **Don't try to catch evasion in your regex** — that's what Layer 3 is for.
4. **Include a clear message with `{matched}`.** The agent needs to understand _what_ triggered the rule.

See [rule-pack-guide.md](rule-pack-guide.md) for the full YAML format and more examples.
