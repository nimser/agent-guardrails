// ── Core Types ──────────────────────────────────────────
export type { HarnessCapabilities } from './core/types.js'
export type {
  /** The five behaviors a guardrail rule can enforce. */
  GuardrailBehavior,
  /** Union of all possible guardrail actions across both phases. */
  GuardrailAction,
  /** Normalized context for a tool call. */
  ToolCallContext,
  /** A declarative condition that describes when a rule fires. */
  MatchCondition,
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

// ── Normalizer ─────────────────────────────────────────
export {
  /** Well-known tool names that require specific fields. */
  KNOWN_TOOLS,
  /** Extract command and filePath from a ToolCallContext. */
  extractTargets,
  /** Check whether a ToolCallContext is missing required fields. */
  isMissingRequiredFields,
} from './core/normalizer.js'

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
   * The engine class. Create your own instance for isolated state,
   * or use the module-level functions which delegate to a default singleton.
   */
  GuardrailEngine,
  /**
   * Initialize the default engine singleton. No-op currently (engine
   * self-initializes) but kept for API stability and future bootstrap hooks.
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
  /** Get a snapshot of current intervention stats from the default engine. */
  getStats,
  /** Reset intervention stats to zero on the default engine. */
  resetStats,
  /**
   * The default engine's PredicateRegistry, exposed for adapter-side
   * registration of named predicate functions.
   */
  predicateRegistry,
} from './engine/engine.js'
export {
  /** Accumulator for intervention stats (checks, blocks, suggests). */
  StatsTracker,
} from './engine/stats-tracker.js'

// ── Matcher ─────────────────────────────────────────────
export {
  /**
   * The single entry point for evaluating a MatchCondition against a
   * ToolCallContext. Replaces the old registry/handler split.
   */
  matchesMatcher,
  /** Maximum input length before regex matchers fail-closed. */
  MAX_MATCH_INPUT_LENGTH,
} from './matcher/matchers.js'

// ── Infrastructure ──────────────────────────────────────
export {
  /**
   * Load and parse a single YAML rule pack file. Validates structure
   * and returns a typed `RulePack`, or throws on error.
   */
  loadYamlRulePack,
  /**
   * Load all `.yaml` / `.yml` files from a directory as rule packs.
   * Non-YAML files are silently skipped. Throws if any pack fails validation.
   */
  loadAllRulePacks,
} from './infrastructure/yaml-pack-loader.js'
