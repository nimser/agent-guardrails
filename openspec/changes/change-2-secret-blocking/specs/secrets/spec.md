# Delta for Secret Blocking

## ADDED Requirements

### Requirement: Stable Rule IDs
The system MUST use stable Rule IDs that can be reused across Behaviors.

#### Scenario: Rule ID stability
- WHEN Rule Packs are defined
- THEN each Rule MUST have a stable Rule ID (e.g., `env.read`, `sops.decrypt`, `private-key.read`)
- AND these Rule IDs MUST be reusable when Actions change (block → suggest → run)

### Requirement: env Rule Pack
The system MUST provide an `env` Rule Pack that blocks .env file access.

#### Scenario: Block .env file read via file-path
- WHEN agent attempts to read `.env` file via read Tool
- THEN the Rule MUST match and produce a `block` Action
- AND the block message MUST include `{matched}` with the actual file path

#### Scenario: Block .env.local file read
- WHEN agent attempts to read `.env.local` file
- THEN the Rule MUST match and produce a `block` Action

#### Scenario: Block .env via bash command
- WHEN agent runs `cat .env`, `bat .env`, `head .env`, `tail .env`, `less .env`, `more .env`
- THEN the Rule MUST match and produce a `block` Action
- AND the block message MUST include `{matched}` with the actual command

#### Scenario: Allow non-env files
- WHEN agent attempts to read `config.json`
- THEN the Rule MUST NOT match

#### Scenario: Allow env in filename
- WHEN agent attempts to read `environment.yaml` or `env.config.js`
- THEN the Rule MUST NOT match

### Requirement: sops Rule Pack
The system MUST provide a `sops` Rule Pack that blocks SOPS decrypt commands.

#### Scenario: Block sops -d command
- WHEN agent runs `sops -d secrets.yaml`
- THEN the Rule MUST match and produce a `block` Action
- AND the block message MUST include `{matched}` with the actual command

#### Scenario: Block sops --decrypt command
- WHEN agent runs `sops --decrypt secrets.yaml`
- THEN the Rule MUST match and produce a `block` Action

#### Scenario: Allow sops -e command
- WHEN agent runs `sops -e secrets.yaml`
- THEN the Rule MUST NOT match

#### Scenario: Allow sops with other flags
- WHEN agent runs `sops --version` or `sops --help`
- THEN the Rule MUST NOT match

### Requirement: private-key Rule Pack
The system MUST provide a `private-key` Rule Pack that blocks private key file access.

#### Scenario: Block .pem file read
- WHEN agent attempts to read `cert.pem`
- THEN the Rule MUST match and produce a `block` Action

#### Scenario: Block .key file read
- WHEN agent attempts to read `server.key`
- THEN the Rule MUST match and produce a `block` Action

#### Scenario: Block .p8, .p12, .pfx file read
- WHEN agent attempts to read `cert.p8`, `cert.p12`, `cert.pfx`
- THEN the Rule MUST match and produce a `block` Action

#### Scenario: Block id_rsa, id_ed25519, id_ecdsa, id_dsa read
- WHEN agent attempts to read `~/.ssh/id_rsa`, `~/.ssh/id_ed25519`, etc.
- THEN the Rule MUST match and produce a `block` Action

#### Scenario: Block any private key in ~/.ssh/
- WHEN agent attempts to read any file in ~/.ssh/ that does NOT end with `.pub` or `.pubkey`
- AND the file is NOT `known_hosts`, `config`, `authorized_keys`
- THEN the Rule MUST use a `predicate` matcher (not regex)
- AND the Rule MUST match and produce a `block` Action

#### Scenario: Allow public key read
- WHEN agent attempts to read `id_rsa.pub`, `id_ed25519.pub`
- THEN the Rule MUST NOT match

#### Scenario: Allow SSH config files
- WHEN agent attempts to read `~/.ssh/config`, `~/.ssh/known_hosts`, `~/.ssh/authorized_keys`
- THEN the Rule MUST NOT match

### Requirement: encryption-tools Rule Pack
The system MUST provide an `encryption-tools` Rule Pack that blocks decrypt commands.

#### Scenario: Block age -d command
- WHEN agent runs `age -d secrets.age` or `age --decrypt secrets.age`
- THEN the Rule MUST match and produce a `block` Action

#### Scenario: Block gpg --decrypt command
- WHEN agent runs `gpg --decrypt secrets.gpg` or `gpg -d secrets.gpg`
- THEN the Rule MUST match and produce a `block` Action

#### Scenario: Block openssl enc -d command
- WHEN agent runs `openssl enc -d -aes-256-cbc -in secrets.enc`
- THEN the Rule MUST match and produce a `block` Action

#### Scenario: Allow gpg encrypt
- WHEN agent runs `gpg --encrypt secrets.txt`
- THEN the Rule MUST NOT match

#### Scenario: Allow openssl other commands
- WHEN agent runs `openssl x509 -in cert.pem`
- THEN the Rule MUST NOT match

### Requirement: secret-managers Rule Pack
The system MUST provide a `secret-managers` Rule Pack that blocks secret retrieval commands.

#### Scenario: Block 1Password read
- WHEN agent runs `op read op://vault/item/field` or `op get item`
- THEN the Rule MUST match and produce a `block` Action

#### Scenario: Block gopass show
- WHEN agent runs `gopass show secret/path`
- THEN the Rule MUST match and produce a `block` Action

#### Scenario: Block pass show
- WHEN agent runs `pass show secret/path`
- THEN the Rule MUST match and produce a `block` Action

#### Scenario: Block Bitwarden get
- WHEN agent runs `bw get password item` or `bw get item`
- THEN the Rule MUST match and produce a `block` Action

#### Scenario: Allow 1Password other commands
- WHEN agent runs `op signin` or `op list vaults`
- THEN the Rule MUST NOT match

#### Scenario: Allow pass/gopass list
- WHEN agent runs `pass list` or `gopass list`
- THEN the Rule MUST NOT match

### Requirement: Rule Pack Export
The system MUST export Rule Packs for Adapter consumption.

#### Scenario: Import all Rule Packs
- WHEN Adapter imports from rule packs (`src/packs/`)
- THEN it MUST receive: envRulePack, sopsRulePack, privateKeyRulePack, encryptionToolsRulePack, secretManagersRulePack

#### Scenario: Import ALL_RULE_PACKS array
- WHEN Adapter imports `ALL_RULE_PACKS` from rule packs (`src/packs/`)
- THEN it MUST receive an array containing all Rule Packs

### Requirement: hardening Rule Pack (Multi-Layer Matching)
The system MUST provide a `hardening` Rule Pack that detects adversarial patterns and sensitive-path redirects, complementing the Layer 2 regex-based secret detection.

See `docs/matching-strategy.md` for the full multi-layer matching strategy specification.

#### Scenario: hardening pack structure
- WHEN the hardening Rule Pack is defined
- THEN it MUST have `id: "hardening"`
- AND it MUST contain rules for wrapper detection and redirect detection
- AND all hardening rules MUST use `phase: "before-tool"`
- AND all hardening rules MUST produce `block` actions

#### Scenario: Block eval wrapper
- WHEN agent runs a command containing `eval` and Layer 1 substring detection also identifies a risky keyword pair
- THEN the `hardening.wrapper-eval` rule MUST match
- AND the action MUST be force-block with message identifying eval as the reason

#### Scenario: Block bash -c / sh -c wrapper
- WHEN agent runs `bash -c 'command'` or `sh -c 'command'`
- THEN the `hardening.wrapper-bash-c` rule MUST match
- AND the action MUST be force-block

#### Scenario: Block command substitution
- WHEN agent runs a command containing `$(...)` or backtick substitution
- THEN the `hardening.wrapper-subshell` rule MUST match
- AND the action MUST be force-block

#### Scenario: Block read-redirect from sensitive path
- WHEN agent runs `cat < .env` or `read < secret.pem`
- THEN the `hardening.redirect-read-sensitive` rule MUST match
- AND the action MUST be force-block

#### Scenario: Block write-redirect to sensitive path
- WHEN agent runs `echo x > .env` or `echo x >> secret.key`
- THEN the `hardening.redirect-write-sensitive` rule MUST match
- AND the action MUST be force-block

#### Scenario: Block tee to sensitive path
- WHEN agent runs `curl ... | tee .env`
- THEN the `hardening.redirect-tee-sensitive` rule MUST match
- AND the action MUST be force-block

#### Scenario: Force-block escalation
- WHEN any hardening rule matches
- THEN the block action CANNOT be overridden by user configuration in `agent-guardrails.json`
- AND the engine MUST mark hardening rule actions as non-overridable
- AND the rationale is "guilty until proven innocent" for adversarial patterns

#### Scenario: Allow safe commands without wrappers
- WHEN agent runs `echo "hello"` or `ls -la`
- THEN no hardening rules MUST match

#### Scenario: Allow legitimate eval usage when no secret keywords present
- WHEN agent runs `eval "echo hello"` (no secret keywords matched by Layer 1)
- THEN the hardening rule MUST still match (eval is always flagged)
- AND users who need legitimate eval MUST disable the entire hardening pack or use a predicate-based exception

### Requirement: Multi-Layer Command Splitting
The system MUST split multi-line and chained commands before matching.

#### Scenario: Split on semicolons
- WHEN agent runs `FILE=.env; cat "$FILE"`
- THEN the engine MUST split on `;` and evaluate each segment independently
- AND the second segment (`cat "$FILE"`) MUST be evaluated against all rules
- NOTE: Variable expansion (`$FILE` → `.env`) is NOT performed — this is deferred to Change 8 (shell tokenizer)

#### Scenario: Split on logical operators
- WHEN agent runs `echo test && cat .env`
- THEN the engine MUST split on `&&` and evaluate each segment independently
- AND the second segment MUST match the env rule

#### Scenario: Split on OR operator
- WHEN agent runs `cat .env || true`
- THEN the engine MUST split on `||` and evaluate the first segment
- AND the first segment MUST match the env rule

#### Scenario: Split on newlines
- WHEN agent runs a multi-line command with `.env` access on one line
- THEN the engine MUST split on `\n` and evaluate each line independently

#### Scenario: Split does not catch variable indirection
- WHEN agent runs `F=".env"; cat "$F"`
- THEN the engine splits into `["F=\".env\"", "cat \"$F\""]`
- AND neither segment matches the env regex (no `.env` literal in `cat "$F"`)
- AND this limitation is documented and deferred to Change 8 (shell tokenizer)

### Requirement: Rule Pack Export
The system MUST export Rule Packs for Adapter consumption, including the hardening pack.

#### Scenario: Import all Rule Packs
- WHEN Adapter imports from rule packs (`src/packs/`)
- THEN it MUST receive: envRulePack, sopsRulePack, privateKeyRulePack, encryptionToolsRulePack, secretManagersRulePack, hardeningRulePack

#### Scenario: Import ALL_RULE_PACKS array
- WHEN Adapter imports `ALL_RULE_PACKS` from rule packs (`src/packs/`)
- THEN it MUST receive an array containing all Rule Packs including hardening

### Requirement: Unit Tests
The system MUST have comprehensive unit tests for all Rule Packs.

#### Scenario: Test env Rules
- WHEN env Rules are tested
- THEN all positive and negative cases MUST pass
- AND both file-path and bash-command Matchers MUST be tested

#### Scenario: Test sops Rules
- WHEN sops Rules are tested
- THEN all positive and negative cases MUST pass

#### Scenario: Test private-key Rules
- WHEN private-key Rules are tested
- THEN all positive and negative cases MUST pass
- AND SSH directory edge cases MUST be tested

#### Scenario: Test encryption-tools Rules
- WHEN encryption-tools Rules are tested
- THEN all positive and negative cases MUST pass
- AND age, gpg, openssl patterns MUST be tested

#### Scenario: Test secret-managers Rules
- WHEN secret-managers Rules are tested
- THEN all positive and negative cases MUST pass
- AND op, gopass, pass, bw patterns MUST be tested

#### Scenario: Test hardening Rules
- WHEN hardening Rules are tested
- THEN wrapper detection positives MUST pass: `eval "sops -d file"`, `bash -c 'cat .env'`, `$(cat .env)`
- AND wrapper detection negatives MUST pass: `echo eval`, `cat script.sh`, `bash --help`
- AND redirect detection positives MUST pass: `cat < .env`, `echo x > secret.key`, `tee output.pem`
- AND redirect detection negatives MUST pass: `cat file.txt > output.log`, `echo hello`
- AND force-block semantics MUST be tested: hardening rules cannot be overridden by config
- AND these tests MUST use partial matcher lists (only `bash-command` and `file-path` handlers registered) for isolation

#### Scenario: Test multi-line splitting
- WHEN multi-line splitting is tested
- THEN `cmd1; cmd2` MUST split into two segments
- THEN `cmd1 && cmd2` MUST split into two segments
- THEN `cmd1 || cmd2` MUST split into two segments
- THEN `cmd1\ncmd2` MUST split into two segments
- AND each segment MUST be evaluated independently against all rules
- AND a match in any segment MUST trigger the rule action
