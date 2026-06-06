import type {
  ToolCallContext,
  RulePack,
  GuardrailAction,
  HarnessCapabilities,
  MatchResult,
  DomainEvent,
  BeforeToolAction,
} from '../core/types.js'
import { KNOWN_TOOLS, extractTargets, isMissingRequiredFields } from '../core/normalizer.js'
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
 * Internal engine entry point. Returns both the resolved action and
 * the domain events that explain how the decision was reached.
 * The public `matchAndResolve()` calls this and discards the trace.
 */
export function processMatch(
  ctx: ToolCallContext,
  packs: RulePack[],
  capabilities: HarnessCapabilities
): MatchResult {
  const { command, filePath } = extractTargets(ctx)

  if (isMissingRequiredFields(ctx, command, filePath)) {
    return handleMissingTargetsTraced(ctx, statsTracker)
  }

  const commands = command ? splitCommands(command) : ['']
  const result = findFirstMatchTraced(ctx, commands, packs, capabilities)
  statsTracker.record(result.action)
  return result
}

/**
 * Main engine entry point. Evaluates a ToolCallContext against all rules
 * in the given RulePacks and returns the first matching resolved action.
 * Uses the MatcherRegistry for evaluation and resolveAction for fallback chains.
 *
 * @param ctx - Normalized tool call context
 * @param packs - Rule packs to evaluate against
 * @param capabilities - Harness capability flags
 * @returns The resolved action, or null if no rule matched
 */
export function matchAndResolve(
  ctx: ToolCallContext,
  packs: RulePack[],
  capabilities: HarnessCapabilities
): GuardrailAction | null {
  return processMatch(ctx, packs, capabilities).action
}

// Known tools require specific fields (bash→command, read/write→filePath).
// Fail closed to prevent guardrail bypass via malformed tool call contexts.
function handleMissingTargetsTraced(ctx: ToolCallContext, tracker: StatsTracker): MatchResult {
  if (!KNOWN_TOOLS.has(ctx.toolName)) {
    tracker.record(null)
    return { action: null, events: [] }
  }
  const action: GuardrailAction = {
    type: 'block',
    message: `Malformed ${ctx.toolName} tool call: missing required fields`,
  }
  const event: DomainEvent = {
    type: 'fallback-triggered',
    from: 'allow',
    to: 'block',
    reason: `Malformed ${ctx.toolName} tool call: missing required fields`,
  }
  tracker.record(action)
  return { action, events: [event] }
}

function findFirstMatchTraced(
  ctx: ToolCallContext,
  commands: string[],
  packs: RulePack[],
  capabilities: HarnessCapabilities
): MatchResult {
  for (const cmd of commands) {
    const matchCtx = { ...ctx, command: cmd } as ToolCallContext
    for (const pack of packs) {
      const result = matchPackRulesTraced(pack, matchCtx, capabilities, ctx, cmd)
      if (result) return result
    }
  }
  return { action: null, events: [] }
}

function matchPackRulesTraced(
  pack: RulePack,
  matchCtx: ToolCallContext,
  capabilities: HarnessCapabilities,
  ctx: ToolCallContext,
  cmd: string
): MatchResult | undefined {
  for (const rule of pack.rules) {
    if (rule.phase !== 'before-tool') continue
    if (!matcherRegistry.evaluate(rule.match, matchCtx)) continue

    const matchedValue = cmd || ctx.filePath || ''
    const replacement =
      'replacement' in rule.defaultAction ? rule.defaultAction.replacement : undefined

    const ruleEvent: DomainEvent = {
      type: 'rule-matched',
      ruleId: rule.id,
      matched: matchedValue,
    }

    const resolved = resolveAction(rule.defaultAction, capabilities, {
      matched: matchedValue,
      replacement,
    })

    const fallbackEvent = detectFallback(rule.defaultAction, resolved)

    return {
      action: resolved,
      events: fallbackEvent ? [ruleEvent, fallbackEvent] : [ruleEvent],
    }
  }
  return undefined
}

/**
 * Detect whether the resolver walked the fallback chain by comparing
 * the rule's declared action type against the resolved action type.
 */
function detectFallback(
  original: BeforeToolAction,
  resolved: GuardrailAction
): DomainEvent | undefined {
  if (original.type === resolved.type) return undefined

  const reason =
    resolved.type === 'block' && 'fallbackReason' in resolved && resolved.fallbackReason
      ? resolved.fallbackReason
      : `Capability '${original.type}' not available`

  return {
    type: 'fallback-triggered',
    from: original.type,
    to: resolved.type,
    reason,
  }
}

/** Get a snapshot of current intervention stats. */
export function getStats() {
  return statsTracker.getStats()
}

/** Reset intervention stats to zero. */
export function resetStats() {
  statsTracker.resetStats()
}
