---
status: accepted
---

# ADR-008: Non-Goals

## Context

Once a security-adjacent project positions itself against a fuller platform (e.g. a
sandboxing daemon like agentjail), contributors and evaluators start comparing feature
lists and proposing "closing the gap" on things that were never this project's shape to
build. Non-goals are architectural decisions with rationale — they belong here, in ADR
form, not folded into `SECURITY.md`, which is a disclosure/reporting document, not a
scope-setting one.

## Decision

Agent Guardrails will **not** build:

- **A daemon process.** The engine is a pure function invoked synchronously inside an
  adapter's hook call. A long-running daemon is a different architecture (process
  lifecycle, IPC, privilege separation) built for a different guarantee
  (`tamperResistant` containment) this project doesn't claim (see ADR-007). This is
  agentjail's shape, not ours.
- **An auto-update mechanism.** Agent Guardrails ships as a library/CLI installed via
  npm; version management is the package manager's job, not this project's.
- **A telemetry service.** No usage data leaves the user's machine. Tier 2/3
  observability (ADR-006) is a local, opt-in event log — not a service this project
  operates or receives data from.
- **A local UI server.** No always-on process to serve a dashboard. `npx ag stats`
  (ADR-006) is a one-shot CLI query over a local file, not a server.
- **A network egress proxy.** Filtering outbound network traffic requires a process
  positioned in the network path (or a kernel-level hook), which is a fundamentally
  different architecture than intercepting tool calls inside an agent harness's
  process. Pair with an OS-level sandbox or network-policy tool for this.
- **A secrets broker.** Agent Guardrails detects and blocks/redacts secret access; it
  does not vault, rotate, or issue credentials. That's a distinct product category
  (e.g. a secrets manager) this project integrates around (`secret-managers` rule
  pack), not replaces.

## Rationale

- **Each exclusion matches an architecture, not a feature checklist.** Every item
  above requires a persistent process, privileged position, or service boundary this
  project's "pure function inside an adapter hook" shape doesn't have and isn't trying
  to grow into.
- **Naming the exclusions pre-empts scope creep.** Without a written non-goals list,
  every gap versus a fuller platform reads as an oversight to be closed rather than a
  deliberate boundary.
- **This is a living boundary, not a permanent one.** If the project's architecture
  changes (e.g. splitting into multiple packages, per `future-architecture-decisions.md`),
  these non-goals should be revisited, not assumed permanent.

## Consequences

- Feature requests matching any bullet above should be closed with a pointer to this
  ADR, not silently ignored or endlessly re-litigated.
- `SECURITY.md` links here instead of restating this list.
- `README.md`'s scope framing (ADR-002's Mediation Scope decision) and this ADR say
  the same thing from two angles: what the project claims to do (ADR-002), and what it
  explicitly won't build (this ADR).
