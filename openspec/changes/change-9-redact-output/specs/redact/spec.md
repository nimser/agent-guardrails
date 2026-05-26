# Delta for Redact Output

## ADDED Requirements

### Requirement: Secret Detection in Output
The system MUST detect secrets in tool output.

#### Scenario: Detect AWS key in output
- WHEN tool output contains `AKIAIOSFODNN7EXAMPLE`
- THEN system MUST flag it as a secret

#### Scenario: Detect GitHub token in output
- WHEN tool output contains `ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh`
- THEN system MUST flag it as a secret

### Requirement: Redaction Markers
The system MUST replace secrets with descriptive markers.

#### Scenario: Redact AWS key
- WHEN AWS key is detected
- THEN it MUST be replaced with `[REDACTED: AWS Access Key]`

#### Scenario: Redact GitHub token
- WHEN GitHub token is detected
- THEN it MUST be replaced with `[REDACTED: GitHub Token]`

### Requirement: Pattern-Based Redaction
The system MUST replace known secret patterns with redaction markers.

#### Scenario: Redact all known patterns
- WHEN content matches any SecretRule pattern
- THEN the match MUST be replaced with `[REDACTED: {rule description}]`

### Requirement: Entropy-Based Redaction
The system MUST redact high-entropy strings near secret-related keywords.

#### Scenario: Redact high-entropy password
- WHEN content contains `password: "aB3$xY7!mN9@pQ2^wZ5&"`
- THEN the high-entropy value MUST be replaced with `[REDACTED]`

#### Scenario: Preserve non-secret keywords
- WHEN content contains `username: "john.doe@example.com"`
- THEN the content MUST NOT be redacted (low entropy)

### Requirement: Command Suggestion
The system MUST suggest safer alternatives for dangerous commands.

#### Scenario: Suggest safer sops command
- WHEN `redactCommand("sops -d secrets.yaml")` is called
- THEN it MUST return `"sops -d secrets.yaml | sed 's/:.*/: [REDACTED]/'"`

#### Scenario: Suggest safer cat .env command
- WHEN `redactCommand("cat .env")` is called
- THEN it MUST return `"sed 's/=.*/=[REDACTED]/' .env"`

### Requirement: Redaction Preservation
The system MUST preserve non-secret content while removing sensitive values.

#### Scenario: Preserve structure
- WHEN redacting `api_key: "AKIAIOSFODNN7EXAMPLE"\nregion: "us-east-1"`
- THEN the result MUST be `api_key: [REDACTED: AWS Access Key]\nregion: "us-east-1"`

#### Scenario: Preserve formatting
- WHEN redacting multi-line content with secrets
- THEN line breaks and indentation MUST be preserved

### Requirement: PostToolUse Hook (opencode)
The system MUST redact output in opencode's `tool.execute.after`.

#### Scenario: Redact in opencode
- WHEN tool output contains secrets
- THEN `output.result` MUST be modified with redacted content

### Requirement: PostToolUse Hook (Pi)
The system MUST redact output in Pi's `tool_result`.

#### Scenario: Redact in Pi
- WHEN tool output contains secrets
- THEN `tool_result` content MUST be overridden with redacted content

### Requirement: Performance
The system MUST redact content efficiently.

#### Scenario: Small content performance
- WHEN redacting content < 100KB
- THEN redaction MUST complete in < 10ms

#### Scenario: Large content handling
- WHEN redacting content > 1MB
- THEN redaction MUST use streaming to avoid memory issues
