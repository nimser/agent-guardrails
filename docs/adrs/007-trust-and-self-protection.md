---
status: accepted
---

# ADR-007: Trust and Self-Protection Primitives

## Context

Guiderails currently ships with no answer to three credibility questions a
security-literate evaluator asks immediately: *Can a locked-down rule be overridden by
the user's own config?* *Can I get a stricter default posture than "allow" with one
flag?* *Does the adapter itself run somewhere the agent it governs could tamper with
it?* Today, `HarnessCapabilities` has no `tamperResistant` field, `GuardrailRule` has
no `overridable` field, and there is no catch-all default decision anywhere in the
config surface — an unmatched call always resolves to an implicit, undocumented
`allow`. These are additions to the type contract, not tweaks, and they belong in one
ADR because they're a single cohesive decision: what does this project let the
operator lock down, and what does it tell them about the guarantees it can and can't
make.

## Decision

### 1. `defaultDecision` — the Default Action of an implicit catch-all rule

`defaultDecision: 'allow' | 'suggest' | 'confirm' | 'block'`, default `'allow'` (no
behavior change out of the box). This is **not a sixth behavior** — it reuses the
existing action vocabulary (ADR-002), restricted to the subset that makes sense with
no specific matched pattern:

- **`run` excluded** — a catch-all has no single replacement command to execute; `run`
  only makes sense tied to a specific matched pattern.
- **`redact` excluded** — phase mismatch. `defaultDecision` is before-tool only;
  catch-all output scrubbing is a separate concern.
- **`confirm`** gives the synchronous, harness-native human gate, with its existing
  capability-driven fallback (`confirm → block`, ADR-002).
- **`suggest`** gives the LLM-directed steer ("tell the agent to ask the user") with no
  native-UI dependency and no synchronous human involvement. A single `ask`
  enum can't express both this and `confirm`'s synchronous human gate in one value,
  which is why `defaultDecision` reuses the four-value action vocabulary instead.

**`Suggest Action`'s `replacement: string` stays mandatory.** For a catch-all default
there's no specific safer command, so `replacement` is prose instead of a command —
e.g. `"Ask the user before running this — explain what it does and why."` Nothing in
the type requires `replacement` to be executable; only `run` executes it. Making
`replacement` optional would break an invariant ADR-002 and `UBIQUITOUS_LANGUAGE.md`
both guarantee.

**Scope: not global.** `defaultDecision` applies only to `MatchCondition`s belonging to
the `env`, `private-key`, or `secret-managers` built-in packs — reusing what those
packs already define as "sensitive," rather than inventing a new concept.

**`strict` preset:** `{ defaultDecision: 'confirm' }` scoped as above, plus the
`hardening` pack forced on and non-overridable. One flag, one trust signal. No
preset-specific fallback override is needed — `confirm`'s universal fallback chain
(`confirm → block`, ADR-002) already produces the safe behavior `strict` requires on
harnesses without native confirm UI.

**Adapter contract, distinct from `defaultDecision`.** Engine throw/timeout is not
"no rule matched" — on a crash the engine failed *before* determining whether the call
was even in `defaultDecision`'s scope, so there's no scope to apply.
**Every adapter MUST return `block` on engine throw/timeout, unconditionally and
non-configurably** — not derived from `defaultDecision`, not user-tunable. A crash is
rare (a bug, not routine traffic), so the ergonomic cost `defaultDecision`'s scoping
exists to avoid doesn't apply here, and there is no legitimate case for "allow on
crash." Enforced as a testable requirement in each adapter's spec.

### 2. `overridable: false` — rule-level, built-in-packs-only

Added to `GuardrailRule`, not `RulePack` — a pack-level flag can't express "everything
in `hardening.yaml` is locked but `env.yaml` stays configurable," and both cases will
come up.

**Built-in-packs-only privilege.** `overridable: false` is not available to
community/user-authored packs. Enforced at the pack loader
(`infrastructure/yaml-pack-loader.ts`), not left as a documented convention: a
community pack loaded from `.guiderails/packs/` that declares
`overridable: false` on any rule MUST have that field silently downgraded to
`overridable: true`, with a validation warning surfaced (visibility, not
silent-rewrite-without-trace). This prevents a third-party pack author from locking
their own rules against the user's own config — a foot-gun agentjail's daemon model
doesn't have, since only the daemon operator controls its locked rule set, never an
arbitrary policy author.

**Explicitly deferred:** a trust mechanism letting specific community packs earn
`overridable: false` (e.g. a signed/vetted-pack registry) is plausible future work, not
designed now — tracked as a one-line forward pointer in
`future-architecture-decisions.md`.

**Resolver requirement:** a `Configured Action` MUST be rejected/ignored for any
built-in rule with `overridable: false`, regardless of `mode`/config precedence.

### 3. `capabilities.tamperResistant: boolean`

Added to `HarnessCapabilities`. `true` only for adapters that run as an external hook
process the harness invokes (Claude Code). `false` for in-process plugin adapters
(Pi). This is a statement of fact about the adapter's deployment, not a behavior the
engine changes — no resolver logic needed, just a declared field each adapter's spec
sets and justifies in one sentence. Community adapters (ADR-009) declare it for their
own harness the same way.

Feeds directly into the README capability table and gives the "external hook process
vs. in-process plugin" distinction a concrete, checkable artifact instead of prose in a
research doc.

### 4. Fail-open-by-default is a stated decision, not an accident

Default posture is `allow` on no-match, because a coding agent that halts on every
unmatched call is unusable. `defaultDecision` exists precisely so an operator can opt
into a stricter posture where the ergonomics trade-off is worth it. `SECURITY.md` and
`LIMITATIONS.md` link to this rationale instead of leaving it to be inferred from a
bare `null`.

## Rationale

- **Reuses vocabulary instead of inventing it.** `defaultDecision` and `overridable`
  extend existing types rather than adding parallel concepts — smaller surface, less
  glossary drift.
- **Privilege boundaries are enforced in code, not convention.** Both
  `overridable: false`'s built-in-only restriction and the crash-implies-block contract
  are testable requirements, not documentation promises.
- **`tamperResistant` is a fact, not a feature.** No resolver logic changes; it exists
  so the README and adapter authors can make honest, checkable claims.

## Consequences

- `HarnessCapabilities` gains `tamperResistant: boolean` — every adapter's spec
  must declare and justify it.
- `GuardrailRule` gains `overridable?: boolean` (default `true`); the pack loader
  gains a downgrade-with-warning path for community packs.
- Config schema gains `defaultDecision`, scoped to `env`/`private-key`/`secret-managers`
  and a `strict` preset.
- Every adapter must add a fail-closed (`block`) path around its call into the engine,
  independent of any config.
- `null` (no match) is a documented decision with a name (`defaultDecision: 'allow'`)
  and an escape hatch, not a bare fallthrough.
