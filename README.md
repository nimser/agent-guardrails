# Agent Guardrails

> **Security disclaimer:** Agent Guardrails is a pattern-based policy engine, not a security audit tool. It provides defense-in-depth for AI coding agent workflows but should not be treated as a complete security boundary.

Policy engine for AI coding agents — intercept tool calls before they execute, match them against rule packs, and enforce guardrails (block, suggest, redact).

## Quick Start

```bash
npm install agent-guardrails
```

```typescript
import { matchAndResolve, initializeMatcherRegistry, loadAllRulePacks } from 'agent-guardrails'

initializeMatcherRegistry()
const packs = loadAllRulePacks()

const action = matchAndResolve(
  { toolName: 'bash', command: 'cat .env' },
  packs,
  { block: true, suggest: true, run: false, redact: false, confirm: true }
)
```

Full documentation, YAML rule packs, and adapter details coming soon.

## License

MIT
