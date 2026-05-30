// Core types
export type {
  GuardrailBehavior,
  GuardrailAction,
  ToolCallContext,
  GuardrailMatcher,
  GuardrailRule,
  BeforeToolRule,
  AfterToolRule,
  BeforeToolAction,
  AfterToolAction,
  RulePack,
} from './core/types.js';

// Predicate Registry
export { PredicateRegistry } from './core/predicate-registry.js';

// Validation
export { validateRule, validateRulePack, getRuleErrors, getRulePackErrors } from './core/validator.js';

// Matcher
export { MatcherRegistry, matcherRegistry } from './matcher/registry.js';
export { initializeMatcherRegistry } from './matcher/setup.js';

// Command Splitter
export { splitCommands } from './matcher/command-splitter.js';

// Resolver
export { resolveAction } from './resolver/action-resolver.js';

// Engine
export { matchAndResolve, getStats, resetStats } from './engine/engine.js';
export { StatsTracker } from './engine/stats-tracker.js';

// Infrastructure
export { loadYamlRulePack, loadAllRulePacks } from './infrastructure/yaml-pack-loader.js';
