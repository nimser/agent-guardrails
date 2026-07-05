import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RulePack } from '../core/types.js'
import type { PredicateRegistry } from '../core/predicate-registry.js'
import { loadAllRulePacks } from '../infrastructure/yaml-pack-loader.js'
import { registerBuiltInPredicates } from './predicates.js'

/** Directory containing the built-in YAML rule packs shipped with the package. */
export const BUILTIN_PACKS_DIR = dirname(fileURLToPath(import.meta.url))

/**
 * Register the built-in predicates and load every shipped rule pack.
 * The zero-config path: `createEngine(loadBuiltInRulePacks(registry), capabilities, { registry })`.
 */
export function loadBuiltInRulePacks(registry: PredicateRegistry): RulePack[] {
  registerBuiltInPredicates(registry)
  return loadAllRulePacks(BUILTIN_PACKS_DIR, registry)
}

export { registerBuiltInPredicates } from './predicates.js'
