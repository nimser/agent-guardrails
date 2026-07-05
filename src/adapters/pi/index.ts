import { PredicateRegistry } from '../../core/predicate-registry.js'
import { PI_CAPABILITIES } from '../../core/harness-capabilities.js'
import { matchAndResolve } from '../../engine/engine.js'
import { StatsTracker } from '../../engine/stats-tracker.js'
import { loadBuiltInRulePacks } from '../../packs/index.js'
import { normalizeToContext, type PiToolCallEvent } from './normalize.js'

/** Response the adapter returns from a tool_call hook to block execution. */
export interface PiHookResponse {
  block: true
  reason: string
}

/** The slice of Pi's extension context the adapter uses. */
export interface PiContext {
  ui: { notify(message: string, type?: 'info' | 'warning' | 'error'): void }
}

/** The slice of Pi's extension API the adapter uses (verified against @earendil-works/pi-coding-agent 0.80.3). */
export interface ExtensionAPI {
  on(
    event: 'tool_call',
    handler: (event: PiToolCallEvent, ctx: PiContext) => Promise<PiHookResponse | undefined>
  ): void
  on(event: 'session_shutdown', handler: (event: unknown, ctx: PiContext) => void): void
}

/**
 * Pi adapter: normalize the tool_call event, delegate to the engine,
 * translate the resolved action into Pi's block response.
 * Suggest actions also block — Pi's `reason` carries the safer replacement
 * back to the agent, which retries with it (change-5 adds native suggest).
 */
export default function piGuardrails(pi: ExtensionAPI): void {
  const registry = new PredicateRegistry()
  const packs = loadBuiltInRulePacks(registry)
  const stats = new StatsTracker()

  pi.on('tool_call', async (event) => {
    const ctx = normalizeToContext(event)
    const result = matchAndResolve(ctx, packs, PI_CAPABILITIES, registry, stats)
    if (result?.type === 'block' || result?.type === 'suggest') {
      return { block: true, reason: result.message ?? 'Blocked by agent-guardrails.' }
    }
    return undefined
  })

  pi.on('session_shutdown', (_event, ctx) => {
    const { blocks, suggests } = stats.getStats()
    const matches = blocks + suggests
    if (matches > 0) {
      ctx.ui.notify(
        `🛡️ Guardrails: ${matches} interventions this session (${blocks} blocked, ${suggests} suggested)`
      )
    }
    stats.resetStats()
  })
}
