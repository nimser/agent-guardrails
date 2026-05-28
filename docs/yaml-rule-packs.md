# YAML Rule Packs

Agent Guardrails uses YAML files to define detection rule packs. YAML was chosen for readability and familiarity (Kubernetes, CI/CD, Ansible).

## Quick Start

```bash
# 1. Install Agent Guardrails
npm install -g agent-guardrails

# 2. Create a packs directory in your project
mkdir -p .agent-guardrails/packs

# 3. Drop a YAML rule pack file
cat > .agent-guardrails/packs/docker-secrets.yaml << 'EOF'
id: docker-secrets
name: Docker Secrets
description: Prevent leaking Docker secrets via --env-file
rules:
  - id: docker.env-file
    title: Docker --env-file usage
    description: Detects docker run with --env-file flag
    phase: before-tool
    match:
      type: bash-command
      pattern: "docker\\s+run.*--env-file"
    action:
      type: suggest
      replacement: "docker run --secret id=mysecret,src=.env"
      message: "Use Docker secrets instead of --env-file to avoid leaking `.env` contents into process listings."
EOF
```

That's it. Your agent is now protected by the custom rule pack.

## Rule Pack Schema

```yaml
# Required: unique pack identifier
id: my-pack

# Required: human-readable name
name: My Rule Pack

# Required: what the pack protects against
description: Prevents dangerous operations related to X

# Required: list of rules
rules:
  - id: my-pack.dangerous-op      # Required: stable rule ID (dotted, unique)
    title: Dangerous Operation     # Required: human-readable
    description: What this catches  # Required: explanation
    phase: before-tool             # Required: before-tool | after-tool
    match:                         # Required: how to detect
      type: bash-command           # bash-command | file-path | predicate
      pattern: "regex-pattern"     # regex string (for bash-command/file-path)
    action:                        # Required: what to do when matched
      type: block                  # allow | block | suggest | run | redact | confirm
      message: "Why this was blocked"
```

## Matcher Types

### bash-command
Matches against the full command string passed to the `bash` tool.
```yaml
match:
  type: bash-command
  pattern: "sops\\s+(-{1,2}d(ecrypt)?)"
```

### file-path
Matches against file path arguments passed to `read`/`write` tools.
```yaml
match:
  type: file-path
  pattern: "\\.env$"
```

### predicate
Function-based matcher for complex logic. Requires JavaScript expression.
```yaml
match:
  type: predicate
  # Predicates cannot be defined in YAML; they require TypeScript rule packs.
  # See "Advanced: TypeScript Rule Packs" below.
```

> **Note:** `predicate` matchers are not supported in YAML rule packs. Use them only in TypeScript-based built-in packs. YAML packs are limited to `bash-command` and `file-path` matchers.

## Action Types

### block
Stops the tool call with no alternative.
```yaml
action:
  type: block
  message: "Blocked: `{matched}` — reading .env files may expose secrets."
```

### suggest
Stops the tool call and suggests a safer alternative.
```yaml
action:
  type: suggest
  replacement: "sed 's/=.*/=[REDACTED]/' {matched}"
  message: "`{matched}` may contain secrets. Try viewing keys without values."
```

### confirm
Prompts the user before allowing (falls back to suggest if harness lacks native confirmation UI).
```yaml
action:
  type: confirm
  message: "Read `{matched}`? It may contain sensitive data."
  fallback:
    type: block
    message: "Blocked: `{matched}` — user confirmation required."
```

## Message Templates

All actions support the `{matched}` placeholder, interpolated at match time:
```yaml
message: "Blocked: `{matched}` — this file may contain secrets."
```

## Phase-Behavior Matrix

Not all behaviors work in all phases:

| Phase | block | suggest | run | redact | confirm |
|-------|-------|---------|-----|--------|---------|
| `before-tool` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `after-tool` | ❌ | ❌ | ❌ | ✅ | ❌ |

## Built-in Rule Packs

Agent Guardrails ships with built-in rule packs covering the most common secret exposure vectors:

| Pack ID | What it catches |
|---------|----------------|
| `env` | `.env` and `.env.*` file reads |
| `sops` | `sops -d` / `sops --decrypt` commands |
| `private-key` | `.pem`, `.key`, SSH key file reads |
| `encryption-tools` | `age -d`, `gpg --decrypt`, `openssl enc -d` |
| `secret-managers` | `op read`, `gopass show`, `pass show`, `bw get` |
| `kubernetes` | `kubectl get secrets`, `kubectl describe secrets` |
| `gh-cli` | `gh secret view`, `gh variable get` |
| `direnv` | `direnv exec`, `source .env` |
| `hardening` | Eval/subshell wrappers, redirects to sensitive paths |

Built-in packs are defined as YAML and shipped with Agent Guardrails. They can be overridden per-rule via `agent-guardrails.json` configuration.

## Overriding Built-in Rules

Override any built-in rule's action in `agent-guardrails.json`:

```json
{
  "rules": {
    "sops.decrypt": { "action": "off" },
    "env.read": { "action": "confirm" }
  }
}
```

See the [configuration documentation](./configuration.md) for full details.

## Contributing Rule Packs

See the [awesome-agent-guardrails](https://github.com/agent-guardrails/awesome-agent-guardrails) repository for community-contributed rule packs and submission guidelines.
