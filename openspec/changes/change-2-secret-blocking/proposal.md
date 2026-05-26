# Proposal: Secret Blocking

## Intent

Implement deterministic secret detection with `block` behavior for the first vertical slice. This proves the hook path works in opencode and Pi.

## Problem

Agents can read files containing secrets (.env, private keys, SOPS-encrypted files) and include their content in LLM context. We need to block these operations before they execute.

## Solution

Implement:
1. Deterministic secret detection rules (regex-based)
2. `env` rule pack for .env file blocking (file-path AND bash-command matchers)
3. `sops` rule pack for SOPS decrypt blocking
4. `private-key` rule pack for private key file blocking (including SSH directory)
5. `encryption-tools` rule pack for age, gpg, openssl decrypt blocking
6. `secret-managers` rule pack for op, gopass, pass, bw commands
7. `block` behavior only (suggest/run/redact come later)

## Scope

### In Scope
- `env` rule pack: block reads of `.env` files via file-path AND bash commands (cat, bat, tee, etc.)
- `sops` rule pack: block `sops -d` commands
- `private-key` rule pack: block reads of `*.pem`, `*.key`, SSH keys, and any non-pub file in ~/.ssh/
- `encryption-tools` rule pack: block `age -d`, `gpg --decrypt`, `openssl enc -d` commands
- `secret-managers` rule pack: block `op read`, `gopass show`, `pass show`, `bw get` commands
- `block` behavior implementation
- Unit tests for all detection rules

### Out of Scope
- `suggest` and `run` behaviors (covered in `change-5-command-transforms`)
- `redact` behavior (covered in `change-9-redact-output`)
- Platform adapters (covered in `change-3-pi-adapter`, `change-4-opencode-adapter`)
- AWS/GCP/Azure CLI secret commands (deferred - more complex patterns)
- Database CLI password detection (deferred - hard to detect reliably)

### Note on Rule Packs
This change defines the **detection logic** and **default actions** for secret-related rules. The same rule packs are used by `change-5-command-transforms` which adds `suggest` and `run` behavior support. Rule IDs are stable identifiers - the action (block/suggest/run) is configurable per harness.

## Approach

1. Create `packages/secrets/` directory
2. Implement `env` rule pack with dual matchers (file-path + bash-command)
3. Implement `sops` rule pack
4. Implement `private-key` rule pack with SSH directory support
5. Implement `encryption-tools` rule pack (age, gpg, openssl)
6. Implement `secret-managers` rule pack (op, gopass, pass, bw)
7. Export rule packs for adapters to consume

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
      defaultAction: { type: "block", message: "Reading .env files is blocked to prevent secret leaks." }
    },
    {
      id: "env.read-bash",
      title: "Read .env via command",
      description: "Block commands that display .env content",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\b(cat|bat|head|tail|less|more|type)\b.*\.env(\s|$)/ },
      defaultAction: { type: "block", message: "Displaying .env file content is blocked." }
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
        { type: "file-path", pattern: /\.ssh\/(?!.*\.(pub|pubkey)$)(?!known_hosts)(?!config$)[^/]+$/ }
      ],
      defaultAction: { type: "block", message: "Reading private key files is blocked." }
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
      defaultAction: { type: "block", message: "Age decrypt blocked to prevent secret leaks." }
    },
    {
      id: "encryption-tools.gpg",
      title: "GPG Decrypt",
      description: "Block gpg decrypt commands",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\bgpg\s+.*(-d|--decrypt)\b/ },
      defaultAction: { type: "block", message: "GPG decrypt blocked to prevent secret leaks." }
    },
    {
      id: "encryption-tools.openssl",
      title: "OpenSSL Decrypt",
      description: "Block openssl enc decrypt commands",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\bopenssl\s+enc\b.*-d\b/ },
      defaultAction: { type: "block", message: "OpenSSL decrypt blocked to prevent secret leaks." }
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
      defaultAction: { type: "block", message: "1Password secret retrieval blocked." }
    },
    {
      id: "secret-managers.gopass",
      title: "Gopass Show",
      description: "Block gopass secret retrieval",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\bgopass\s+show\b/ },
      defaultAction: { type: "block", message: "Gopass secret retrieval blocked." }
    },
    {
      id: "secret-managers.pass",
      title: "Pass Show",
      description: "Block pass secret retrieval",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\bpass\s+show\b/ },
      defaultAction: { type: "block", message: "Pass secret retrieval blocked." }
    },
    {
      id: "secret-managers.bitwarden",
      title: "Bitwarden Get",
      description: "Block Bitwarden secret retrieval",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /\bbw\s+(get|list)\s+(password|item|note)\b/ },
      defaultAction: { type: "block", message: "Bitwarden secret retrieval blocked." }
    }
  ]
};
```

## Success Criteria

- [ ] `env` rule pack blocks `.env` file reads via file-path AND bash commands
- [ ] `sops` rule pack blocks `sops -d` commands
- [ ] `private-key` rule pack blocks private key reads including SSH directory
- [ ] `encryption-tools` rule pack blocks age, gpg, openssl decrypt
- [ ] `secret-managers` rule pack blocks op, gopass, pass, bw commands
- [ ] All rules have unit tests
- [ ] Rule packs export cleanly for adapter consumption

## Dependencies

- Depends on `change-1-project-foundation` (types, rule pack interface)

## Risks

- **Risk**: False positives (legitimate file reads blocked)
  - **Mitigation**: Precise patterns, configurable per-project
- **Risk**: Missing patterns
  - **Mitigation**: Start with common patterns, extend as needed
- **Risk**: Scope creep
  - **Mitigation**: Defer AWS/GCP/Azure CLI, database CLIs to future changes
