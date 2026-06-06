# Writing Rule Packs

Rule packs are YAML files that tell Agent Guardrails what to watch for and what to do when a match is found. They're the primary way to contribute — no TypeScript required.

This guide covers the format. For the _why_ behind rule packs, see [ADR-005](adrs/005-yaml-rule-packs.md).

## Quick Start

```bash
# Create a packs directory in your project
mkdir -p .agent-guardrails/packs

# Write your rule pack
cat > .agent-guardrails/packs/docker-secrets.yaml << 'EOF'
id: docker-secrets
name: Docker Secrets Protection
description: Prevent leaking Docker secrets via --env-file

rules:
  - id: docker.env-file
    title: Block --env-file in docker run
    description: Catches docker run with --env-file, which exposes .env contents in process listings
    phase: before-tool
    match:
      type: bash-command
      pattern: "docker\\s+run.*--env-file"
    defaultAction:
      type: suggest
      replacement: "docker run --secret id=mysecret,src=.env"
      message: "Use Docker secrets instead of --env-file. `{matched}` exposes .env contents."
EOF
```

## The Schema

```yaml
# ─── Pack metadata ───
id: my-pack # Unique identifier (kebab-case)
name: My Rule Pack # Human-readable name
description: What this protects # Explains the pack's purpose

# ─── Rules ───
rules:
  - id: my-pack.rule-name # Stable dotted ID (pack.rule)
    title: Short title # Appears in match reports
    description: What this catches and why it matters
    phase: before-tool # before-tool or after-tool
    match:
      type: bash-command # bash-command or file-path
      pattern: "regex-here" # Regex matching the tool call input
    defaultAction:
      type: block # block, suggest, run, redact, or confirm
      message: "Why this was stopped. `{matched}` triggered the rule."
```

## Matcher Types

### bash-command

Matches against the full command string passed to the `bash` tool. Best for catching dangerous CLI usage.

```yaml
match:
  type: bash-command
  pattern: "sops\\s+(-{1,2}d(ecrypt)?)"
```

The pattern is a regex. Use `\\s+` for whitespace, `\\b` for word boundaries.

### file-path

Matches against file path arguments in `read`/`write` tool calls. Best for protecting sensitive files.

```yaml
match:
  type: file-path
  pattern: "\\.env$"
```

### predicate (TypeScript only)

Function-based matcher for complex logic. Can't be expressed in YAML — requires a predicate function registered in TypeScript via the `PredicateRegistry`, referenced by `predicateName` in the YAML `match` block. Used when regex isn't expressive enough (e.g., multi-field conditions or external state checks).

## Action Types

### block — Stop it, no alternative

```yaml
defaultAction:
  type: block
  message: "Blocked: `{matched}` exposes secrets."
```

### suggest — Stop it, offer a safer alternative

```yaml
defaultAction:
  type: suggest
  replacement: "sed 's/=.*/=[REDACTED]/' {matched}"
  message: "`{matched}` may contain secrets. Try viewing keys without values."
```

### confirm — Ask the user

```yaml
defaultAction:
  type: confirm
  message: "Read `{matched}`? It may contain sensitive data."
  fallback:
    type: block
    message: "Blocked: `{matched}` — confirmation required."
```

## Message Templates

Use `{matched}` in any message field. At match time, it's replaced with the actual command or file path that triggered the rule:

```yaml
message: "Blocked: `{matched}` — this file may contain secrets."
# → "Blocked: `cat .env.production` — this file may contain secrets."
```

## Phase-Behavior Matrix

Not every action works in every phase:

| Phase         | block | suggest | run | redact | confirm |
| ------------- | :---: | :-----: | :-: | :----: | :-----: |
| `before-tool` |  ✅   |   ✅    | ✅  |   ❌   |   ✅    |
| `after-tool`  |  ❌   |   ❌    | ❌  |   ✅   |   ❌    |

`before-tool` fires _before_ the command runs (most common). `after-tool` fires after and can only redact output. Invalid combinations are rejected at load time.

## Built-in Rule Packs

Agent Guardrails ships with these packs out of the box:

| Pack ID            | What it catches                                      |
| ------------------ | ---------------------------------------------------- |
| `env`              | `.env` and `.env.*` file reads                       |
| `sops`             | `sops -d` / `sops --decrypt` commands                |
| `private-key`      | `.pem`, `.key`, SSH key file reads                   |
| `encryption-tools` | `age -d`, `gpg --decrypt`, `openssl enc -d`          |
| `secret-managers`  | `op read`, `gopass show`, `pass show`, `bw get`      |
| `kubernetes`       | `kubectl get secrets`, `kubectl describe secrets`    |
| `gh-cli`           | `gh secret view`, `gh variable get`                  |
| `direnv`           | `direnv exec`, `source .env`                         |
| `hardening`        | Eval/subshell wrappers, redirects to sensitive paths |

## Overriding Built-in Rules

You can disable or change any built-in rule in `agent-guardrails.json`:

```json
{
  "rules": {
    "sops.decrypt": { "action": "off" },
    "env.read": { "action": "confirm" }
  }
}
```

## Defense in Depth Tip

For maximum coverage, pair `bash-command` and `file-path` matchers on the same concern:

```yaml
rules:
  # Catch `cat .env`, `less .env`, etc.
  - id: env.cat
    phase: before-tool
    match:
      type: bash-command
      pattern: "\\b(cat|less|more|head|tail)\\s+[^|&]*\\.env"
    defaultAction:
      type: block
      message: "Blocked: `{matched}` may expose secrets."

  # Also catch direct `read` tool calls on .env files
  - id: env.read
    phase: before-tool
    match:
      type: file-path
      pattern: "\\.env(\\..+)?$"
    defaultAction:
      type: block
      message: "Blocked: reading `{matched}` may expose secrets."
```

The first catches shell commands; the second catches agents that use harness-native file reading tools instead of `bash`.

## Contributing a Rule Pack

1. Write a YAML file following the schema above
2. Test it locally with `npm test`
3. Submit a PR — the easiest contribution path

Community packs are curated in [awesome-agent-guardrails](https://github.com/nimser/awesome-agent-guardrails).
