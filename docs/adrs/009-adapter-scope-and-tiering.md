---
status: accepted
---

# ADR-009: Adapter Scope and Tiering

## Context

Every adapter is a maintenance commitment that scales with its harness's churn: hook APIs change, capability surfaces grow, version floors move. The project's differentiators — the capability model and fallback chains — justify themselves across _unequal_ harnesses, but they don't require the project to own an adapter for every harness that exists. The scope question is: which adapters does this project ship and maintain, and how does everything else integrate?

## Decision

### Tier 1 — Shipped and maintained by this project

- **Pi** — the primary adapter. An in-process TypeScript plugin with a live handle into the running session: `run`, `redact`, `confirm`, `redactUserInput`, and turn-halting all bind natively. Pi is also an uncontested niche — no other guardrail project supports it.
- **Claude Code** — external hooks, out-of-process. Its hook API natively binds all five behaviors: `permissionDecision: "deny"` (`block`/`suggest`), `updatedInput` (`run`), `updatedToolOutput` ≥ 2.1.121 (`redact`), `permissionDecision: "ask"` (`confirm`), and `UserPromptSubmit` (`user-input`). The adapter is thin because the mechanisms are native.

### Tier 2 — Stable interface, community-owned implementations

Any other harness (OpenCode, Codex, Cursor, …) integrates by implementing the published adapter interface: normalize harness events into `ToolCallContext`, declare `HarnessCapabilities`, and translate resolved `GuardrailAction`s into harness mechanisms. Tier 2 adapters live outside this repository; the project's commitment is interface stability (ADR-003) and documentation, not implementation or maintenance.

Promotion from Tier 2 to Tier 1 is demand-driven — sustained real-world use and a maintainer willing to track the harness's churn.

## Rationale

- **Maintenance scales with harness churn.** Two first-party adapters is the bill the project can pay indefinitely; four is not.
- **The multi-harness thesis survives without the multi-harness bill.** The adapter interface, the capability model, and the fallback chains are the portable assets. They prove themselves across two maximally unequal harnesses — in-process plugin versus out-of-process subprocess is exactly the asymmetry the capability model and `tamperResistant` flag exist to express. A third or fourth harness adds coverage, not architectural information.
- **The two Tier 1 choices are complementary.** Pi is the daily-driver harness and a durable niche; Claude Code is where the audience is, and its native five-behavior surface makes the adapter cheap to keep current.

## Consequences

- This repository contains `adapters/pi/` and `adapters/claude-code/` and nothing else.
- The public API (ADR-003) is the community adapter's contract; breaking it is a semver-major event.
- Docs list OpenCode, Codex, and others only as community-tier possibilities, never as first-party roadmap items.
- Capability tables in docs and code carry rows for Pi and Claude Code; community adapters publish their own.
