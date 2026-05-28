## 1. Setup

- [ ] 1.1 Create `src/packs/` directory (single-package structure from Change 1)
- [ ] 1.2 Create YAML rule pack files in `src/packs/`
- [ ] 1.3 Use `infrastructure/yaml-pack-loader.ts` to load packs at runtime (from Change 1)

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

## 7. hardening Rule Pack

- [ ] 7.1 Create `src/packs/hardening.yaml` with hardening rule pack definition
- [ ] 7.2 Add rule `hardening.wrapper-eval` with bash-command matcher `/\beval\b/`
- [ ] 7.3 Add rule `hardening.wrapper-bash-c` with bash-command matcher `/\b(bash|sh)\s+-c\b/`
- [ ] 7.4 Add rule `hardening.wrapper-subshell` with bash-command matcher `/(\$\(|`)/`
- [ ] 7.5 Add rule `hardening.redirect-read-sensitive` with bash-command matcher `/<\s*[^\s]*\.(env|pem|key|p12|pfx|p8)/`
- [ ] 7.6 Add rule `hardening.redirect-write-sensitive` with bash-command matcher `/(>|>>)\s*[^\s]*\.(env|pem|key)$/`
- [ ] 7.7 Add rule `hardening.redirect-tee-sensitive` with bash-command matcher `/\btee\b[^|]*\.(env|pem|key)/`
- [ ] 7.8 Set all actions to `{ type: "block", message: "Blocked: \`{matched}\` — [reason]" }`
- [ ] 7.9 Mark hardening pack as non-overridable in metadata
- [ ] 7.10 Add unit tests: wrapper detection positives (`eval "cmd"`, `bash -c 'cmd'`, `$(cmd)`)
- [ ] 7.11 Add unit tests: wrapper detection negatives (`echo eval`, `cat script.sh`)
- [ ] 7.12 Add unit tests: redirect detection positives (`cat < .env`, `echo x > secret.key`)
- [ ] 7.13 Add unit tests: redirect detection negatives (`cat file.txt > output.log`)
- [ ] 7.14 Add unit tests: verify hardening rules cannot be overridden by config

## 8. Module Exports

- [ ] 8.1 Create `src/index.ts` exporting all Rule Packs
- [ ] 8.2 Export `ALL_RULE_PACKS` array combining all packs (loaded from YAML)
- [ ] 8.3 Export individual packs: envRulePack, sopsRulePack, privateKeyRulePack, encryptionToolsRulePack, secretManagersRulePack, hardeningRulePack

## 9. Integration Tests

- [ ] 9.1 Test iterating ALL_RULE_PACKS against mock tool calls
- [ ] 9.2 Test rule matching with both file-path and bash-command matchers
- [ ] 9.3 Test safe commands pass through all rules without blocking
- [ ] 9.4 Test blocked rules return correct action type and message
- [ ] 9.5 Test that multiple matchers in same rule are OR'd together
- [ ] 9.6 Test multi-line splitting catches `cmd1; cmd2` composition
- [ ] 9.7 Test hardening rules fire on adversarial patterns
- [ ] 9.8 Test hardening rules force-block (cannot be overridden)

## 10. Documentation

- [ ] 10.1 Create `docs/rule-packs.md` documenting each Rule Pack
- [ ] 10.2 Document pattern syntax for contributors
- [ ] 10.3 Document which tools/commands are blocked by each pack
- [ ] 10.4 Document hardening pack behavior and force-block semantics
- [ ] 10.5 Document multi-line splitting behavior
- [ ] 10.6 Add troubleshooting guide for false positives
