# Tasks: Secret Blocking

> **TDD MANDATE**: Every task below follows Test-Driven Development. For each
> rule pack: write failing tests for the positive and negative cases (RED),
> then create the rule pack until they pass (GREEN), then refactor (REFACTOR).
> Related scenarios within a section may share one refactoring pass.
> **Never create rules before tests.** See `.agents/skills/tdd/SKILL.md`.

## 1. Setup

- [ ] 1.1 Create `src/packs/` directory
- [ ] 1.2 Create `src/packs/index.ts` as the barrel export file (will be populated as packs are added)

## 2. env Rule Pack

> **TDD cycle**: Write tests first, watch them fail, then implement.

- [ ] 2.0 RED: Write test file `src/packs/env.test.ts` with test cases:
  - `env.read` matches `.env`, `.env.local`, `.env.production` via `file-path`
  - `env.read` does NOT match `config.json`, `environment.yaml`, `env.config.js`
  - `env.read-bash` matches `cat .env`, `bat .env`, `head .env`, `tail .env`, `less .env`, `more .env`
  - `env.read-bash` does NOT match `cat config.json`, `sops -d .env`
- [ ] 2.1 GREEN: Create `src/packs/env.yaml`:
  ```yaml
  id: env
  name: Environment Files
  description: Block access to .env files
  rules:
    - id: env.read
      title: Read .env file
      description: Block reading .env files via file-path
      phase: before-tool
      match:
        type: file-path
        pattern: "\.env(\..+)?$"
      defaultAction:
        type: block
        message: "Blocked: attempted to read `{matched}` — .env files may contain secrets."
    - id: env.read-bash
      title: Read .env via command
      description: Block commands that display .env content
      phase: before-tool
      match:
        type: bash-command
        pattern: "\\b(cat|bat|head|tail|less|more|type)\\b.*\\.env(\\s|$)"
      defaultAction:
        type: block
        message: "Blocked: `{matched}` — displaying .env file content may leak secrets."
  ```
- [ ] 2.2 REFACTOR: Verify all tests pass, clean up
- [ ] 2.3 Export `envRulePack` from `src/packs/index.ts`

## 3. sops Rule Pack

> **TDD cycle**: Write tests first, watch them fail, then implement.

- [ ] 3.0 RED: Write test file `src/packs/sops.test.ts` with test cases:
  - `sops.decrypt` matches `sops -d secrets.yaml`, `sops --decrypt file.enc`
  - `sops.decrypt` does NOT match `sops -e file.yaml`, `sops --version`, `cat secrets.yaml`
- [ ] 3.1 GREEN: Create `src/packs/sops.yaml`:
  ```yaml
  id: sops
  name: SOPS Encrypted Files
  description: Block SOPS decrypt commands
  rules:
    - id: sops.decrypt
      title: SOPS Decrypt
      description: Block sops -d/--decrypt commands
      phase: before-tool
      match:
        type: bash-command
        pattern: "\\bsops\\s+(-d|--decrypt)\\b"
      defaultAction:
        type: block
        message: "Blocked: `{matched}` — SOPS decrypt may expose secrets."
  ```
- [ ] 3.2 REFACTOR: Verify all tests pass, clean up
- [ ] 3.3 Export `sopsRulePack` from `src/packs/index.ts`

## 4. private-key Rule Pack

> **TDD cycle**: This pack has three rules (one per matcher type) because
> `GuardrailRule.match` is singular (see change-1 spec). Write tests for
> each rule independently.

- [ ] 4.0 RED: Write test file `src/packs/private-key.test.ts` with test cases:
  - `private-key.read-ext` matches `cert.pem`, `server.key`, `cert.p8`, `cert.p12`, `cert.pfx`
  - `private-key.read-ssh-key` matches `~/.ssh/id_rsa`, `~/.ssh/id_ed25519`, `~/.ssh/id_ecdsa`, `~/.ssh/id_dsa`
  - `private-key.read-ssh-dir` matches `~/.ssh/my_custom_key` (predicate matcher)
  - `private-key.read-ssh-dir` does NOT match `~/.ssh/config`, `~/.ssh/known_hosts`, `~/.ssh/authorized_keys`
  - No rule matches `id_rsa.pub`, `id_ed25519.pub`, `key.json`
- [ ] 4.1 GREEN: Create `src/packs/private-key.yaml`:
  ```yaml
  id: private-key
  name: Private Keys
  description: Block access to private key files
  rules:
    - id: private-key.read-ext
      title: Read Private Key (by extension)
      description: Block reading private key files by extension
      phase: before-tool
      match:
        type: file-path
        pattern: "\\.(pem|key|p12|pfx|p8)$"
      defaultAction:
        type: block
        message: "Blocked: attempted to read `{matched}` — private key files may contain secrets."

    - id: private-key.read-ssh-key
      title: Read SSH Private Key
      description: Block reading SSH private key files
      phase: before-tool
      match:
        type: file-path
        pattern: "id_(rsa|ed25519|ecdsa|dsa)$"
      defaultAction:
        type: block
        message: "Blocked: attempted to read `{matched}` — SSH private key files may contain secrets."

    - id: private-key.read-ssh-dir
      title: Read SSH Directory File
      description: Block reading non-public files in ~/.ssh/
      phase: before-tool
      match:
        type: predicate
        predicateName: ssh-private-key
      defaultAction:
        type: block
        message: "Blocked: attempted to read `{matched}` — SSH private key files may contain secrets."
  ```
  The predicate function `ssh-private-key` is registered in `src/packs/predicates.ts`.
- [ ] 4.2 REFACTOR: Verify all tests pass, clean up
- [ ] 4.3 Export `privateKeyRulePack` from `src/packs/index.ts`

## 5. encryption-tools Rule Pack

> **TDD cycle**: Write tests first, watch them fail, then implement.

- [ ] 5.0 RED: Write test file `src/packs/encryption-tools.test.ts` with test cases:
  - `encryption-tools.age` matches `age -d file.age`, `age --decrypt file.age`
  - `encryption-tools.age` does NOT match `age -e file.txt`, `age --version`
  - `encryption-tools.gpg` matches `gpg --decrypt file.gpg`, `gpg -d file.gpg`
  - `encryption-tools.gpg` does NOT match `gpg --encrypt file.txt`, `gpg --list-keys`
  - `encryption-tools.openssl` matches `openssl enc -d -aes-256-cbc -in file.enc`
  - `encryption-tools.openssl` does NOT match `openssl x509 -in cert.pem`, `openssl version`
- [ ] 5.1 GREEN: Create `src/packs/encryption-tools.yaml` with three rules:
  - `encryption-tools.age`: `/\bage\s+(-d|--decrypt)\b/`
  - `encryption-tools.gpg`: `/\bgpg\s+.*(-d|--decrypt)\b/`
  - `encryption-tools.openssl`: `/\bopenssl\s+enc\b.*-d\b/`
- [ ] 5.2 REFACTOR: Verify all tests pass, clean up
- [ ] 5.3 Export `encryptionToolsRulePack` from `src/packs/index.ts`

## 6. secret-managers Rule Pack

> **TDD cycle**: Write tests first, watch them fail, then implement.

- [ ] 6.0 RED: Write test file `src/packs/secret-managers.test.ts` with test cases:
  - `secret-managers.1password` matches `op read op://vault/item`, `op get item`
  - `secret-managers.1password` does NOT match `op signin`, `op list vaults`
  - `secret-managers.gopass` matches `gopass show secret/path`
  - `secret-managers.gopass` does NOT match `gopass list`, `gopass --version`
  - `secret-managers.pass` matches `pass show secret/path`
  - `secret-managers.pass` does NOT match `pass list`, `pass version`
  - `secret-managers.bitwarden` matches `bw get password item`, `bw get item`
  - `secret-managers.bitwarden` does NOT match `bw login`, `bw sync`
- [ ] 6.1 GREEN: Create `src/packs/secret-managers.yaml` with four rules:
  - `secret-managers.1password`: `/\bop\s+(read|get)\b/`
  - `secret-managers.gopass`: `/\bgopass\s+show\b/`
  - `secret-managers.pass`: `/\bpass\s+show\b/`
  - `secret-managers.bitwarden`: `/\bbw\s+(get|list)\s+(password|item|note)\b/`
- [ ] 6.2 REFACTOR: Verify all tests pass, clean up
- [ ] 6.3 Export `secretManagersRulePack` from `src/packs/index.ts`

## 7. hardening Rule Pack

> **TDD cycle**: Write tests first, watch them fail, then implement.
> This pack is defined in YAML like all other built-in packs.

- [ ] 7.0 RED: Write test file `src/packs/hardening.test.ts` with test cases:
  - `hardening.wrapper-eval` matches `eval "cmd"`, `eval "sops -d file"`
  - `hardening.wrapper-eval` does NOT match `echo eval`, `cat script.sh`
  - `hardening.wrapper-bash-c` matches `bash -c 'cmd'`, `sh -c 'cmd'`
  - `hardening.wrapper-bash-c` does NOT match `bash --help`
  - `hardening.wrapper-subshell` matches `$(cmd)`, `` `cmd` ``
  - `hardening.redirect-read-sensitive` matches `cat < .env`, `read < secret.pem`
  - `hardening.redirect-write-sensitive` matches `echo x > .env`, `echo x >> secret.key`
  - `hardening.redirect-write-sensitive` does NOT match `cat file.txt > output.log`
  - `hardening.redirect-tee-sensitive` matches `curl ... | tee .env`
  - Hardening rules are marked `nonOverridable: true`
- [ ] 7.1 GREEN: Create `src/packs/hardening.yaml` with rules:
  - `hardening.wrapper-eval`: `/\beval\b/`
  - `hardening.wrapper-bash-c`: `/\b(bash|sh)\s+-c\b/`
  - `hardening.wrapper-subshell`: `/(\$\(|`)/`
  - `hardening.redirect-read-sensitive`: `/<\s*[^\s]*\.(env|pem|key|p12|pfx|p8)/`
  - `hardening.redirect-write-sensitive`: `/(>|>>)\s*[^\s]*\.(env|pem|key)$/`
  - `hardening.redirect-tee-sensitive`: `/\btee\b[^|]*\.(env|pem|key)/`
  - All with `defaultAction: { type: "block", message: "..." }`
  - Add `nonOverridable: true` to the pack (for future config override system)
- [ ] 7.2 REFACTOR: Verify all tests pass, clean up
- [ ] 7.3 Export `hardeningRulePack` from `src/packs/index.ts`

## 8. Module Exports

- [ ] 8.1 Verify `src/packs/index.ts` exports all individual packs:
  - `envRulePack`, `sopsRulePack`, `privateKeyRulePack`, `encryptionToolsRulePack`, `secretManagersRulePack`, `hardeningRulePack`
- [ ] 8.2 Export `ALL_RULE_PACKS` array combining all packs:
  ```typescript
  export const ALL_RULE_PACKS: RulePack[] = [
    envRulePack,
    sopsRulePack,
    privateKeyRulePack,
    encryptionToolsRulePack,
    secretManagersRulePack,
    hardeningRulePack
  ];
  ```

## 9. Integration Tests (Using Engine from Change 1)

> **TDD cycle**: These tests use `matchAndResolve()` from change-1's engine.
> Write integration tests that verify the full pipeline: normalize → match → resolve.

- [ ] 9.0 RED: Write integration tests in `src/packs/integration.test.ts`:
  - `cat .env` is blocked by `env.read-bash`
  - `sops -d secrets.yaml` is blocked by `sops.decrypt`
  - `age -d file.age` is blocked by `encryption-tools.age`
  - `op read op://vault/item` is blocked by `secret-managers.1password`
  - `eval "sops -d file"` is blocked by `hardening.wrapper-eval`
  - `ls -la` passes through (no match)
  - `cat README.md` passes through (no match)
  - Multi-line: `echo test; cat .env` is blocked (splitCommands + env.read-bash)
  - Hardening rules cannot be overridden (nonOverridable flag is respected)
- [ ] 9.1 GREEN: Verify all integration tests pass with the existing engine
- [ ] 9.2 REFACTOR: Clean up, ensure test isolation

## 10. Documentation

- [ ] 10.1 Create `docs/rule-packs.md` documenting each Rule Pack
- [ ] 10.2 Document pattern syntax and match types (bash-command, file-path, predicate)
- [ ] 10.3 Document which tools/commands are blocked by each pack
- [ ] 10.4 Document hardening pack behavior and force-block semantics
- [ ] 10.5 Document the documented limitation: variable indirection is not caught (deferred to shell tokenizer)
- [ ] 10.6 Add troubleshooting guide for false positives
