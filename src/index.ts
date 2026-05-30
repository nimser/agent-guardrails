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

// ── Matcher Registry ────────────────────────────────────
export type { MatcherHandler } from './matcher/registry.js'
export {
  /** Registry of matcher handlers for extensible matching. */
  MatcherRegistry,
  /** Default singleton matcher registry. */
  matcherRegistry,
} from './matcher/registry.js'
export {
  /** Populate the matcher registry with built-in handlers. Call once at startup. */
  initializeMatcherRegistry,
} from './matcher/setup.js'
export {
  /** Split a shell command string on `;`, `&&`, `||`, and newlines (respects quotes). */
  splitCommands,
} from './matcher/command-splitter.js'

// ── Resolver ────────────────────────────────────────────
export { resolveAction } from './resolver/action-resolver.js'
export type { ResolveContext } from './resolver/action-resolver.js'

// ── Engine ──────────────────────────────────────────────
export type { Stats } from './engine/stats-tracker.js'
export {
  /**
   * The main entry point: evaluate a ToolCallContext against RulePacks and
   * return the resolved GuardrailAction (or undefined if no rule matched).
   */
  matchAndResolve,
  /** Get a snapshot of current intervention stats. */
  getStats,
  /** Reset intervention stats to zero. */
  resetStats,
} from './engine/engine.js'
export {
  /** Accumulator for intervention stats (checks, blocks, suggests). */
  StatsTracker,
} from './engine/stats-tracker.js'

// ── Infrastructure ──────────────────────────────────────
export {
  /** Load a single YAML rule pack from disk. */
  loadYamlRulePack,
  /** Load all YAML rule packs from a directory. */
  loadAllRulePacks,
} from './infrastructure/yaml-pack-loader.js'
