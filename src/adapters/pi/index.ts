import { piGuardrails } from './pi-guardrails.js'

export { piGuardrails } from './pi-guardrails.js'
export type { ExtensionAPI, PiContext, PiHookResponse } from './pi-guardrails.js'
export { normalizeToContext, type PiToolCallEvent } from './normalize.js'

// Pi's extension loader requires a default export (verified against
// @earendil-works/pi-coding-agent 0.80.3) — the one sanctioned exception
// to the named-exports-only rule.
export default piGuardrails
