// ── Core Types ──────────────────────────────────────────
export type { HarnessCapabilities } from './core/types.js'
export type {
  /** The five behaviors a guardrail rule can enforce. */
  GuardrailBehavior,
  /** Union of all possible guardrail actions across both phases. */
  GuardrailAction,
  /** Normalized context for a tool call. */
  ToolCallContext,
  /** How a rule identifies a matching tool call. */
  GuardrailMatcher,
  /** Union of rules from both phases. */
  GuardrailRule,
  /** A single guardrail rule evaluated in the before-tool phase. */
  BeforeToolRule,
  /** A single guardrail rule evaluated in the after-tool phase. */
  AfterToolRule,
  /** Actions available in the before-tool phase. */
  BeforeToolAction,
  /** Actions available in the after-tool phase. */
  AfterToolAction,
  /** A named collection of guardrail rules. */
  RulePack,
  /** Emitted when a rule's matcher fires against a tool call. */
  RuleMatchedEvent,
  /** Emitted when the resolver walks the fallback chain. */
  FallbackTriggeredEvent,
  /** Union of all domain events the engine can produce. */
  DomainEvent,
  /** Engine output: the resolved action plus the trace of how it was decided. */
  MatchResult,
} from './core/types.js'

// ── Predicate Registry ──────────────────────────────────
export {
  /** Registry for named predicate matchers referenced by YAML configs. */
  PredicateRegistry,
} from './core/predicate-registry.js'
export type { PredicateFunction } from './core/predicate-registry.js'

// ── Validator ───────────────────────────────────────────
export {
  /** Check whether an unknown value is a valid GuardrailRule. */
  validateRule,
  /** Check whether an unknown value is a valid RulePack. */
  validateRulePack,
  /** Return descriptive validation errors for a potential GuardrailRule. */
  getRuleErrors,
  /** Return descriptive validation errors for a potential RulePack. */
  getRulePackErrors,
} from './core/validator.js'

// ── Engine ──────────────────────────────────────────────
export type { Stats } from './engine/stats-tracker.js'
export {
  /**
   * Bootstrap the guardrail system. Registers built-in matcher handlers
   * (bash-command, file-path, predicate). Call once at startup.
   * Returns the PredicateRegistry so adapters can register custom predicates.
   */
  initGuardrails,
  /**
   * The main entry point: evaluate a ToolCallContext against RulePacks and
   * return the resolved GuardrailAction (or null if no rule matched).
   */
  matchAndResolve,
  /**
   * Internal engine entry point. Returns both the resolved action and
   * the domain events that explain how the decision was reached.
   */
  processMatch,
  /** Get a snapshot of current intervention stats. */
  getStats,
  /** Reset intervention stats to zero. */
  resetStats,
} from './engine/engine.js'
export {
  /** Accumulator for intervention stats (checks, blocks, suggests). */
  StatsTracker,
} from './engine/stats-tracker.js'
