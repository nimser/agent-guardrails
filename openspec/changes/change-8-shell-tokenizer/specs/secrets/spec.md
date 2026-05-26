## MODIFIED Requirements

### Requirement: env Rule Pack
The system MUST provide an `env` Rule Pack that blocks .env file access. Matching MUST operate on tokenized command structure, not raw command strings.

#### Scenario: Block .env file read via file-path
- **WHEN** agent attempts to read `.env` file via read Tool
- **THEN** the Rule MUST match and produce a `block` Action
- **AND** the block message MUST include `{matched}` with the actual file path

#### Scenario: Block .env.local file read
- **WHEN** agent attempts to read `.env.local` file
- **THEN** the Rule MUST match and produce a `block` Action

#### Scenario: Block .env via bash command
- **WHEN** agent runs `cat .env`, `bat .env`, `head .env`, `tail .env`, `less .env`, `more .env`
- **THEN** the Rule MUST match and produce a `block` Action
- **AND** the block message MUST include `{matched}` with the actual command

#### Scenario: Block .env via stdin redirect
- **WHEN** agent runs `cat < .env` or `head < .env`
- **THEN** the Rule MUST match the stdin redirect source `.env` and produce a `block` Action

#### Scenario: Block .env via quote concatenation
- **WHEN** agent runs `cat .e"nv"` or `cat '.e'nv`
- **THEN** the tokenizer MUST resolve the concatenation to `.env`
- **AND** the Rule MUST match and produce a `block` Action

#### Scenario: Block .env via subshell
- **WHEN** agent runs `echo $(cat .env)` or `` echo `cat .env` ``
- **THEN** the tokenizer MUST detect the subshell marker
- **AND** the engine MUST block with a subshell rewrite message

#### Scenario: Allow non-env files
- **WHEN** agent attempts to read `config.json`
- **THEN** the Rule MUST NOT match

#### Scenario: Allow env in filename
- **WHEN** agent attempts to read `environment.yaml` or `env.config.js`
- **THEN** the Rule MUST NOT match

### Requirement: sops Rule Pack
The system MUST provide a `sops` Rule Pack that blocks SOPS decrypt commands. Matching MUST operate on tokenized command structure.

#### Scenario: Block sops -d command
- **WHEN** agent runs `sops -d secrets.yaml`
- **THEN** the Rule MUST match and produce a `block` Action

#### Scenario: Block sops --decrypt command
- **WHEN** agent runs `sops --decrypt secrets.yaml`
- **THEN** the Rule MUST match and produce a `block` Action

#### Scenario: Block sops decrypt in pipeline
- **WHEN** agent runs `sops -d secrets.yaml | grep password`
- **THEN** the Rule MUST match the `sops -d` stage and produce a `block` Action
- **AND** `grep password` without output limiting MUST NOT be treated as a safe pipe

#### Scenario: Allow sops -e command
- **WHEN** agent runs `sops -e secrets.yaml`
- **THEN** the Rule MUST NOT match

#### Scenario: Allow sops with other flags
- **WHEN** agent runs `sops --version` or `sops --help`
- **THEN** the Rule MUST NOT match

### Requirement: private-key Rule Pack
The system MUST provide a `private-key` Rule Pack that blocks private key file access.

#### Scenario: Block .pem file read
- **WHEN** agent attempts to read `cert.pem`
- **THEN** the Rule MUST match and produce a `block` Action

#### Scenario: Block .key file read
- **WHEN** agent attempts to read `server.key`
- **THEN** the Rule MUST match and produce a `block` Action

#### Scenario: Block .p8, .p12, .pfx file read
- **WHEN** agent attempts to read `cert.p8`, `cert.p12`, `cert.pfx`
- **THEN** the Rule MUST match and produce a `block` Action

#### Scenario: Block id_rsa, id_ed25519, id_ecdsa, id_dsa read
- **WHEN** agent attempts to read `~/.ssh/id_rsa`, `~/.ssh/id_ed25519`, etc.
- **THEN** the Rule MUST match and produce a `block` Action

#### Scenario: Block any private key in ~/.ssh/
- **WHEN** agent attempts to read any file in ~/.ssh/ that does NOT end with `.pub` or `.pubkey`
- **AND** the file is NOT `known_hosts`, `config`, `authorized_keys`
- **THEN** the Rule MUST match and produce a `block` Action

#### Scenario: Block private key via stdin redirect
- **WHEN** agent runs `cat < ~/.ssh/id_rsa`
- **THEN** the Rule MUST match the stdin redirect source and produce a `block` Action

#### Scenario: Allow public key read
- **WHEN** agent attempts to read `id_rsa.pub`, `id_ed25519.pub`
- **THEN** the Rule MUST NOT match

#### Scenario: Allow SSH config files
- **WHEN** agent attempts to read `~/.ssh/config`, `~/.ssh/known_hosts`, `~/.ssh/authorized_keys`
- **THEN** the Rule MUST NOT match

### Requirement: encryption-tools Rule Pack
The system MUST provide an `encryption-tools` Rule Pack that blocks decrypt commands.

#### Scenario: Block age -d command
- **WHEN** agent runs `age -d secrets.age` or `age --decrypt secrets.age`
- **THEN** the Rule MUST match and produce a `block` Action

#### Scenario: Block gpg --decrypt command
- **WHEN** agent runs `gpg --decrypt secrets.gpg` or `gpg -d secrets.gpg`
- **THEN** the Rule MUST match and produce a `block` Action

#### Scenario: Block openssl enc -d command
- **WHEN** agent runs `openssl enc -d -aes-256-cbc -in secrets.enc`
- **THEN** the Rule MUST match and produce a `block` Action

#### Scenario: Allow gpg encrypt
- **WHEN** agent runs `gpg --encrypt secrets.txt`
- **THEN** the Rule MUST NOT match

#### Scenario: Allow openssl other commands
- **WHEN** agent runs `openssl x509 -in cert.pem`
- **THEN** the Rule MUST NOT match

### Requirement: secret-managers Rule Pack
The system MUST provide a `secret-managers` Rule Pack that blocks secret retrieval commands.

#### Scenario: Block 1Password read
- **WHEN** agent runs `op read op://vault/item/field` or `op get item`
- **THEN** the Rule MUST match and produce a `block` Action

#### Scenario: Block gopass show
- **WHEN** agent runs `gopass show secret/path`
- **THEN** the Rule MUST match and produce a `block` Action

#### Scenario: Block pass show
- **WHEN** agent runs `pass show secret/path`
- **THEN** the Rule MUST match and produce a `block` Action

#### Scenario: Block Bitwarden get
- **WHEN** agent runs `bw get password item` or `bw get item`
- **THEN** the Rule MUST match and produce a `block` Action

#### Scenario: Allow 1Password other commands
- **WHEN** agent runs `op signin` or `op list vaults`
- **THEN** the Rule MUST NOT match

#### Scenario: Allow pass/gopass list
- **WHEN** agent runs `pass list` or `gopass list`
- **THEN** the Rule MUST NOT match
