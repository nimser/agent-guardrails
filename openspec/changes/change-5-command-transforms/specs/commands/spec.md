## ADDED Requirements

### Requirement: Safer Command Registry
The system MUST maintain a registry of safer command alternatives.

#### Scenario: Registry structure
- **WHEN** the SAFER_COMMANDS registry is loaded
- **THEN** it MUST contain entries with:
  - `name: string` - Unique identifier
  - `detect: RegExp` - Command detection pattern
  - `saferCmds: (originalCmd: string) => SaferCommand[]` - Transformation function returning multiple alternatives
  - `description: string` - Human-readable description

### Requirement: findSaferCommands Function
The system MUST provide a function to find multiple safer alternatives.

#### Scenario: Find safer commands
- **WHEN** `findSaferCommands(command)` is called with a dangerous command
- **THEN** it MUST return an array of `SaferCommand` objects sorted by confidence

#### Scenario: SaferCommand structure
- **WHEN** a `SaferCommand` is returned
- **THEN** it MUST have:
  - `command: string` - The safer command to run
  - `description: string` - What this alternative does
  - `confidence: number` - 0-1, higher = more likely to be what user wants

### Requirement: Env Read Detection
The system MUST detect commands that read .env files and suggest redacted alternatives.

#### Scenario: Cat .env detected
- **WHEN** command matches `\b(cat|bat|head|tail|less|more|type)\b.*\.env\b`
- **THEN** system MUST suggest multiple alternatives:
  - `sed 's/=.*/=[REDACTED]/' .env` (full redaction, high confidence)
  - `head -c 4 .env && echo '...'` (first 4 chars, medium confidence)
  - `grep -c '=' .env` (count keys, low confidence)

### Requirement: SOPS Decrypt Detection
The system MUST detect `sops -d` commands and suggest redacted alternatives.

#### Scenario: SOPS decrypt detected
- **WHEN** command matches `\bsops\s+(-d|--decrypt)\b`
- **THEN** system MUST suggest multiple alternatives:
  - `sops -d {file} | sed 's/:.*/: [REDACTED]/'` (full redaction)
  - `sops -d {file} | grep -o '.{0,4}password.{0,4}'` (limited context)

#### Scenario: SOPS with --output-type flag
- **WHEN** command is `sops -d --output-type json secrets.yaml`
- **THEN** system MUST preserve the `--output-type` flag in suggestions
- AND redaction format MUST match the specified output type

### Requirement: Kubectl Secrets Detection
The system MUST detect `kubectl get secrets` commands and suggest redacted alternatives.

#### Scenario: Kubectl secrets detected
- **WHEN** command matches `\bkubectl\s+(get\s+secrets?|describe\s+secrets?)\b`
- **THEN** system MUST suggest adding `-o jsonpath='{.data}' | jq 'map_values(@base64d | "[REDACTED]")'`

### Requirement: Vault Read Detection
The system MUST detect `vault kv get` commands and suggest redacted alternatives.

#### Scenario: Vault read detected
- **WHEN** command matches `\bvault\s+(kv\s+)?(get|read)\b`
- **THEN** system MUST suggest adding `-format=json | jq '.data.data | map_values("[REDACTED]")'`

### Requirement: Private Key Detection
The system MUST detect commands reading private key files.

#### Scenario: Private key read detected
- **WHEN** command matches `\b(cat|bat|head|tail|less)\b.*\.(pem|key|p12|pfx|p8)\b`
- **THEN** system MUST suggest: `head -5 {file} && echo "... [truncated]"`

### Requirement: Smart Piped Command Detection
The system MUST detect when piped commands already have proper precautions.

#### Scenario: Allow grep with limited context
- **WHEN** command is `sops -d secrets.yaml | grep -o '.{0,4}password.{0,4}'`
- **THEN** system MUST return empty array (no suggestions needed)

#### Scenario: Allow head/tail limiting
- **WHEN** command is `sops -d secrets.yaml | head -5`
- **THEN** system MUST return empty array (no suggestions needed)

#### Scenario: Allow word count
- **WHEN** command is `sops -d secrets.yaml | wc -l`
- **THEN** system MUST return empty array (no suggestions needed)

#### Scenario: Allow line count
- **WHEN** command is `sops -d secrets.yaml | grep -c '='`
- **THEN** system MUST return empty array (no suggestions needed)

#### Scenario: Block grep without context limit
- **WHEN** command is `sops -d secrets.yaml | grep password`
- **THEN** system MUST still suggest alternatives (grep without -o shows full line)

### Requirement: Flag Preservation
The system MUST preserve command flags in safer alternatives.

#### Scenario: SOPS with flags
- **WHEN** command is `sops -d --output-type yaml secrets.yaml`
- **THEN** safer alternative MUST preserve the `--output-type yaml` flag

#### Scenario: SOPS with age key
- **WHEN** command is `sops -d --age age1... secrets.yaml`
- **THEN** safer alternative MUST preserve the `--age` flag
