name: Bug Report
description: Report something that isn't working as expected
labels: [bug]
body:

- type: markdown
  attributes:
  value: |
  Thanks for taking the time to fill out this bug report.

- type: textarea
  id: what-happened
  attributes:
  label: What happened?
  description: Describe the unexpected behavior. Include the rule pack, command, or file path involved.
  placeholder: "The env rule pack should block `cat .env` but..."
  validations:
  required: true

- type: textarea
  id: expected
  attributes:
  label: What did you expect to happen?
  placeholder: "I expected the tool call to be blocked with message..."
  validations:
  required: true

- type: input
  id: version
  attributes:
  label: Agent Guardrails version
  placeholder: "commit hash or version tag"
  validations:
  required: false

- type: input
  id: harness
  attributes:
  label: AI harness
  description: Which AI coding agent were you using? (Pi, OpenCode, Codex, etc.)
  placeholder: "Pi v0.x"
  validations:
  required: false

- type: textarea
  id: reproduce
  attributes:
  label: Steps to reproduce
  description: |
  Minimal reproduction. Include the ToolCallContext (tool name, command, file path) and the rule pack involved.
  render: typescript
  validations:
  required: true

- type: textarea
  id: logs
  attributes:
  label: Relevant log output
  render: shell
  validations:
  required: false
