# Security Policy

## What Agent Guardrails Is (and Isn't)

Agent Guardrails is a **pattern-based policy engine** for AI coding agent workflows. It intercepts tool calls and matches them against rule packs before execution. Whether that's a genuinely independent security layer or cooperative enforcement depends on the harness: external hook process adapters (Claude Code, Codex) add a boundary the agent can't reach into; in-process plugin adapters (Pi, OpenCode) don't (`tamperResistant`, see [ADR-007](docs/adrs/007-trust-and-self-protection.md)).

It is **not** a security audit tool, a sandbox, or a complete security boundary. Deterministic regex matching cannot catch every adversarial payload.

## Default Posture: Fail-Open, With Fail-Closed Exceptions

An unmatched tool call **allows** by default — a coding agent that halts on every unmatched call is unusable. This is a deliberate trade-off, not an oversight ([ADR-007](docs/adrs/007-trust-and-self-protection.md)). Operators who want a stricter posture can opt in per-category with `defaultDecision`, or wholesale with the `--strict` preset.

The exceptions are unconditional and not configurable: an engine crash or timeout always resolves to `block` on every adapter, and oversized input is rejected by the matcher's `MAX_MATCH_INPUT_LENGTH` cap rather than silently skipped. Neither is derived from `defaultDecision` or any user config — there's no legitimate case for allowing a call the engine failed to evaluate.

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
