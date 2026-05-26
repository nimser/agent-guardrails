## 1. Setup

- [ ] 1.1 Create `packages/secrets/` directory structure
- [ ] 1.2 Create `packages/secrets/package.json` with `@agent-guardrails/core` dependency
- [ ] 1.3 Create `packages/secrets/tsconfig.json`
- [ ] 1.4 Create `packages/secrets/vitest.config.ts`

## 2. env Rule Pack

- [ ] 2.1 Create `src/packs/env.ts` with envRulePack definition
- [ ] 2.2 Add rule `env.read` with file-path matcher `/\.env(\..+)?$/`
- [ ] 2.3 Add rule `env.read-bash` with bash-command matcher `/\b(cat|bat|head|tail|less|more|type)\b.*\.env(\s|$)/`
- [ ] 2.4 Set defaultAction to `{ type: "block", message: "Blocked: attempted to read \`{matched}\` — .env files may contain secrets." }`
- [ ] 2.5 Add unit tests: file-path positive matches (`.env`, `.env.local`, `.env.production`)
- [ ] 2.6 Add unit tests: file-path negative matches (`config.json`, `environment.yaml`, `env.config.js`)
- [ ] 2.7 Add unit tests: bash-command positive matches (`cat .env`, `bat .env`, `head -5 .env`)
- [ ] 2.8 Add unit tests: bash-command negative matches (`cat config.json`, `sops -d .env`)

## 3. sops Rule Pack

- [ ] 3.1 Create `src/packs/sops.ts` with sopsRulePack definition
- [ ] 3.2 Add rule `sops.decrypt` with bash-command matcher `/\bsops\s+(-d|--decrypt)\b/`
- [ ] 3.3 Set defaultAction to `{ type: "block", message: "Blocked: \`{matched}\` — SOPS decrypt may expose secrets." }`
- [ ] 3.4 Add unit tests: positive matches (`sops -d secrets.yaml`, `sops --decrypt file.enc`)
- [ ] 3.5 Add unit tests: negative matches (`sops -e file.yaml`, `sops --version`, `cat secrets.yaml`)

## 4. private-key Rule Pack

- [ ] 4.1 Create `src/packs/private-key.ts` with privateKeyRulePack definition
- [ ] 4.2 Add rule `private-key.read` with file-path matchers for `.pem`, `.key`, `.p12`, `.pfx`, `.p8`
- [ ] 4.3 Add matcher for `id_rsa`, `id_ed25519`, `id_ecdsa`, `id_dsa`
- [ ] 4.4 Add `predicate` matcher for SSH directory: block any file in `~/.ssh/` NOT in allowlist (`known_hosts`, `config`, `authorized_keys`, `*.pub`, `*.pubkey`)
- [ ] 4.5 Set defaultAction to `{ type: "block", message: "Blocked: attempted to read \`{matched}\` — private key files may contain secrets." }`
- [ ] 4.6 Add unit tests: positive matches (`server.pem`, `id_rsa`, `cert.p12`, `~/.ssh/my_custom_key`)
- [ ] 4.7 Add unit tests: negative matches (`id_rsa.pub`, `key.json`, `~/.ssh/config`, `~/.ssh/known_hosts`)

## 5. encryption-tools Rule Pack

- [ ] 5.1 Create `src/packs/encryption-tools.ts` with encryptionToolsRulePack definition
- [ ] 5.2 Add rule `encryption-tools.age` with matcher `/\bage\s+(-d|--decrypt)\b/`
- [ ] 5.3 Add rule `encryption-tools.gpg` with matcher `/\bgpg\s+.*(-d|--decrypt)\b/`
- [ ] 5.4 Add rule `encryption-tools.openssl` with matcher `/\bopenssl\s+enc\b.*-d\b/`
- [ ] 5.5 Set defaultAction to `{ type: "block", message: "Blocked: \`{matched}\` — decrypt commands may expose secrets." }` (per-rule with specific tool name)
- [ ] 5.6 Add unit tests: age positive (`age -d file.age`, `age --decrypt file.age`)
- [ ] 5.7 Add unit tests: age negative (`age -e file.txt`, `age --version`)
- [ ] 5.8 Add unit tests: gpg positive (`gpg --decrypt file.gpg`, `gpg -d file.gpg`)
- [ ] 5.9 Add unit tests: gpg negative (`gpg --encrypt file.txt`, `gpg --list-keys`)
- [ ] 5.10 Add unit tests: openssl positive (`openssl enc -d -aes-256-cbc -in file.enc`)
- [ ] 5.11 Add unit tests: openssl negative (`openssl x509 -in cert.pem`, `openssl version`)

## 6. secret-managers Rule Pack

- [ ] 6.1 Create `src/packs/secret-managers.ts` with secretManagersRulePack definition
- [ ] 6.2 Add rule `secret-managers.1password` with matcher `/\bop\s+(read|get)\b/`
- [ ] 6.3 Add rule `secret-managers.gopass` with matcher `/\bgopass\s+show\b/`
- [ ] 6.4 Add rule `secret-managers.pass` with matcher `/\bpass\s+show\b/`
- [ ] 6.5 Add rule `secret-managers.bitwarden` with matcher `/\bbw\s+(get|list)\s+(password|item|note)\b/`
- [ ] 6.6 Set defaultAction to `{ type: "block", message: "Blocked: \`{matched}\` — secret manager retrieval may expose credentials." }` (per-rule with specific manager name)
- [ ] 6.7 Add unit tests: 1password positive (`op read op://vault/item`, `op get item`)
- [ ] 6.8 Add unit tests: 1password negative (`op signin`, `op list vaults`)
- [ ] 6.9 Add unit tests: gopass positive (`gopass show secret/path`)
- [ ] 6.10 Add unit tests: gopass negative (`gopass list`, `gopass --version`)
- [ ] 6.11 Add unit tests: pass positive (`pass show secret/path`)
- [ ] 6.12 Add unit tests: pass negative (`pass list`, `pass version`)
- [ ] 6.13 Add unit tests: bitwarden positive (`bw get password item`, `bw get item`)
- [ ] 6.14 Add unit tests: bitwarden negative (`bw login`, `bw sync`)

## 7. Module Exports

- [ ] 7.1 Create `src/index.ts` exporting all Rule Packs
- [ ] 7.2 Export `ALL_RULE_PACKS` array combining all packs
- [ ] 7.3 Export individual packs: envRulePack, sopsRulePack, privateKeyRulePack, encryptionToolsRulePack, secretManagersRulePack

## 8. Integration Tests

- [ ] 8.1 Test iterating ALL_RULE_PACKS against mock tool calls
- [ ] 8.2 Test rule matching with both file-path and bash-command matchers
- [ ] 8.3 Test safe commands pass through all rules without blocking
- [ ] 8.4 Test blocked rules return correct action type and message
- [ ] 8.5 Test that multiple matchers in same rule are OR'd together

## 9. Documentation

- [ ] 9.1 Create `packages/secrets/README.md` documenting each Rule Pack
- [ ] 9.2 Document pattern syntax for contributors
- [ ] 9.3 Document which tools/commands are blocked by each pack
