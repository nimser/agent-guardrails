import type {
  ToolCallContext,
  RulePack,
  GuardrailAction,
  HarnessCapabilities,
  MatchResult,
} from '../core/types.js'
import { PredicateRegistry } from '../core/predicate-registry.js'
import { StatsTracker, type Stats } from './stats-tracker.js'
import { matchAndResolve, processMatch } from './engine.js'

/** Options for {@link createEngine}. */
export interface CreateEngineOptions {
  /** Pre-built registry, for callers that register predicates before loading packs. */
  registry?: PredicateRegistry
  /** Pre-built stats tracker, for callers that share one across engines. */
  stats?: StatsTracker
}

/**
 * The engine instance returned by {@link createEngine} — the whole runtime
 * integration surface (ADR-003). One `evaluate()` call per event, covering
 * all three phases via the context shape.
 */
export interface Engine {
  /** Evaluate a tool call, tool result, or user prompt. Returns the resolved action, or null when nothing matched. */
  evaluate(ctx: ToolCallContext): GuardrailAction | null
  /** Same evaluation, returning the action plus the domain-event trace (ADR-006). */
  processMatch(ctx: ToolCallContext): MatchResult
  /** Snapshot of session counters. */
  getStats(): Stats
  /** Zero the session counters. */
  resetStats(): void
}

/**
 * Create a guardrail engine over the given rule packs and harness
 * capabilities. This is the public entry point for adapters and embedders:
 *
 * ```typescript
 * const engine = createEngine(loadAllRulePacks("./packs", registry), capabilities, { registry })
 * const action = engine.evaluate(ctx)
 * ```
 */
export function createEngine(
  packs: RulePack[],
  capabilities: HarnessCapabilities,
  options: CreateEngineOptions = {}
): Engine {
  const registry = options.registry ?? new PredicateRegistry()
  const stats = options.stats ?? new StatsTracker()

  return {
    evaluate: (ctx) => matchAndResolve(ctx, packs, capabilities, registry, stats),
    processMatch: (ctx) => processMatch(ctx, packs, capabilities, registry, stats),
    getStats: () => stats.getStats(),
    resetStats: () => stats.resetStats(),
  }
}
