# Proposal: Secret Blocking

## Intent

Implement deterministic secret matching with `block` Behavior for the first vertical slice. This proves the hook path works in opencode and Pi.

## Problem

Agents can read files containing secrets (.env, private keys, SOPS-encrypted files) and include their content in LLM context. We need to block these operations before they execute via Tool Call hooks.

## Solution

Implement:
1. Deterministic secret matching Rules (regex-based Guardrail Matchers)
2. `env` Rule Pack for .env file blocking (file-path AND bash-command Matchers)
3. `sops` Rule Pack for SOPS decrypt blocking
4. `private-key` Rule Pack for private key file blocking (including SSH directory)
5. `encryption-tools` Rule Pack for age, gpg, openssl decrypt blocking
6. `secret-managers` Rule Pack for op, gopass, pass, bw commands
7. `block` Behavior only (suggest/run/redact come later)

## Scope

### In Scope
- `env` Rule Pack: block reads of `.env` files via file-path AND bash commands (cat, bat, tee, etc.)
- `sops` Rule Pack: block `sops -d` commands
- `private-key` Rule Pack: block reads of `*.pem`, `*.key`, SSH keys, and any non-pub file in ~/.ssh/
- `encryption-tools` Rule Pack: block `age -d`, `gpg --decrypt`, `openssl enc -d` commands
- `secret-managers` Rule Pack: block `op read`, `gopass show`, `pass show`, `bw get` commands
- `block` Behavior implementation
- Unit tests for all matching Rules

### Out of Scope
- `suggest` and `run` Behaviors (covered in `change-5-command-transforms`)
- `redact` Behavior (covered in `change-10-redact-output`)
- Platform Adapters (covered in `change-3-pi-adapter`, `change-4-opencode-adapter`)
- AWS/GCP/Azure CLI secret commands (deferred - more complex patterns)
- Database CLI password detection (deferred - hard to match reliably)

### Note on Rule Packs
This change defines the **matching logic** and **Default Actions** for secret-related Rules. The same Rule Packs are used by `change-5-command-transforms` which adds `suggest` and `run` Behavior support. Rule IDs are stable identifiers - the Action (block/suggest/run) is configurable per Harness via Configured Action.

## Approach

1. Create rule packs in `src/packs/` (single-package structure per Change 1 Decision 14)
2. Implement `env` Rule Pack with dual Matchers (file-path + bash-command) — Defense in Depth
3. Implement `sops` Rule Pack
4. Implement `private-key` Rule Pack with SSH directory support
5. Implement `encryption-tools` Rule Pack (age, gpg, openssl)
6. Implement `secret-managers` Rule Pack (op, gopass, pass, bw)
7. Implement `hardening` Rule Pack (multi-layer matching: wrapper detection, redirect-to-sensitive-path)
8. Rule packs defined as YAML files, loaded via `infrastructure/yaml-pack-loader.ts`
9. Export Rule Packs for Adapters to consume

## Rule Packs

### env Rule Pack
```typescript
const envRulePack: RulePack = {
  id: "env",
  name: "Environment Files",
  description: "Block access to .env files",
  rules: [
    {
      id: "env.read",
      title: "Read .env file",
      description: "Block reading .env files via file-path",
      phase: "before-tool",
      match: { type: "file-path", pattern: /\.env(\..*)?$/ },
      defaultAction: { type: "block", message: "Blocked: attempted to read `{matched}` — .env files may contain secrets." }
    },
    {
      id: "env.read-bash",
      title: "Read .env via command",
      description: "Block commands that display .env content",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\b(cat|bat|head|tail|less|more|type)\b.*\.env(\s|$)/ },
      defaultAction: { type: "block", message: "Blocked: `{matched}` — displaying .env file content may leak secrets." }
    }
  ]
};
```

### private-key Rule Pack
```typescript
const privateKeyRulePack: RulePack = {
  id: "private-key",
  name: "Private Keys",
  description: "Block access to private key files",
  rules: [
    {
      id: "private-key.read",
      title: "Read Private Key",
      description: "Block reading private key files",
      phase: "before-tool",
      match: [
        { type: "file-path", pattern: /\.(pem|key|p12|pfx|p8)$/ },
        { type: "file-path", pattern: /id_(rsa|ed25519|ecdsa|dsa)$/ },
        { type: "predicate", test: (ctx) => {
            if (!ctx.filePath || !/\.ssh\//.test(ctx.filePath)) return false;
            const filename = ctx.filePath.split("/").pop()!;
            const allowlist = new Set(["known_hosts", "config", "authorized_keys"]);
            if (allowlist.has(filename)) return false;
            if (/\.(pub|pubkey)$/.test(filename)) return false;
            return true;
          }
        }
      ],
      defaultAction: { type: "block", message: "Blocked: attempted to read `{matched}` — private key files may contain secrets." }
    }
  ]
};
```

### encryption-tools Rule Pack
```typescript
const encryptionToolsRulePack: RulePack = {
  id: "encryption-tools",
  name: "Encryption Tools",
  description: "Block decrypt commands for common encryption tools",
  rules: [
    {
      id: "encryption-tools.age",
      title: "Age Decrypt",
      description: "Block age decrypt commands",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\bage\s+(-d|--decrypt)\b/ },
      defaultAction: { type: "block", message: "Blocked: `{matched}` — age decrypt may expose secrets." }
    },
    {
      id: "encryption-tools.gpg",
      title: "GPG Decrypt",
      description: "Block gpg decrypt commands",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\bgpg\s+.*(-d|--decrypt)\b/ },
      defaultAction: { type: "block", message: "Blocked: `{matched}` — GPG decrypt may expose secrets." }
    },
    {
      id: "encryption-tools.openssl",
      title: "OpenSSL Decrypt",
      description: "Block openssl enc decrypt commands",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\bopenssl\s+enc\b.*-d\b/ },
      defaultAction: { type: "block", message: "Blocked: `{matched}` — OpenSSL decrypt may expose secrets." }
    }
  ]
};
```

### secret-managers Rule Pack
```typescript
const secretManagersRulePack: RulePack = {
  id: "secret-managers",
  name: "Secret Managers",
  description: "Block commands that retrieve secrets from secret managers",
  rules: [
    {
      id: "secret-managers.1password",
      title: "1Password Read",
      description: "Block 1Password secret retrieval",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\bop\s+(read|get)\b/ },
      defaultAction: { type: "block", message: "Blocked: `{matched}` — 1Password secret retrieval may expose credentials." }
    },
    {
      id: "secret-managers.gopass",
      title: "Gopass Show",
      description: "Block gopass secret retrieval",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\bgopass\s+show\b/ },
      defaultAction: { type: "block", message: "Blocked: `{matched}` — gopass secret retrieval may expose credentials." }
    },
    {
      id: "secret-managers.pass",
      title: "Pass Show",
      description: "Block pass secret retrieval",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\bpass\s+show\b/ },
      defaultAction: { type: "block", message: "Blocked: `{matched}` — pass secret retrieval may expose credentials." }
    },
    {
      id: "secret-managers.bitwarden",
      title: "Bitwarden Get",
      description: "Block Bitwarden secret retrieval",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\bbw\s+(get|list)\s+(password|item|note)\b/ },
      defaultAction: { type: "block", message: "Blocked: `{matched}` — Bitwarden secret retrieval may expose credentials." }
    }
  ]
};
```

## Hardening Rule Pack

Implements multi-layer matching (see `docs/matching-strategy.md`). These rules integrate Layers 1 and 3 as `hardening` rule pack rules that complement the Layer 2 regex rules above.

### Layer 1: Substring Pre-Filter

Implemented as engine-level optimization in `src/matcher/multi-line.ts`. Before evaluating regex matchers, the engine splits commands on `;`, `&&`, `||`, `\n` and evaluates each segment independently against all rules. This catches composition via command chaining.

### Layer 3: Hardening Rules

```yaml
id: hardening
name: Adversarial Pattern Hardening
description: Detects shell wrapping constructs that hide intent and redirects to sensitive paths
rules:
  - id: hardening.wrapper-eval
    title: Eval wrapper detected
    description: "Detects eval hiding a command"
    phase: before-tool
    match:
      type: bash-command
      pattern: "\\beval\\b"
    action:
      type: block
      message: "Blocked: `{matched}` — eval can hide dangerous commands."

  - id: hardening.wrapper-bash-c
    title: bash -c / sh -c wrapper detected
    description: Detects subshell invocation hiding a command
    phase: before-tool
    match:
      type: bash-command
      pattern: "\\b(bash|sh)\\s+-c\\b"
    action:
      type: block
      message: "Blocked: `{matched}` — subshell invocation can hide dangerous commands."

  - id: hardening.wrapper-subshell
    title: Command substitution detected
    description: Detects $() or backtick command substitution
    phase: before-tool
    match:
      type: bash-command
      pattern: "(\\$\\(|`)"
    action:
      type: block
      message: "Blocked: `{matched}` — command substitution can hide dangerous commands."

  - id: hardening.redirect-read-sensitive
    title: Redirect reading from sensitive path
    description: Detects < redirect from .env/.pem/.key files
    phase: before-tool
    match:
      type: bash-command
      pattern: "<\\s*[^\\s]*\\.(env|pem|key|p12|pfx|p8)"
    action:
      type: block
      message: "Blocked: `{matched}` — redirecting from sensitive files may leak secrets."

  - id: hardening.redirect-write-sensitive
    title: Redirect writing to sensitive path
    description: Detects > or >> redirect to .env/.pem/.key files
    phase: before-tool
    match:
      type: bash-command
      pattern: "(>|>>)\\s*[^\\s]*\\.(env|pem|key)$"
    action:
      type: block
      message: "Blocked: `{matched}` — writing to sensitive files via redirect."

  - id: hardening.redirect-tee-sensitive
    title: tee to sensitive path
    description: Detects tee writing to .env/.pem/.key files
    phase: before-tool
    match:
      type: bash-command
      pattern: "\\btee\\b[^|]*\\.(env|pem|key)"
    action:
      type: block
      message: "Blocked: `{matched}` — tee can write secrets to sensitive files."
```

**Risk escalation behavior:** When a hardening rule fires (Layer 3), the action is blocked with a nonOverridable **Block Action** regardless of user configuration — "guilty until proven innocent" for adversarial patterns. This is enforced by the engine: hardening pack rules cannot be overridden via `agent-guardrails.json`.

## Success Criteria

- [ ] `env` Rule Pack blocks `.env` file reads via file-path AND bash commands
- [ ] `sops` Rule Pack blocks `sops -d` commands
- [ ] `private-key` Rule Pack blocks private key reads including SSH directory
- [ ] `encryption-tools` Rule Pack blocks age, gpg, openssl decrypt
- [ ] `secret-managers` Rule Pack blocks op, gopass, pass, bw commands
- [ ] `hardening` Rule Pack blocks eval, bash-c, subshell, redirect wrappers
- [ ] Multi-line splitting catches composition via `;`, `&&`, `||`, `\n`
- [ ] All Rules have YAML definitions and unit tests
- [ ] Rule packs loaded via infrastructure yaml-pack-loader
- [ ] NonOverridable Block Action: hardening rules cannot be overridden by user config
- [ ] Rule Packs export cleanly for Adapter consumption

## Dependencies

- Depends on `change-1-project-foundation` (types, Rule Pack interface, matcher registry, infrastructure layer)

## Risks

- **Risk**: False positives (legitimate file reads blocked)
  - **Mitigation**: Precise Guardrail Matchers, configurable per-project
- **Risk**: Layer 3 wrapper detection false positives (legitimate eval usage)
  - **Mitigation**: eval/bash-c rare in coding agent context; nonOverridable Block Action default can be reconsidered post-MVP based on issue reports
- **Risk**: Missing patterns
  - **Mitigation**: Start with common patterns, extend via YAML rule packs (contributor-friendly)
- **Risk**: Scope creep
  - **Mitigation**: Defer AWS/GCP/Azure CLI, database CLIs to future changes
