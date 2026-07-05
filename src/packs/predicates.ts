import type { ToolCallContext } from '../core/types.js'
import type { PredicateRegistry } from '../core/predicate-registry.js'

const SSH_ALLOWLIST = new Set(['known_hosts', 'config', 'authorized_keys'])

/** Any file in a `.ssh/` directory that is not a public key or a known-safe config file. */
export function sshPrivateKey(ctx: ToolCallContext): boolean {
  const filePath = 'filePath' in ctx && ctx.filePath ? ctx.filePath : ''
  if (!/\.ssh\//.test(filePath)) return false
  const filename = filePath.split('/').pop() ?? ''
  if (SSH_ALLOWLIST.has(filename)) return false
  if (/\.(pub|pubkey)$/.test(filename)) return false
  return true
}

/**
 * Register the built-in predicates the shipped packs reference.
 * Adapters call this before `loadAllRulePacks()` on the built-in pack directory.
 */
export function registerBuiltInPredicates(registry: PredicateRegistry): void {
  registry.register('ssh-private-key', sshPrivateKey)
}
