# Pi Adapter

Guiderails adapter for [Pi](https://github.com/earendil-works/pi). Hooks every
`tool_call`, evaluates it against all built-in rule packs, and blocks calls that
would leak secrets — with a reason that steers the agent toward a safer command.

## Installation

```bash
npm install guiderails
```

Register the extension in your Pi configuration:

```typescript
import piGuiderails from 'guiderails/adapters/pi'

export default piGuiderails
```

## Behavior

- **`tool_call` hook** — normalizes the event (`bash` → command, `read`/`write` →
  file path, other tools pass through) and delegates to the shared matching engine
  with all built-in rule packs (env, sops, private-key, encryption-tools,
  secret-managers, hardening).
  - `block` rules return `{ block: true, reason }`.
  - `suggest` rules also block for now; the `reason` carries the safer replacement
    so the agent retries with it. Native suggest support lands in change-5.
  - Non-matching and unknown tool calls pass through untouched.
- **`session_shutdown` hook** — notifies a one-line summary when any rule intervened:

  ```
  🛡️ Guiderails: 7 interventions this session (5 blocked, 2 suggested)
  ```

## Capabilities

The adapter declares `tamperResistant: false`: Pi's adapter is an in-process
plugin, so the agent process itself could unload or bypass the extension —
guiderails here protect against mistakes, not a malicious host.

## Example

```
> cat .env
⛔ `cat .env` would put secret values into context. Read the keys without the
values instead: `sed 's/=.*/=[REDACTED]/' .env`
```
