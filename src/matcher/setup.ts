import { matcherRegistry, MatcherRegistry } from './registry.js'
import { bashCommandHandler } from './handlers/bash-command.js'
import { filePathHandler } from './handlers/file-path.js'
import { createPredicateHandler } from './handlers/predicate.js'
import { PredicateRegistry } from '../core/predicate-registry.js'

/**
 * Initialize the matcher registry with all built-in handlers.
 * Called once before handling tool calls (adapter bootstrap).
 */
export function initializeMatcherRegistry(
  registry: MatcherRegistry = matcherRegistry,
  predicateRegistry = new PredicateRegistry()
): void {
  registry.register(bashCommandHandler)
  registry.register(filePathHandler)
  registry.register(createPredicateHandler(predicateRegistry))
}
