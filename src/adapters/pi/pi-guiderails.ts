import { PI_CAPABILITIES } from '../../core/harness-capabilities.js'
import { PredicateRegistry } from '../../core/predicate-registry.js'
import { createEngine } from '../../engine/create-engine.js'
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
export function piGuiderails(pi: ExtensionAPI): void {
  const registry = new PredicateRegistry()
  const engine = createEngine(loadBuiltInRulePacks(registry), PI_CAPABILITIES, { registry })

  pi.on('tool_call', async (event) => {
    // Fail closed: an engine error must block the call, never let it through.
    let result
    try {
      result = engine.evaluate(normalizeToContext(event))
    } catch (error) {
      return {
        block: true,
        reason: `guiderails failed to evaluate this call (blocking to be safe): ${String(error)}`,
      }
    }
    if (result?.type === 'block' || result?.type === 'suggest') {
      return { block: true, reason: result.message ?? 'Blocked by guiderails.' }
    }
    return undefined
  })

  pi.on('session_shutdown', (_event, ctx) => {
    const { blocks, suggests } = engine.getStats()
    const matches = blocks + suggests
    if (matches > 0) {
      ctx.ui.notify(
        `🛡️ Guiderails: ${matches} interventions this session (${blocks} blocked, ${suggests} suggested)`
      )
    }
    engine.resetStats()
  })
}
