# Delta for Secret Blocking

> **TDD**: See `.agents/skills/tdd/SKILL.md`. Every requirement below MUST be
> implemented via RED→GREEN→REFACTOR vertical slices. Write one failing test,
> then minimal code to pass, then refactor. Never write all tests first.

## ADDED Requirements

### Requirement: Stable Rule IDs
The system MUST use stable Rule IDs that can be reused across Behaviors.

#### Scenario: Rule ID stability
- WHEN Rule Packs are defined
- THEN each Rule MUST have a stable Rule ID (e.g., `env.read`, `sops.decrypt`, `private-key.read`)
- AND these Rule IDs MUST be reusable when Actions change (block → suggest → run)

### Requirement: Rule Pack Format (YAML)

> **Design Decision 16 (change-1) is authoritative**: All built-in rule packs
> are defined as **YAML files** in `src/packs/` and loaded via
> `src/infrastructure/yaml-pack-loader.ts`. This is non-negotiable — it lowers
> contribution barrier, enables community ecosystem, and ensures consistency.
> See `docs/yaml-rule-packs.md` for the full YAML schema.

#### Scenario: Built-in pack format
- WHEN a built-in rule pack is defined
- THEN it MUST be a `.yaml` file in `src/packs/`
- AND it MUST conform to the YAML rule pack schema
- AND it MUST be loaded via `yaml-pack-loader.ts` at bootstrap

#### Scenario: Predicate augmentation for YAML packs
- WHEN a YAML rule pack needs a matcher that cannot be expressed as regex
  (e.g., SSH directory heuristic in `private-key` pack)
- THEN the YAML `match` block MUST use `type: predicate` with `predicateName: <name>`
- AND the named predicate function MUST be registered in `src/packs/predicates.ts`
- AND `yaml-pack-loader.ts` MUST resolve the name to the runtime function at load time
- AND unregistered predicate names MUST produce a clear error at load time

### Requirement: env Rule Pack
The system MUST provide an `env` Rule Pack that blocks .env file access.

#### Scenario: Block .env file read via file-path
- WHEN agent attempts to read `.env` file via read Tool
- THEN the `env.read` Rule MUST match and produce a `block` Action
- AND the block message MUST include `{matched}` with the actual file path

#### Scenario: Block .env.local file read
- WHEN agent attempts to read `.env.local` file
- THEN the `env.read` Rule MUST match and produce a `block` Action

#### Scenario: Block .env via bash command
- WHEN agent runs `cat .env`, `bat .env`, `head .env`, `tail .env`, `less .env`, `more .env`
- THEN the `env.read-bash` Rule MUST match and produce a `block` Action
- AND the block message MUST include `{matched}` with the actual command

#### Scenario: Allow non-env files
- WHEN agent attempts to read `config.json`
- THEN neither `env.read` nor `env.read-bash` MUST match

#### Scenario: Allow env in filename
- WHEN agent attempts to read `environment.yaml` or `env.config.js`
- THEN neither `env.read` nor `env.read-bash` MUST match

### Requirement: sops Rule Pack
The system MUST provide a `sops` Rule Pack that blocks SOPS decrypt commands.

#### Scenario: Block sops -d command
- WHEN agent runs `sops -d secrets.yaml`
- THEN the `sops.decrypt` Rule MUST match and produce a `block` Action
- AND the block message MUST include `{matched}` with the actual command

#### Scenario: Block sops --decrypt command
- WHEN agent runs `sops --decrypt secrets.yaml`
- THEN the `sops.decrypt` Rule MUST match and produce a `block` Action

#### Scenario: Allow sops -e command
- WHEN agent runs `sops -e secrets.yaml`
- THEN the `sops.decrypt` Rule MUST NOT match

#### Scenario: Allow sops with other flags
- WHEN agent runs `sops --version` or `sops --help`
- THEN the `sops.decrypt` Rule MUST NOT match

### Requirement: private-key Rule Pack
The system MUST provide a `private-key` Rule Pack that blocks private key file access.

> **Note on predicate matcher**: The SSH directory rule uses a `predicate`
> matcher (see "Predicate augmentation" requirement above). The YAML file
> references `predicateName: ssh-private-key` and the function is registered
> in `src/packs/predicates.ts`.

#### Scenario: Block .pem/.key/.p8/.p12/.pfx file read
- WHEN agent attempts to read `cert.pem`, `server.key`, `cert.p8`, `cert.p12`, `cert.pfx`
- THEN the `private-key.read-ext` Rule MUST match and produce a `block` Action
- AND this Rule uses a `file-path` matcher (regex, fully expressible in YAML)

#### Scenario: Block id_rsa, id_ed25519, id_ecdsa, id_dsa read
- WHEN agent attempts to read `~/.ssh/id_rsa`, `~/.ssh/id_ed25519`, etc.
- THEN the `private-key.read-ssh-key` Rule MUST match and produce a `block` Action
- AND this Rule uses a `file-path` matcher (regex, fully expressible in YAML)

#### Scenario: Block any private key in ~/.ssh/
- WHEN agent attempts to read any file in ~/.ssh/ that does NOT end with `.pub` or `.pubkey`
- AND the file is NOT `known_hosts`, `config`, `authorized_keys`
- THEN the `private-key.read-ssh-dir` Rule MUST match and produce a `block` Action
- AND this Rule uses `type: predicate` with `predicateName: ssh-private-key`
- AND the predicate function MUST be registered in `src/packs/predicates.ts`

#### Scenario: Allow public key read
- WHEN agent attempts to read `id_rsa.pub`, `id_ed25519.pub`
- THEN no `private-key` Rules MUST match

#### Scenario: Allow SSH config files
- WHEN agent attempts to read `~/.ssh/config`, `~/.ssh/known_hosts`, `~/.ssh/authorized_keys`
- THEN no `private-key` Rules MUST match

### Requirement: encryption-tools Rule Pack
The system MUST provide an `encryption-tools` Rule Pack that blocks decrypt commands.

#### Scenario: Block age -d command
- WHEN agent runs `age -d secrets.age` or `age --decrypt secrets.age`
- THEN the `encryption-tools.age` Rule MUST match and produce a `block` Action

#### Scenario: Block gpg --decrypt command
- WHEN agent runs `gpg --decrypt secrets.gpg` or `gpg -d secrets.gpg`
- THEN the `encryption-tools.gpg` Rule MUST match and produce a `block` Action

#### Scenario: Block openssl enc -d command
- WHEN agent runs `openssl enc -d -aes-256-cbc -in secrets.enc`
- THEN the `encryption-tools.openssl` Rule MUST match and produce a `block` Action

#### Scenario: Allow gpg encrypt
- WHEN agent runs `gpg --encrypt secrets.txt`
- THEN no `encryption-tools` Rules MUST match

#### Scenario: Allow openssl other commands
- WHEN agent runs `openssl x509 -in cert.pem`
- THEN no `encryption-tools` Rules MUST match

### Requirement: secret-managers Rule Pack
The system MUST provide a `secret-managers` Rule Pack that blocks secret retrieval commands.

#### Scenario: Block 1Password read
- WHEN agent runs `op read op://vault/item/field` or `op get item`
- THEN the `secret-managers.1password` Rule MUST match and produce a `block` Action

#### Scenario: Block gopass show
- WHEN agent runs `gopass show secret/path`
- THEN the `secret-managers.gopass` Rule MUST match and produce a `block` Action

#### Scenario: Block pass show
- WHEN agent runs `pass show secret/path`
- THEN the `secret-managers.pass` Rule MUST match and produce a `block` Action

#### Scenario: Block Bitwarden get
- WHEN agent runs `bw get password item` or `bw get item`
- THEN the `secret-managers.bitwarden` Rule MUST match and produce a `block` Action

#### Scenario: Allow 1Password other commands
- WHEN agent runs `op signin` or `op list vaults`
- THEN no `secret-managers` Rules MUST match

#### Scenario: Allow pass/gopass list
- WHEN agent runs `pass list` or `gopass list`
- THEN no `secret-managers` Rules MUST match

### Requirement: hardening Rule Pack (Multi-Layer Matching)
The system MUST provide a `hardening` Rule Pack that detects adversarial patterns and sensitive-path redirects.

See `docs/matching-strategy.md` for the full multi-layer matching strategy specification.

#### Scenario: hardening pack structure
- WHEN the hardening Rule Pack is defined
- THEN it MUST have `id: "hardening"`
- AND it MUST be a YAML file (`src/packs/hardening.yaml`)
- AND it MUST contain rules for wrapper detection and redirect detection
- AND all hardening rules MUST use `phase: "before-tool"`
- AND all hardening rules MUST produce `block` actions

#### Scenario: Block eval wrapper
- WHEN agent runs a command containing `eval`
- THEN the `hardening.wrapper-eval` Rule MUST match
- AND the action MUST be force-block

#### Scenario: Block bash -c / sh -c wrapper
- WHEN agent runs `bash -c 'command'` or `sh -c 'command'`
- THEN the `hardening.wrapper-bash-c` Rule MUST match
- AND the action MUST be force-block

#### Scenario: Block command substitution
- WHEN agent runs a command containing `$(...)` or backtick substitution
- THEN the `hardening.wrapper-subshell` Rule MUST match
- AND the action MUST be force-block

#### Scenario: Block read-redirect from sensitive path
- WHEN agent runs `cat < .env` or `read < secret.pem`
- THEN the `hardening.redirect-read-sensitive` Rule MUST match
- AND the action MUST be force-block

#### Scenario: Block write-redirect to sensitive path
- WHEN agent runs `echo x > .env` or `echo x >> secret.key`
- THEN the `hardening.redirect-write-sensitive` Rule MUST match
- AND the action MUST be force-block

#### Scenario: Block tee to sensitive path
- WHEN agent runs `curl ... | tee .env`
- THEN the `hardening.redirect-tee-sensitive` Rule MUST match
- AND the action MUST be force-block

#### Scenario: Force-block escalation
- WHEN any hardening Rule matches
- THEN the block action CANNOT be overridden by user configuration
- AND the engine MUST mark hardening rule actions as non-overridable

#### Scenario: Allow safe commands without wrappers
- WHEN agent runs `echo "hello"` or `ls -la`
- THEN no hardening Rules MUST match

### Requirement: Multi-Layer Command Splitting
The system MUST split multi-line and chained commands before matching via `splitCommands()` from change-1 (`src/matcher/command-splitter.ts`). This change validates splitting works correctly with the rules defined here.

#### Scenario: Split on semicolons
- WHEN agent runs `FILE=.env; cat "$FILE"`
- THEN the engine MUST split on `;` and evaluate each segment independently
- AND the second segment MUST be evaluated against all rules
- NOTE: Variable expansion is NOT performed — deferred to Change 8

#### Scenario: Split on logical operators
- WHEN agent runs `echo test && cat .env`
- THEN the engine MUST split on `&&` and the second segment MUST match `env.read-bash`

#### Scenario: Split on OR operator
- WHEN agent runs `cat .env || true`
- THEN the first segment MUST match `env.read-bash`

#### Scenario: Split on newlines
- WHEN agent runs a multi-line command with `.env` access on one line
- THEN the engine MUST split on `\n` and evaluate each line independently

### Requirement: Rule Pack Export
The system MUST export all loaded Rule Packs for Adapter consumption.

#### Scenario: Import all Rule Packs
- WHEN Adapter imports from `src/packs/index.ts`
- THEN it MUST receive: envRulePack, sopsRulePack, privateKeyRulePack, encryptionToolsRulePack, secretManagersRulePack, hardeningRulePack
- AND these exports MUST be the loaded RulePack objects (from YAML)

#### Scenario: Import ALL_RULE_PACKS array
- WHEN Adapter imports `ALL_RULE_PACKS` from `src/packs/index.ts`
- THEN it MUST receive an array containing all loaded Rule Packs

### Requirement: Unit Tests
The system MUST have comprehensive unit tests for all Rule Packs.

#### Scenario: Test env Rules
- WHEN env Rules are tested
- THEN all positive and negative cases MUST pass
- AND both `file-path` and `bash-command` Matchers MUST be tested

#### Scenario: Test private-key Rules
- WHEN private-key Rules are tested
- THEN all three rules MUST be tested independently: `read-ext`, `read-ssh-key`, `read-ssh-dir`
- AND the `ssh-private-key` predicate MUST be tested in isolation
- AND SSH directory edge cases MUST be tested

#### Scenario: Test hardening Rules
- WHEN hardening Rules are tested
- THEN wrapper detection positives MUST pass
- AND wrapper detection negatives MUST pass
- AND force-block semantics MUST be tested
- AND tests MUST use isolated MatcherRegistry instances

#### Scenario: Test YAML loading
- WHEN YAML rule pack loading is tested
- THEN each `.yaml` file MUST parse without errors
- AND predicate names MUST resolve successfully
- AND unregistered predicate names MUST throw clear errors

#### Scenario: Test multi-line splitting with rules
- WHEN splitting is tested with the rules defined in this change
- THEN `echo test && sops -d file.yaml` MUST match `sops.decrypt` on the second segment
