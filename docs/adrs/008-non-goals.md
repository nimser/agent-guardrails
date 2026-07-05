---
status: accepted
---

# ADR-008: Non-Goals

## Context

Once a security-adjacent project positions itself against fuller platforms (sandboxing daemons, policy-as-code engines), contributors and evaluators start comparing feature lists and proposing "closing the gap" on things that were never this project's shape to build. Non-goals are architectural decisions with rationale — they belong here, in ADR form, not folded into `SECURITY.md`, which is a disclosure/reporting document, not a scope-setting one.

## Decision

Agent Guardrails will **not** build:

- **A security boundary.** The project is a steering layer: it changes what happens on the calls that run, it does not guarantee containment against an adversarial agent. In-process adapters share the agent's process; even out-of-process hook adapters read user-editable config. The companion pairing is explicit: **agentjail** answers "can the agent do X at all" with a fail-closed daemon and kernel-backed tiers (containment); **never-inject credential proxies** keep registered secrets out of the flow entirely — never-inject what you know about, redact what you didn't. See `LIMITATIONS.md` for the full statement per adapter.
- **A policy-as-code engine.** No Rego/OPA, no Cedar. Those are authorization languages — allow/deny verdicts over principal–action–resource. This project's value is in _transformations with payloads_ (`suggest` carries a replacement, `redact` carries a rewrite, `run` carries a substitution), which have no natural home in an authorization language: they end up as strings smuggled inside policy results. The authoring surface is YAML rules plus registered TypeScript predicates (ADR-005) — the lowest contribution barrier in the field, for an audience of individual developers dropping a file in a folder, not security teams auditing shared org policy.
- **A daemon process.** The engine is a pure function invoked synchronously inside an adapter's hook call. A long-running daemon is a different architecture (process lifecycle, IPC, privilege separation) built for a containment guarantee this project doesn't claim. That is agentjail's shape, not ours.
- **An auto-update mechanism.** Agent Guardrails ships as a library/CLI installed via npm; version management is the package manager's job.
- **A telemetry service.** No usage data leaves the user's machine. Tier 2/3 observability (ADR-006) is a local, opt-in event log — not a service this project operates or receives data from.
- **A local UI server.** No always-on process to serve a dashboard. `npx ag stats` (ADR-006) is a one-shot CLI query over a local file, not a server.
- **A network egress proxy.** Filtering outbound network traffic requires a process positioned in the network path (or a kernel-level hook) — a fundamentally different architecture than intercepting events inside an agent harness. Pair with an OS-level sandbox or network-policy tool for this.
- **A secrets broker.** Agent Guardrails detects and blocks/redacts secret access; it does not vault, rotate, or issue credentials. That's a distinct product category this project integrates around (`secret-managers` rule pack), not replaces.

## Rationale

- **Each exclusion matches an architecture, not a feature checklist.** Every item above requires a persistent process, privileged position, service boundary, or language runtime this project's "pure function inside an adapter hook" shape doesn't have and isn't trying to grow into.
- **The security-boundary exclusion is a positioning decision, not just an architecture one.** Claiming a boundary invites an adversarial evaluation standard the in-process architecture cannot meet; ceding it — and naming the companions that do meet it — converts the structural weakness into a credibility feature.
- **Naming the exclusions pre-empts scope creep.** Without a written non-goals list, every gap versus a fuller platform reads as an oversight to be closed rather than a deliberate boundary.
- **This is a living boundary, not a permanent one.** If the project's architecture changes, these non-goals should be revisited, not assumed permanent.

## Consequences

- Feature requests matching any bullet above should be closed with a pointer to this ADR, not silently ignored or endlessly re-litigated.
- `SECURITY.md` and `LIMITATIONS.md` link here instead of restating this list.
- README carries the honesty line: a steering layer, not a sandbox — pair with agentjail for containment.
- Rule authoring stays YAML + TypeScript predicates; proposals to adopt a policy language are out of scope.
