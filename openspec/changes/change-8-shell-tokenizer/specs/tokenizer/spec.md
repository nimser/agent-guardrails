## ADDED Requirements

### Requirement: ParsedCommand Interface
The system MUST define a `ParsedCommand` interface as the output of the tokenizer.

#### Scenario: ParsedCommand structure
- **WHEN** a command string is tokenized
- **THEN** the result MUST be a `ParsedCommand` with:
  - `stages: Token[][]` — pipeline stages separated by `|`
  - `operators: ("&&" | "||" | ";" | "|")[]` — operators between stages
  - `redirects: Redirect[]` — redirect operations detected
  - `hasSubshell: boolean` — whether subshell markers were detected

#### Scenario: Token structure
- **WHEN** a token is produced
- **THEN** it MUST have:
  - `type: "word" | "flag" | "glob"` — token classification
  - `value: string` — resolved value (quotes stripped, concatenation resolved)
  - `raw: string` — original text from the command string

#### Scenario: Redirect structure
- **WHEN** a redirect is detected
- **THEN** it MUST have:
  - `type: "stdin" | "stdout" | "stderr" | "both"` — redirect direction
  - `source?: string` — file path for stdin redirects (`< file`)
  - `target?: string` — file path for stdout redirects (`> file`, `>> file`)

### Requirement: Basic Command Tokenization
The system MUST tokenize simple commands into word tokens.

#### Scenario: Simple command
- **WHEN** input is `cat .env`
- **THEN** output MUST have one stage with tokens: `[{ value: "cat", raw: "cat", type: "word" }, { value: ".env", raw: ".env", type: "word" }]`
- **AND** `hasSubshell` MUST be `false`
- **AND** `redirects` MUST be empty

#### Scenario: Command with flags
- **WHEN** input is `sops -d --output-type json secrets.yaml`
- **THEN** tokens MUST include `-d` and `--output-type` as `type: "flag"`
- **AND** `json` and `secrets.yaml` as `type: "word"`

### Requirement: Quote Resolution
The system MUST resolve quoted strings, stripping the quote characters and concatenating the content.

#### Scenario: Double-quoted string
- **WHEN** input is `cat "my file.env"`
- **THEN** the second token MUST have `value: "my file.env"` and `raw: "\"my file.env\""`

#### Scenario: Single-quoted string
- **WHEN** input is `cat '.env'`
- **THEN** the second token MUST have `value: ".env"` and `raw: "'.env'"`

#### Scenario: Quote concatenation evasion
- **WHEN** input is `cat .e"nv"`
- **THEN** the second token MUST have `value: ".env"` (quotes resolved, concatenation applied)
- **AND** the engine MUST match this against `.env` file-path rules

#### Scenario: Mixed quotes
- **WHEN** input is `cat "my"'file.env'`
- **THEN** the token MUST resolve to `value: "myfile.env"`

### Requirement: Pipeline Splitting
The system MUST split commands on pipe (`|`) into separate stages.

#### Scenario: Simple pipe
- **WHEN** input is `cat .env | grep password`
- **THEN** output MUST have two stages: `[[cat, .env], [grep, password]]`
- **AND** operators MUST contain `"|"`

#### Scenario: Multi-stage pipe
- **WHEN** input is `sops -d secrets.yaml | grep password | head -5`
- **THEN** output MUST have three stages
- **AND** operators MUST contain two `"|"` entries

### Requirement: Operator Detection
The system MUST detect shell operators between commands.

#### Scenario: Logical AND
- **WHEN** input is `cat .env && echo done`
- **THEN** output MUST have two stages with `"&&"` in operators

#### Scenario: Logical OR
- **WHEN** input is `cat .env || echo failed`
- **THEN** output MUST have two stages with `"||"` in operators

#### Scenario: Command separator
- **WHEN** input is `cat .env; echo done`
- **THEN** output MUST have two stages with `";"` in operators

### Requirement: Redirect Detection
The system MUST detect stdin and stdout redirects.

#### Scenario: Stdin redirect
- **WHEN** input is `cat < .env`
- **THEN** redirects MUST contain `{ type: "stdin", source: ".env" }`
- **AND** the engine MUST evaluate file-path matchers against `.env` as the source

#### Scenario: Stdout redirect
- **WHEN** input is `cat .env > output.txt`
- **THEN** redirects MUST contain `{ type: "stdout", target: "output.txt" }`

#### Scenario: Append redirect
- **WHEN** input is `cat .env >> output.txt`
- **THEN** redirects MUST contain `{ type: "stdout", target: "output.txt" }`

### Requirement: Subshell Marker Detection
The system MUST detect subshell markers before full tokenization.

#### Scenario: Dollar-paren subshell
- **WHEN** input contains `$(...)`
- **THEN** `hasSubshell` MUST be `true`
- **AND** the engine MUST block with message indicating subshell presence

#### Scenario: Backtick subshell
- **WHEN** input contains backtick-delimited command substitution
- **THEN** `hasSubshell` MUST be `true`

#### Scenario: Variable expansion
- **WHEN** input contains `${...}`
- **THEN** `hasSubshell` MUST be `true`

#### Scenario: Simple dollar variable
- **WHEN** input is `echo $HOME`
- **THEN** `hasSubshell` MUST be `false` (simple variable reference, not expansion syntax)

#### Scenario: Heredoc without subshell
- **WHEN** input contains `<<EOF` with no `$(...)` inside
- **THEN** `hasSubshell` MUST be `false`
- **AND** the command MUST NOT be blocked for subshell reasons

### Requirement: Subshell Block Message
The system MUST provide a clear block message when a subshell is detected.

#### Scenario: Block message content
- **WHEN** a subshell is detected in command `git log --oneline $(cat refs.txt)`
- **THEN** the block message MUST identify the construct type (`subshell ($())`)
- **AND** the message MUST instruct the agent to rewrite without nested commands

### Requirement: Zero External Dependencies
The tokenizer MUST be implemented without external dependencies.

#### Scenario: Dependency check
- **WHEN** the tokenizer module is checked
- **THEN** it MUST NOT import any external npm packages
- **AND** it MUST be implemented in pure TypeScript

### Requirement: Tokenizer Performance
The tokenizer MUST complete within acceptable time bounds.

#### Scenario: Typical command
- **WHEN** input is a command under 500 characters
- **THEN** tokenization MUST complete in under 5ms

#### Scenario: Malformed input
- **WHEN** input contains unmatched quotes or incomplete constructs
- **THEN** the tokenizer MUST NOT hang or throw uncaught exceptions
- **AND** it MUST return a best-effort parse or a tokenizer error (engine falls back to block)
