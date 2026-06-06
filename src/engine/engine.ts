import type {
  ToolCallContext,
  RulePack,
  GuardrailAction,
  HarnessCapabilities,
} from '../core/types.js'
import { matcherRegistry, MatcherRegistry } from '../matcher/registry.js'
import { initializeMatcherRegistry } from '../matcher/setup.js'
import { splitCommands } from '../matcher/command-splitter.js'
import { resolveAction } from '../resolver/action-resolver.js'
import { StatsTracker } from './stats-tracker.js'
import { PredicateRegistry } from '../core/predicate-registry.js'

/**
 * Bootstrap the guardrail system. Registers built-in matcher handlers
 * (bash-command, file-path, predicate). Call once at startup.
 *
 * @param registry - MatcherRegistry to populate (defaults to the singleton)
 * @param predicateRegistry - PredicateRegistry for predicate matchers
 * @returns The PredicateRegistry so adapters can register custom predicates
 */
export function initGuardrails(
  registry: MatcherRegistry = matcherRegistry,
  predicateRegistry = new PredicateRegistry()
): PredicateRegistry {
  initializeMatcherRegistry(registry, predicateRegistry)
  return predicateRegistry
}

const statsTracker = new StatsTracker()

/**
 * Main engine entry point. Evaluates a ToolCallContext against all rules
 * in the given RulePacks and returns the first matching resolved action.
 * Uses the MatcherRegistry for evaluation and resolveAction for fallback chains.
 *
 * @param ctx - Normalized tool call context
 * @param packs - Rule packs to evaluate against
 * @param capabilities - Harness capability flags
 * @returns The resolved action, or undefined if no rule matched
 */
export function matchAndResolve(
  ctx: ToolCallContext,
  packs: RulePack[],
  capabilities: HarnessCapabilities
): GuardrailAction | undefined {
  const { command, filePath } = extractTargets(ctx)

  if (isMissingRequiredFields(ctx, command, filePath)) {
    return handleMissingTargets(ctx, statsTracker)
  }

  const commands = command ? splitCommands(command) : ['']
  const action = findFirstMatch(ctx, commands, packs, capabilities)
  statsTracker.record(action ?? null)
  return action
}

function extractTargets(ctx: ToolCallContext): { command?: string; filePath?: string } {
  return {
    command: 'command' in ctx ? ctx.command : undefined,
    filePath: 'filePath' in ctx ? ctx.filePath : undefined,
  }
}

// Known tools require specific fields (bash→command, read/write→filePath).
// Fail closed to prevent guardrail bypass via malformed tool call contexts.
function handleMissingTargets(
  ctx: ToolCallContext,
  tracker: StatsTracker
): GuardrailAction | undefined {
  if (!REQUIRES_KNOWN_FIELDS.has(ctx.toolName)) {
    tracker.record(null)
    return undefined
  }
  const action: GuardrailAction = {
    type: 'block',
    message: `Malformed ${ctx.toolName} tool call: missing required fields`,
  }
  tracker.record(action)
  return action
}

const REQUIRES_KNOWN_FIELDS = new Set(['bash', 'read', 'write'])

/** Fail-closed: known tools must have their required fields. */
function isMissingRequiredFields(
  ctx: ToolCallContext,
  command: string | undefined,
  filePath: string | undefined
): boolean {
  switch (ctx.toolName) {
    case 'bash':
      return !command
    case 'read':
    case 'write':
      return !filePath
    default:
      return !command && !filePath
  }
}

function findFirstMatch(
  ctx: ToolCallContext,
  commands: string[],
  packs: RulePack[],
  capabilities: HarnessCapabilities
): GuardrailAction | undefined {
  for (const cmd of commands) {
    const matchCtx = { ...ctx, command: cmd } as ToolCallContext
    for (const pack of packs) {
      const action = matchPackRules(pack, matchCtx, capabilities, ctx, cmd)
      if (action) return action
    }
  }
  return undefined
}

function matchPackRules(
  pack: RulePack,
  matchCtx: ToolCallContext,
  capabilities: HarnessCapabilities,
  ctx: ToolCallContext,
  cmd: string
): GuardrailAction | undefined {
  for (const rule of pack.rules) {
    if (rule.phase !== 'before-tool') continue
    if (!matcherRegistry.evaluate(rule.match, matchCtx)) continue

    const matchedValue = cmd || ctx.filePath || ''
    const replacement =
      'replacement' in rule.defaultAction ? rule.defaultAction.replacement : undefined
    return resolveAction(rule.defaultAction, capabilities, { matched: matchedValue, replacement })
  }
  return undefined
}

/** Get a snapshot of current intervention stats. */
export function getStats() {
  return statsTracker.getStats()
}

/** Reset intervention stats to zero. */
export function resetStats() {
  statsTracker.resetStats()
}
