# Security Policy

## What Agent Guardrails Is (and Isn't)

Agent Guardrails is a **pattern-based policy engine** for AI coding agent workflows. It provides defense-in-depth by intercepting tool calls and matching them against rule packs before execution.

It is **not** a security audit tool, a sandbox, or a complete security boundary. Deterministic regex matching cannot catch every adversarial payload.

Depending on your own security model's needs, you could look into pairing it with (non-exhaustive):

- An OS-level sandbox or command-gating tool
- Network-level controls (egress filtering, proxy rules)
- Credential scanning in repositories
- Human review for sensitive operations
- Least-privilege access for the agent's execution environment

See [`docs/adrs/008-non-goals.md`](docs/adrs/008-non-goals.md) for what this project deliberately does not build.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅        |

## Reporting a Vulnerability

Open a **public GitHub issue** for any issue with rule packs, matchers, defaults, false negatives, or missing coverage. The reproducer is usually most of the fix, and the community can contribute improvements.

In rare cases where the issue isn't a rule bypass but a fundamental flaw in how the engine itself processes invocations (for example, a condition that silently disables all rule matching), report privately:

- **Email**: security-agent-guardrails「at」nwo「dot」pm
- **GitHub Security Advisory**: Use the repository's private advisory feature

### What to Include

- The affected rule pack, matcher, or behavior
- A reproduction case (command, file path, or `ToolCallContext` that should be blocked but isn't)
- Expected vs. actual behavior
- Severity assessment (bypass, false negative, false positive, etc.)
- If requesting private disclosure, a short justification against the criteria above

### What to Expect

Reports are triaged on a best-effort basis. Reports closed as `wontfix` will include a rationale, typically noting the issue falls under Known Limitations or is out of scope.

## Known Limitations

- Regex-based matchers can be evaded via shell tricks (command substitution, string concatenation, alternative tools). The `hardening` rule pack catches many of these via Layer 3 wrapper detection, but not all.
- After-tool redaction is the backstop for cases the engine cannot predict. It requires the harness to support the `redact` behavior.
- No rule pack covers every secret type or tool. The project ships with common patterns; users should extend rule packs for their specific stack.
