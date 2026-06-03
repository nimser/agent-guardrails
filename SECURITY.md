# Security Policy

## What Agent Guardrails Is (and Isn't)

Agent Guardrails is a **pattern-based policy engine** for AI coding agent workflows. It provides defense-in-depth by intercepting tool calls and matching them against rule packs before execution.

It is **not** a security audit tool, a sandbox, or a complete security boundary. Deterministic regex matching cannot catch every adversarial payload. It should be combined with:

- Network-level controls (egress filtering, proxy rules)
- Credential scanning in repositories
- Human review for sensitive operations
- Least-privilege access for the agent's execution environment

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅        |

## Reporting a Vulnerability

If you discover a security issue — such as a rule pack that can be bypassed, or an unsafe default — please report it **privately**:

1. **Email**: [security contact TBD]
2. **GitHub Security Advisory**: Use the repository's private advisory feature

Do **not** open a public issue for security vulnerabilities.

### What to Include

- The affected rule pack, matcher, or behavior
- A reproduction case (command, file path, or ToolCallContext that should be blocked but isn't)
- The expected vs. actual behavior
- Your assessment of severity (bypass, false negative, false positive, etc.)

### Response Timeline

- **Acknowledge**: Within 48 hours
- **Triage**: Within 1 week
- **Fix**: Depends on severity — critical bypasses are prioritized

## Known Limitations

- Regex-based matchers can be evaded via shell tricks (command substitution, string concatenation, alternative tools). The `hardening` rule pack catches many of these via Layer 3 wrapper detection, but not all.
- After-tool redaction is the backstop for cases the engine cannot predict. It requires the harness to support the `redact` behavior.
- No rule pack covers every secret type or tool. The project ships with common patterns; users should extend rule packs for their specific stack.
