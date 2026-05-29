# Ubiquitous Language

## Core System

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Agent Guardrails** | The system that intercepts and governs tool calls made by AI coding agents | guardrails, the tool, safety layer |
| **Rule** | A detection pattern with a phase, matcher, and default action that identifies dangerous tool calls | policy, constraint, check |
| **Rule Pack** | A named collection of related rules addressing a single concern (e.g., secrets, encryption) | rule set, policy pack, module |
| **Rule ID** | A stable dotted identifier for a rule (e.g., `env.read`, `sops.decrypt`) that persists across behavior changes | rule identifier, rule name |
| **Guardrail Matcher** | A typed pattern specification (`{ type: "file-path", pattern }` or `{ type: "bash-command", pattern }`) used to detect dangerous tool calls | pattern, detector, filter, matcher |
| **Phase** | The execution point at which a rule fires: `before-tool` or `after-tool`. Constrains available behaviors. | stage, hook point, timing |
| **Default Action** | The action a rule produces when no user configuration overrides it | rule action, built-in action |
| **Configured Action** | The action a rule produces after user configuration overrides the default | override, custom action |

## Behaviors

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Behavior** | The type of response a guardrail takes when a rule matches: block, suggest, run, redact, or confirm | action, response, reaction |
| **Block** | A behavior that stops the tool call with no alternative provided. Works in all harnesses, all phases. | deny, reject, prevent |
| **Suggest** | A behavior that stops the tool call and presents one or more safer alternatives to the LLM for retry. Works in all harnesses, before-tool phase only. | propose, recommend, advise |
| **Run** | A behavior that stops the original tool call, executes a safer alternative in the hook, and returns sanitized output. Requires shell execution capability in the harness. | execute, substitute, replace |
| **Redact** | A behavior that allows the tool call but sanitizes the output before the LLM sees it. Works in after-tool phase only. | sanitize, scrub, mask |
| **Confirm** | A behavior that prompts the user for approval via native UI. Falls back to suggest if the harness lacks native confirmation UI. | approve, prompt, ask |

### Phase-Behavior Matrix

| Phase | block | suggest | run | redact | confirm |
|-------|-------|---------|-----|--------|--------|
| `before-tool` | ✓ | ✓ | ✓ | ✗ | ✓ |
| `after-tool` | ✗ | ✗ | ✗ | ✓ | ✗ |

## Actions

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Action** | The concrete response produced when a rule matches, carrying type-specific payload (message, replacement, fallback). Type is `GuardrailAction`. | result, outcome, decision |
| **Allow** | An action that permits the tool call without modification | pass, permit, accept |
| **Block Action** | An action that stops the tool call with a `message` explaining why | rejection |
| **Suggest Action** | An action that stops the tool call with a `replacement` (string or string[]) and optional `message` | |
| **Run Action** | An action that stops the tool call, executes the `replacement`, and optionally shows a `message` | |
| **Redact Action** | An action that allows the tool call and replaces output with `replacement` | |
| **Confirm Action** | An action that prompts the user with a `message`, with an optional `fallback` action if confirmation UI is unavailable | |
| **Replacement** | A string or array of strings representing safer alternative commands; when array, first element is primary recommendation | alternative, substitute, safer command |
| **Fallback** | An action to use when the primary action cannot be performed (e.g., confirm falls back to suggest when native UI unavailable) | default action, degradation |
| **Message** | Human-readable explanation attached to block, suggest, run, or confirm actions | reason, explanation |

## Harness Integration

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Harness** | A coding agent platform that Agent Guardrails integrates with (Pi, opencode, Claude Code, Codex) | platform, agent, client, tool |
| **Adapter** | The integration code that connects Agent Guardrails to a specific harness | plugin, extension, connector, bridge |
| **Capability** | A boolean flag indicating whether a harness supports a specific behavior (block, suggest, run, redact, confirm) | feature, support, ability |
| **Hook** | An extension point provided by a harness where the adapter registers interception logic | callback, event, interceptor, lifecycle |
| **Tool** | A native operation provided by a harness (e.g., `bash`, `read`, `write`). Adapters match on tool name to apply rules. | tool type, tool name |
| **Tool Call** | The pre-execution hook point (`tool_call` in Pi, `tool.execute.before` in opencode). Maps to `before-tool` phase. | pre-hook, before hook |
| **Tool Result** | The post-execution hook point (`tool_result` in Pi, `tool.execute.after` in opencode). Maps to `after-tool` phase. | post-hook, after hook |
| **Output** | The return value of a tool execution, visible to the LLM. The target of `redact` behavior. | tool output, result, response |

## Detection Patterns

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **File-path Matcher** | A `GuardrailMatcher` with `type: "file-path"` that tests against the path argument of file-reading tools | path matcher, file matcher |
| **Bash-command Matcher** | A `GuardrailMatcher` with `type: "bash-command"` that tests against the command string in bash tool calls | command matcher, shell matcher |
| **Predicate Matcher** | A `GuardrailMatcher` with `type: "predicate"` that executes a JavaScript function for complex conditions; cannot be defined in YAML, requires TypeScript rule packs | predicate, predicate function |
| **Defense in Depth** | Design principle of applying multiple matchers to the same concern (e.g., file-path AND bash-command for .env files) | dual matching, layered detection |
| **Matcher Handler (Handler)** | The registered implementation class that evaluates a specific `GuardrailMatcher` type against a `ToolCallContext`; e.g., `BashCommandHandler` handles `type: "bash-command"` matchers | match handler, handler implementation |
| **Matcher Registry** | The registry that maps `GuardrailMatcher` types to their `MatcherHandler` implementations, initialized via `initializeMatcherRegistry()` | matcher lookup, handler registry |

## Matching Layers

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Layer 1 (Pre-Filter)** | Substring-based fast screening for risky keyword pairs (e.g., `sops` + `-d`); O(n) string scan with no false negatives | substring pre-filter, keyword filter |
| **Layer 2 (Structural Regex)** | Precise regex pattern matching on command structure; catches standard usage but misses adversarial wrapping | regex matching, structural matching |
| **Layer 3 (Wrapper Detection)** | Detection of adversarial shell constructs (`eval`, `bash -c`, `sh -c`, `$()`) that trigger force-block regardless of Layer 2 result | wrapper detection, adversarial detection |
| **Command Splitter** | Function that splits multi-command strings on `;`, `&&`, `||`, `\n` before matching to catch composition via chaining | command parser, multi-command splitter |
| **Shell Tokenizer** | Planned future feature that parses shell syntax to track variable expansion and command substitution | shell parser |

## Transforms

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Transform** | The process of converting a dangerous command into one or more safer alternatives | conversion, translation, rewrite |
| **Safer Command** | An alternative command that accomplishes the same goal without exposing secrets, carrying `command`, `description`, and `confidence` fields | safe alternative, redacted command |
| **Confidence** | A 0-1 score indicating how likely a safer command matches the user's intent; when multiple alternatives exist, first element in array is highest confidence | score, priority, weight |
| **Smart Piped Command Detection** | Logic that identifies piped commands already containing output-limiting precautions (`grep -o` with bounded context, `head`, `tail`, `wc`) and allows them through without blocking | pipe detection, safe pipe check |
| **Flag Preservation** | Constraint that transforms must retain command flags (e.g., `--output-type`, `--age`) from the original command in all alternatives | flag retention, option preservation |
| **Format-aware Redaction** | Redaction logic that adapts to the output format (YAML, JSON, ENV) rather than applying a single pattern. Triggered by SOPS `--output-type` flag. | format-aware scrubbing |

## Secret Domains

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Env Rule Pack** | Rule pack blocking access to `.env` and `.env.*` files via file-path and bash-command matchers | env pack, dotenv pack |
| **SOPS Rule Pack** | Rule pack blocking `sops -d` / `sops --decrypt` commands | sops pack |
| **Private-key Rule Pack** | Rule pack blocking reads of `.pem`, `.key`, SSH keys, and non-pub files in `~/.ssh/` | key pack, ssh pack |
| **Encryption-tools Rule Pack** | Rule pack blocking `age -d`, `gpg --decrypt`, `openssl enc -d` commands | crypto pack |
| **Secret-managers Rule Pack** | Rule pack blocking `op read`, `gopass show`, `pass show`, `bw get` commands | manager pack, vault pack |

## Relationships

- A **Harness** has one **Adapter**
- An **Adapter** checks **Capabilities** to determine which **Behaviors** it can use
- An **Adapter** registers hooks at **Tool Call** (before-tool) and/or **Tool Result** (after-tool) points
- A **Rule Pack** contains one or more **Rules**
- A **Rule** has exactly one **Phase**, one **Guardrail Matcher**, and one **Default Action**
- A **Rule ID** is stable across **Behavior** changes (e.g., `env.read` stays `env.read` whether action is block, suggest, or run)
- **Phase** constrains available **Behaviors**: `before-tool` → block/suggest/run/confirm; `after-tool` → redact only
- **Capabilities** constrain which **Behaviors** an **Adapter** can use; unavailable behaviors degrade via **Fallback** chain
- A **Guardrail Matcher** produces a boolean match against a **Tool**'s input
- An **Action** may carry **Replacement** strings (for suggest/run) or a **Fallback** action (for confirm)
- A **Transform** converts a matched command into one or more **Safer Commands**, each with a **Confidence** score
- **Configured Action** overrides **Default Action** per rule ID via user configuration

## Example dialogue

> **Dev:** "When the **Adapter** intercepts a tool call, does it check all **Rules** in all **Rule Packs**?"
>
> **Domain expert:** "Yes — the **Adapter** iterates through every **Rule** in every loaded **Rule Pack**. For each **Rule**, it evaluates the **Guardrail Matcher** against the **Tool**'s input. If the **Matcher** fires, it returns the **Default Action** — unless a **Configured Action** overrides it."
>
> **Dev:** "What happens if the **Action** is `suggest` but the **Harness** doesn't support it?"
>
> **Domain expert:** "The **Adapter** checks **Capabilities** first. `suggest` is universal — all **Harnesses** support it. But `confirm` falls back to `suggest` if the **Harness** has no native confirmation UI. The **Fallback** field on the **Confirm Action** specifies what to use."
>
> **Dev:** "So for `run`, the **Adapter** needs shell execution in the **Hook**?"
>
> **Domain expert:** "Exactly. `run` requires the **Harness** to support shell execution within the hook itself. Only Pi and opencode have that **Capability**. Claude Code and Codex can only `suggest` — the LLM sees the **Replacement** and decides whether to retry."
>
> **Dev:** "And **Smart Piped Command Detection** means we don't block `sops -d file | grep -o '.{0,4}pass.{0,4}'`?"
>
> **Domain expert:** "Right — the pipe already limits output to 4 characters around the match. The **Guardrail Matcher** sees `grep -o` with a bounded context and returns no match. Without `-o`, grep shows the full line with secrets, so we'd still block or **Suggest** a **Safer Command**."

## Flagged ambiguities

- **"adapter" vs "plugin" vs "extension"** — Pi calls its integration an "extension", opencode calls it a "plugin". Canonical term: **Adapter**. Use "Pi adapter" or "opencode adapter" when platform context is needed.

- **"action" vs "behavior"** — **Behavior** is the abstract category (block/suggest/run/redact/confirm). **Action** is the concrete response object carrying payload. A `suggest` **Behavior** produces a **Suggest Action** with `type: "suggest"` and a `replacement` array. Do not conflate.

- **"reason" vs "message"** — Pi's hook returns `{ block: true, reason: "..." }`. The `GuardrailAction` type has a `message` field. These are the same concept in different contexts. Canonical term: **Message**. Pi's `reason` field carries the **Message** to the agent.

- **"rule pack" vs "module" vs "package"** — A **Rule Pack** is a domain concept (a named collection of rules). A "package" is a npm/workspace implementation artifact (`@agent-guardrails/secrets`). One package may export multiple **Rule Packs**.

- **"harness" vs "agent"** — **Harness** is the platform (Pi, opencode). "Agent" refers to the AI model executing within the harness. The **Adapter** integrates the **Harness**, not the agent.

- **"matcher" vs "pattern"** — A **Guardrail Matcher** is the structured object (`{ type: "file-path", pattern: /.../ }`). The `pattern` is the regex inside the **Guardrail Matcher**. Use **Guardrail Matcher** when referring to the full detection specification.

- **"replacement" vs "safer command"** — **Replacement** is the string/string[] field on an **Action**. A **Safer Command** is the richer object with `command`, `description`, and `confidence` used internally by transforms. The **Adapter** extracts `command` from **Safer Command** into the **Replacement** field.

- **"detection" vs "matching"** — Used interchangeably throughout. Canonical: **Matching** (the act of evaluating a **Guardrail Matcher** against input). Detection is the broader concept (does a rule fire?); matching is the mechanism (does the pattern match?).

- **"default action" vs "configured action"** — A rule's `defaultAction` is the built-in behavior. A **Configured Action** overrides it per rule ID via user configuration. The **Rule ID** stays the same; only the action changes.

- **"tool call" vs "tool"** — A **Tool** is the operation type (`bash`, `read`). A **Tool Call** is a specific invocation of a tool with arguments. The adapter matches on **Tool** name, then evaluates **Guardrail Matchers** against the **Tool Call**'s input.
