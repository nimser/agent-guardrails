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
import { matchesMatcher } from '../matcher/matchers.js'
import { splitCommands } from '../matcher/command-splitter.js'
import { resolveAction } from '../resolver/action-resolver.js'
import { StatsTracker } from './stats-tracker.js'
import { PredicateRegistry } from '../core/predicate-registry.js'

/**
 * A guardrail engine instance owns its own PredicateRegistry and stats tracker.
 * Adapters create one (or use the default singleton via initGuardrails()).
 */
export class GuardrailEngine {
  readonly predicateRegistry = new PredicateRegistry()
  private readonly statsTracker = new StatsTracker()

  /**
   * Evaluate a ToolCallContext against the given RulePacks and return the
   * first matching resolved action, or null if no rule matched.
   *
   * @param ctx - Normalized tool call context
   * @param packs - Rule packs to evaluate against
   * @param capabilities - Harness capability flags
   * @returns The resolved action, or null if no rule matched
   */
  matchAndResolve(
    ctx: ToolCallContext,
    packs: RulePack[],
    capabilities: HarnessCapabilities
  ): GuardrailAction | null {
    return this.processMatch(ctx, packs, capabilities).action
  }

  /**
   * Internal engine entry point. Returns both the resolved action and
   * the domain events that explain how the decision was reached.
   */
  processMatch(
    ctx: ToolCallContext,
    packs: RulePack[],
    capabilities: HarnessCapabilities
  ): MatchResult {
    const { command, filePath } = extractTargets(ctx)

    if (isMissingRequiredFields(ctx, command, filePath)) {
      return this.handleMissingTargetsTraced(ctx)
    }

    const commands = command ? splitCommands(command) : ['']
    const result = this.findFirstMatchTraced(ctx, commands, packs, capabilities)
    this.statsTracker.record(result.action)
    return result
  }

  /** Get a snapshot of current intervention stats. */
  getStats() {
    return this.statsTracker.getStats()
  }

  /** Reset intervention stats to zero. */
  resetStats() {
    this.statsTracker.resetStats()
  }

  private handleMissingTargetsTraced(ctx: ToolCallContext): MatchResult {
    if (!KNOWN_TOOLS.has(ctx.toolName)) {
      this.statsTracker.record(null)
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
    this.statsTracker.record(action)
    return { action, events: [event] }
  }

  private findFirstMatchTraced(
    ctx: ToolCallContext,
    commands: string[],
    packs: RulePack[],
    capabilities: HarnessCapabilities
  ): MatchResult {
    for (const cmd of commands) {
      const matchCtx = { ...ctx, command: cmd } as ToolCallContext
      for (const pack of packs) {
        const result = this.matchPackRulesTraced(pack, matchCtx, capabilities, ctx, cmd)
        if (result) return result
      }
    }
    return { action: null, events: [] }
  }

  private matchPackRulesTraced(
    pack: RulePack,
    matchCtx: ToolCallContext,
    capabilities: HarnessCapabilities,
    ctx: ToolCallContext,
    cmd: string
  ): MatchResult | undefined {
    for (const rule of pack.rules) {
      if (rule.phase !== 'before-tool') continue
      if (!matchesMatcher(rule.match, matchCtx, this.predicateRegistry)) continue

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

// ── Default singleton + bootstrap ───────────────────────

/**
 * The default engine singleton. Used by the module-level `matchAndResolve()`,
 * `processMatch()`, `getStats()`, and `resetStats()` functions for adapters
 * that don't need to manage their own engine instance.
 */
const defaultEngine = new GuardrailEngine()

/**
 * Initialize the default engine singleton. No-op in the current design
 * (the engine self-initializes), but kept for API stability and as a
 * hook for future bootstrap logic.
 */
export function initGuardrails(): GuardrailEngine {
  return defaultEngine
}

/**
 * Main engine entry point. Delegates to the default engine singleton.
 * For multi-engine setups, create your own `GuardrailEngine` instance.
 */
export function matchAndResolve(
  ctx: ToolCallContext,
  packs: RulePack[],
  capabilities: HarnessCapabilities
): GuardrailAction | null {
  return defaultEngine.matchAndResolve(ctx, packs, capabilities)
}

/** Internal engine entry point on the default singleton. */
export function processMatch(
  ctx: ToolCallContext,
  packs: RulePack[],
  capabilities: HarnessCapabilities
): MatchResult {
  return defaultEngine.processMatch(ctx, packs, capabilities)
}

/** Get stats from the default engine singleton. */
export function getStats() {
  return defaultEngine.getStats()
}

/** Reset stats on the default engine singleton. */
export function resetStats() {
  defaultEngine.resetStats()
}

/** Expose the default engine's predicate registry for adapter-side registration. */
export const predicateRegistry = defaultEngine.predicateRegistry
