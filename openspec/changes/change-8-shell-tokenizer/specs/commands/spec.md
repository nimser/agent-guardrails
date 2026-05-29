## MODIFIED Requirements

### Requirement: findSaferCommand Function
The system MUST provide a function to find a single **Safer Alternative**. The function MUST operate on the tokenized command structure when available.

#### Scenario: Find **Safer Alternative**
- **WHEN** `findSaferCommand(command)` is called with a dangerous command
- **THEN** it MUST return a `string` (the **Safer Alternative**) or `null` (no known alternative)

#### Scenario: Find **Safer Alternative** with tokenized input
- **WHEN** the engine has already tokenized the command
- **THEN** `findSaferCommand` MUST use the parsed structure (file argument, flags) to construct the **Safer Alternative**
- **AND** it MUST NOT re-parse the raw command string

### Requirement: Smart Piped Command Detection
The system MUST detect when piped commands already have proper precautions, using pipeline stage analysis from the tokenizer.

#### Scenario: Allow head with limited lines
- **WHEN** command is `sops -d secrets.yaml | head -5`
- **AND** the last pipeline stage is `head -N` where N is within the configured threshold
- **THEN** the system MUST return no **Safer Alternative** (effectively allowing the command)
- **AND** the engine MUST NOT block

#### Scenario: Allow word count
- **WHEN** command is `sops -d secrets.yaml | wc -l`
- **AND** the last pipeline stage is `wc` with any flags
- **THEN** the system MUST return no **Safer Alternative**

#### Scenario: Allow grep count
- **WHEN** command is `sops -d secrets.yaml | grep -c '='`
- **AND** the last pipeline stage is `grep -c`
- **THEN** the system MUST return no **Safer Alternative**

#### Scenario: Allow grep with limited context
- **WHEN** command is `sops -d secrets.yaml | grep -o '.{0,4}password.{0,4}'`
- **AND** the `grep -o` pattern context limit is within the configured threshold
- **THEN** the system MUST return no **Safer Alternative**

#### Scenario: Block grep without context limit
- **WHEN** command is `sops -d secrets.yaml | grep password`
- **AND** `grep` does not have `-c` or `-o` with limited context
- **THEN** the system MUST still produce a **Safer Alternative** or block

#### Scenario: Block unbounded head
- **WHEN** command is `sops -d secrets.yaml | head -100`
- **AND** N exceeds the configured threshold
- **THEN** the system MUST produce a **Safer Alternative** or block

#### Scenario: Pipeline stage analysis uses tokenizer
- **WHEN** analyzing a piped command for safety
- **THEN** the system MUST use the tokenizer's pipeline stage output
- **AND** it MUST NOT use regex on the raw command string

### Requirement: SOPS Output-Type Handling
The system MUST parse `--output-type` and `--input-type` flags from the tokenized command to determine format-aware redaction format.

#### Scenario: SOPS with --output-type flag
- **WHEN** command is `sops -d --output-type json secrets.yaml`
- **THEN** the tokenizer MUST identify `--output-type` as a flag with value `json`
- **AND** the **Safer Alternative** MUST use JSON-appropriate redaction

#### Scenario: SOPS with --input-type flag
- **WHEN** command is `sops -d --input-type yaml secrets.enc`
- **THEN** the tokenizer MUST identify `--input-type` as a flag with value `yaml`
- **AND** the **Safer Alternative** MUST use YAML-appropriate redaction (when no --output-type is present)

#### Scenario: SOPS with no format flags and no file extension
- **WHEN** command is `echo "encrypted" | sops -d` (stdin, no file, no format flags)
- **THEN** `findSaferCommand` MUST return `null`
- **AND** the engine MUST fall back to block with the generic contextual message
