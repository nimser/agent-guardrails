> **TDD MANDATE**: All requirements below MUST be implemented via RED→GREEN→REFACTOR
> vertical slices. Write one failing test, implement minimal code to pass, refactor.
> See `.agents/skills/tdd/SKILL.md`.
>
> **FORMAT**: Rule packs remain in YAML format (`src/packs/*.yaml`). TypeScript
> is used only for resolver logic (`src/resolver/safer-commands.ts`,
> `src/resolver/sops-format.ts`). See Change 1 Decision 16.

## ADDED Requirements

### Requirement: Safer Command Registry
The system MUST maintain a registry of safer command alternatives.

#### Scenario: Registry structure
- **WHEN** the SAFER_COMMANDS registry is loaded
- **THEN** it MUST contain entries with:
  - `name: string` - Unique identifier
  - `detect: RegExp` - Command detection pattern
  - `saferCmd: (originalCmd: string) => string | null` - Transformation function returning a single safer command or null
  - `description: string` - Human-readable description

### Requirement: findSaferCommand Function
The system MUST provide a function to find a single safer alternative.

#### Scenario: Find safer command
- **WHEN** `findSaferCommand(command)` is called with a dangerous command
- **THEN** it MUST return a `string` (the safer command) or `null` (no known alternative)

#### Scenario: No safer command found
- **WHEN** `findSaferCommand(command)` returns `null`
- **THEN** the engine MUST fall back to `block` via the Action Fallback Chain
- **AND** the block message MUST be: `"Blocked: \`{matched}\` — no safer alternative available."`

### Requirement: Env Read Detection
The system MUST detect commands that read .env files and suggest redacted alternatives.

#### Scenario: Cat .env detected
- **WHEN** command matches `\b(cat|bat|head|tail|less|more|type)\b.*\.env\b`
- **THEN** system MUST suggest: `sed 's/=.*/=[REDACTED]/' {matched}`

### Requirement: SOPS Decrypt Detection
The system MUST detect `sops -d` commands and suggest format-aware redacted alternatives.

#### Scenario: SOPS decrypt with YAML file
- **WHEN** command is `sops -d secrets.yaml` (YAML detected from extension)
- **THEN** system MUST suggest: `sops -d secrets.yaml | sed 's/:.*/: [REDACTED]/'`

#### Scenario: SOPS decrypt with JSON file
- **WHEN** command is `sops -d secrets.json` (JSON detected from extension)
- **THEN** system MUST suggest: `sops -d secrets.json | jq 'walk(if type == "string" then "[REDACTED]" else . end)'`

#### Scenario: SOPS decrypt with ENV file
- **WHEN** command is `sops -d secrets.env` (ENV detected from extension)
- **THEN** system MUST suggest: `sops -d secrets.env | sed 's/=.*/=[REDACTED]/'`

#### Scenario: SOPS with --output-type flag
- **WHEN** command is `sops -d --output-type json secrets.yaml`
- **THEN** system MUST use JSON redaction format regardless of file extension

#### Scenario: SOPS with --input-type flag
- **WHEN** command is `sops -d --input-type json` (with stdin or no file extension)
- **THEN** system MUST use JSON redaction format

#### Scenario: SOPS format detection priority
- **WHEN** determining SOPS output format
- **THEN** the system MUST check in this order:
  1. `--output-type` flag (highest priority)
  2. `--input-type` flag
  3. File extension from last non-flag argument
  4. If none available → return null → fall back to block

#### Scenario: SOPS with no detectable format
- **WHEN** command is `echo "..." | sops -d` (stdin, no extension, no type flags)
- **THEN** `findSaferCommand()` MUST return `null`
- **AND** engine MUST fall back to block

### Requirement: Kubectl Secrets Detection
The system MUST detect `kubectl get secrets` commands and suggest redacted alternatives.

#### Scenario: Kubectl secrets detected
- **WHEN** command matches `\bkubectl\s+(get\s+secrets?|describe\s+secrets?)\b`
- **THEN** system MUST suggest adding `-o jsonpath='{.data}' | jq 'map_values(@base64d | "[REDACTED]")'`

### Requirement: GitHub CLI Secret Detection
The system MUST detect `gh secret view` commands and suggest safer alternatives.

#### Scenario: gh secret view detected
- **WHEN** command matches `\bgh\s+secret\s+view\b`
- **THEN** system MUST suggest: `gh secret list` (list names without values)

#### Scenario: gh variable view detected
- **WHEN** command matches `\bgh\s+variable\s+get\b`
- **THEN** system MUST suggest: `gh variable list` (list names without values)

#### Scenario: Allow gh secret list
- **WHEN** command is `gh secret list` or `gh secret set`
- **THEN** system MUST NOT block

### Requirement: direnv/dotenv Detection
The system MUST detect commands that source or evaluate .env files via direnv or dotenv.

#### Scenario: direnv exec detected
- **WHEN** command matches `\bdirenv\s+exec\b`
- **THEN** system MUST block with message about .env evaluation

#### Scenario: source .env detected
- **WHEN** command matches `\b(source|\.)\s+\.env\b`
- **THEN** system MUST suggest: `sed 's/=.*/=[REDACTED]/' .env` (view keys without values)

### Requirement: Private Key Detection
The system MUST detect commands reading private key files.

#### Scenario: Private key read detected
- **WHEN** command matches `\b(cat|bat|head|tail|less)\b.*\.(pem|key|p12|pfx|p8)\b`
- **THEN** system MUST suggest: `head -5 {file} && echo "... [truncated]"`

### Requirement: Smart Piped Command Detection (Deferred)

Smart Piped Command Detection is deferred to post-MVP. All piped commands that match dangerous patterns WILL be blocked/suggested, even if they have precautions.

#### Scenario: Deferred behavior
- **WHEN** a piped command like `sops -d secrets.yaml | head -5` is encountered
- **THEN** the system WILL treat it as a regular match and suggest/block accordingly
- **AND** proper Smart Piped Detection will be added post-MVP with shell tokenizer

### Requirement: Flag Preservation
The system MUST preserve command flags in safer alternatives.

#### Scenario: SOPS with --output-type
- **WHEN** command is `sops -d --output-type json secrets.yaml`
- **THEN** safer alternative MUST use JSON redaction format based on the flag
- **AND** the replacement MUST include the `--output-type json` flag

#### Scenario: SOPS with --input-type
- **WHEN** command is `sops -d --input-type json` (with stdin)
- **THEN** safer alternative MUST use JSON redaction format based on the flag

#### Scenario: SOPS with age key
- **WHEN** command is `sops -d --age age1... secrets.yaml`
- **THEN** safer alternative MUST preserve the `--age` flag
