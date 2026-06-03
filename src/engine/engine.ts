import type {
  ToolCallContext,
  RulePack,
  GuardrailAction,
  HarnessCapabilities,
} from '../core/types.js'
import { matcherRegistry } from '../matcher/registry.js'
import { splitCommands } from '../matcher/command-splitter.js'
import { resolveAction } from '../resolver/action-resolver.js'
import { StatsTracker } from './stats-tracker.js'

const statsTracker = new StatsTracker()

export function matchAndResolve(
  ctx: ToolCallContext,
  packs: RulePack[],
  capabilities: HarnessCapabilities
): GuardrailAction | undefined {
  const command = 'command' in ctx ? ctx.command : undefined
  const filePath = 'filePath' in ctx ? ctx.filePath : undefined

  if (!command && !filePath) {
    statsTracker.record(null)
    return undefined
  }

  const commands = command ? splitCommands(command) : ['']

  for (const cmd of commands) {
    const matchCtx = { ...ctx, command: cmd } as ToolCallContext

    for (const pack of packs) {
      for (const rule of pack.rules) {
        // TODO: after-tool phase not yet implemented
        if (rule.phase !== 'before-tool') {
          continue
        }

        const matches = matcherRegistry.evaluate(rule.match, matchCtx)

        if (matches) {
          const matchedValue = cmd || ctx.filePath || ''

          const action = resolveAction(rule.defaultAction, capabilities, { matched: matchedValue })

          statsTracker.record(action)

          return action
        }
      }
    }
  }

  statsTracker.record(null)
  return undefined
}

export function getStats() {
  return statsTracker.getStats()
}

export function resetStats() {
  statsTracker.resetStats()
}
