# Delta for Secret Blocking

## ADDED Requirements

### Requirement: Stable Rule IDs
The system MUST use stable rule IDs that can be reused across behaviors.

#### Scenario: Rule ID stability
- WHEN rule packs are defined
- THEN each rule MUST have a stable ID (e.g., `env.read`, `sops.decrypt`, `private-key.read`)
- AND these IDs MUST be reusable when actions change (block → suggest → run)

### Requirement: env Rule Pack
The system MUST provide an `env` rule pack that blocks .env file access.

#### Scenario: Block .env file read via file-path
- WHEN agent attempts to read `.env` file via read tool
- THEN the rule MUST match and produce a `block` action

#### Scenario: Block .env.local file read
- WHEN agent attempts to read `.env.local` file
- THEN the rule MUST match and produce a `block` action

#### Scenario: Block .env via bash command
- WHEN agent runs `cat .env`, `bat .env`, `head .env`, `tail .env`, `less .env`, `more .env`
- THEN the rule MUST match and produce a `block` action

#### Scenario: Allow non-env files
- WHEN agent attempts to read `config.json`
- THEN the rule MUST NOT match

#### Scenario: Allow env in filename
- WHEN agent attempts to read `environment.yaml` or `env.config.js`
- THEN the rule MUST NOT match

### Requirement: sops Rule Pack
The system MUST provide a `sops` rule pack that blocks SOPS decrypt commands.

#### Scenario: Block sops -d command
- WHEN agent runs `sops -d secrets.yaml`
- THEN the rule MUST match and produce a `block` action

#### Scenario: Block sops --decrypt command
- WHEN agent runs `sops --decrypt secrets.yaml`
- THEN the rule MUST match and produce a `block` action

#### Scenario: Allow sops -e command
- WHEN agent runs `sops -e secrets.yaml`
- THEN the rule MUST NOT match

#### Scenario: Allow sops with other flags
- WHEN agent runs `sops --version` or `sops --help`
- THEN the rule MUST NOT match

### Requirement: private-key Rule Pack
The system MUST provide a `private-key` rule pack that blocks private key file access.

#### Scenario: Block .pem file read
- WHEN agent attempts to read `cert.pem`
- THEN the rule MUST match and produce a `block` action

#### Scenario: Block .key file read
- WHEN agent attempts to read `server.key`
- THEN the rule MUST match and produce a `block` action

#### Scenario: Block .p8, .p12, .pfx file read
- WHEN agent attempts to read `cert.p8`, `cert.p12`, `cert.pfx`
- THEN the rule MUST match and produce a `block` action

#### Scenario: Block id_rsa, id_ed25519, id_ecdsa, id_dsa read
- WHEN agent attempts to read `~/.ssh/id_rsa`, `~/.ssh/id_ed25519`, etc.
- THEN the rule MUST match and produce a `block` action

#### Scenario: Block any private key in ~/.ssh/
- WHEN agent attempts to read any file in ~/.ssh/ that does NOT end with `.pub` or `.pubkey`
- AND the file is NOT `known_hosts`, `config`, `authorized_keys`, `known_hosts.old`
- THEN the rule MUST match and produce a `block` action

#### Scenario: Allow public key read
- WHEN agent attempts to read `id_rsa.pub`, `id_ed25519.pub`
- THEN the rule MUST NOT match

#### Scenario: Allow SSH config files
- WHEN agent attempts to read `~/.ssh/config`, `~/.ssh/known_hosts`
- THEN the rule MUST NOT match

### Requirement: encryption-tools Rule Pack
The system MUST provide an `encryption-tools` rule pack that blocks decrypt commands.

#### Scenario: Block age -d command
- WHEN agent runs `age -d secrets.age` or `age --decrypt secrets.age`
- THEN the rule MUST match and produce a `block` action

#### Scenario: Block gpg --decrypt command
- WHEN agent runs `gpg --decrypt secrets.gpg` or `gpg -d secrets.gpg`
- THEN the rule MUST match and produce a `block` action

#### Scenario: Block openssl enc -d command
- WHEN agent runs `openssl enc -d -aes-256-cbc -in secrets.enc`
- THEN the rule MUST match and produce a `block` action

#### Scenario: Allow gpg encrypt
- WHEN agent runs `gpg --encrypt secrets.txt`
- THEN the rule MUST NOT match

#### Scenario: Allow openssl other commands
- WHEN agent runs `openssl x509 -in cert.pem`
- THEN the rule MUST NOT match

### Requirement: secret-managers Rule Pack
The system MUST provide a `secret-managers` rule pack that blocks secret retrieval commands.

#### Scenario: Block 1Password read
- WHEN agent runs `op read op://vault/item/field` or `op get item`
- THEN the rule MUST match and produce a `block` action

#### Scenario: Block gopass show
- WHEN agent runs `gopass show secret/path`
- THEN the rule MUST match and produce a `block` action

#### Scenario: Block pass show
- WHEN agent runs `pass show secret/path`
- THEN the rule MUST match and produce a `block` action

#### Scenario: Block Bitwarden get
- WHEN agent runs `bw get password item` or `bw get item`
- THEN the rule MUST match and produce a `block` action

#### Scenario: Allow 1Password other commands
- WHEN agent runs `op signin` or `op list vaults`
- THEN the rule MUST NOT match

#### Scenario: Allow pass/gopass list
- WHEN agent runs `pass list` or `gopass list`
- THEN the rule MUST NOT match

### Requirement: Rule Pack Export
The system MUST export rule packs for adapter consumption.

#### Scenario: Import all rule packs
- WHEN adapter imports from `@agent-guardrails/secrets`
- THEN it MUST receive: envRulePack, sopsRulePack, privateKeyRulePack, encryptionToolsRulePack, secretManagersRulePack

#### Scenario: Import ALL_RULE_PACKS array
- WHEN adapter imports `ALL_RULE_PACKS` from `@agent-guardrails/secrets`
- THEN it MUST receive an array containing all rule packs

### Requirement: Unit Tests
The system MUST have comprehensive unit tests for all rule packs.

#### Scenario: Test env rules
- WHEN env rules are tested
- THEN all positive and negative cases MUST pass
- AND both file-path and bash-command matchers MUST be tested

#### Scenario: Test sops rules
- WHEN sops rules are tested
- THEN all positive and negative cases MUST pass

#### Scenario: Test private-key rules
- WHEN private-key rules are tested
- THEN all positive and negative cases MUST pass
- AND SSH directory edge cases MUST be tested

#### Scenario: Test encryption-tools rules
- WHEN encryption-tools rules are tested
- THEN all positive and negative cases MUST pass
- AND age, gpg, openssl patterns MUST be tested

#### Scenario: Test secret-managers rules
- WHEN secret-managers rules are tested
- THEN all positive and negative cases MUST pass
- AND op, gopass, pass, bw patterns MUST be tested
