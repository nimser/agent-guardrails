import { describe, it, expect, beforeEach } from 'vitest'
import { initializeMatcherRegistry } from './setup.js'
import { MatcherRegistry, matcherRegistry } from './registry.js'
import { PredicateRegistry } from '../core/predicate-registry.js'
import type { GuardrailMatcher, ToolCallContext } from '../core/types.js'

describe('initializeMatcherRegistry', () => {
  let registry: MatcherRegistry
  let predicateRegistry: PredicateRegistry

  beforeEach(() => {
    registry = new MatcherRegistry()
    predicateRegistry = new PredicateRegistry()
  })

  it('registers all 3 built-in handlers', () => {
    initializeMatcherRegistry(registry, predicateRegistry)

    const bashCtx: ToolCallContext = { toolName: 'bash', command: 'test' }
    const bashMatcher = { type: 'bash-command' as const, pattern: /test/ }
    expect(() => registry.evaluate(bashMatcher, bashCtx)).not.toThrow()

    const fileCtx: ToolCallContext = { toolName: 'read', filePath: '/tmp/test.txt' }
    const fileMatcher = { type: 'file-path' as const, pattern: /\.txt$/ }
    expect(() => registry.evaluate(fileMatcher, fileCtx)).not.toThrow()

    predicateRegistry.register('test-pred', () => true)
    const predCtx: ToolCallContext = { toolName: 'bash', command: 'test' }
    const predMatcher = { type: 'predicate' as const, predicateName: 'test-pred' }
    expect(() => registry.evaluate(predMatcher, predCtx)).not.toThrow()
  })

  it('bash-command handler matches and rejects correctly', () => {
    initializeMatcherRegistry(registry, predicateRegistry)

    const matcher = { type: 'bash-command' as const, pattern: /sops/i }

    expect(registry.evaluate(matcher, { toolName: 'bash', command: 'sops -d file.yaml' })).toBe(
      true
    )
    expect(registry.evaluate(matcher, { toolName: 'bash', command: 'ls -la' })).toBe(false)
    expect(registry.evaluate(matcher, { toolName: 'read', filePath: '/tmp' })).toBe(false)
  })

  it('file-path handler matches and rejects correctly', () => {
    initializeMatcherRegistry(registry, predicateRegistry)

    const matcher = { type: 'file-path' as const, pattern: /\.env$/i }

    expect(registry.evaluate(matcher, { toolName: 'read', filePath: '/home/user/.env' })).toBe(true)
    expect(
      registry.evaluate(matcher, { toolName: 'read', filePath: '/home/user/config.json' })
    ).toBe(false)
    expect(registry.evaluate(matcher, { toolName: 'bash', command: 'ls' })).toBe(false)
  })

  it('predicate handler delegates to the provided PredicateRegistry', () => {
    predicateRegistry.register('is-dangerous', (ctx: ToolCallContext) => {
      return ctx.toolName === 'bash' && !!ctx.command && ctx.command.includes('rm -rf')
    })
    initializeMatcherRegistry(registry, predicateRegistry)

    const matcher = { type: 'predicate' as const, predicateName: 'is-dangerous' }

    expect(registry.evaluate(matcher, { toolName: 'bash', command: 'rm -rf /' })).toBe(true)
    expect(registry.evaluate(matcher, { toolName: 'bash', command: 'ls' })).toBe(false)
  })

  it('predicate handler throws for unregistered predicate name', () => {
    initializeMatcherRegistry(registry, predicateRegistry)

    const matcher = { type: 'predicate' as const, predicateName: 'nonexistent' }
    const ctx: ToolCallContext = { toolName: 'bash', command: 'ls' }

    expect(() => registry.evaluate(matcher, ctx)).toThrow(
      'Predicate "nonexistent" is not registered'
    )
  })

  it('calling twice on the same registry throws (duplicate handlers)', () => {
    initializeMatcherRegistry(registry, predicateRegistry)
    expect(() => initializeMatcherRegistry(registry, predicateRegistry)).toThrow(
      /already registered/
    )
  })

  it('calling initializeMatcherRegistry() twice on the singleton throws', () => {
    matcherRegistry.clear()
    initializeMatcherRegistry()
    expect(() => initializeMatcherRegistry()).toThrow(/already registered/)
    matcherRegistry.clear()
  })

  it('default parameters use the singleton matcherRegistry and a fresh PredicateRegistry', () => {
    // Clear the singleton to avoid interference from other tests
    matcherRegistry.clear()

    initializeMatcherRegistry()

    const bashCtx: ToolCallContext = { toolName: 'bash', command: 'test' }
    const bashMatcher = { type: 'bash-command' as const, pattern: /test/ }
    expect(matcherRegistry.evaluate(bashMatcher, bashCtx)).toBe(true)

    // Clean up singleton for other tests
    matcherRegistry.clear()
  })

  it('each handler is registered under the correct type key', () => {
    initializeMatcherRegistry(registry, predicateRegistry)

    // Verify by attempting to evaluate — unknown types throw, known types don't
    expect(() =>
      registry.evaluate(
        { type: 'bash-command' as const, pattern: /x/ },
        { toolName: 'bash', command: 'x' }
      )
    ).not.toThrow()

    expect(() =>
      registry.evaluate(
        { type: 'file-path' as const, pattern: /x/ },
        { toolName: 'read', filePath: '/x' }
      )
    ).not.toThrow()

    predicateRegistry.register('dummy', () => false)
    expect(() =>
      registry.evaluate(
        { type: 'predicate' as const, predicateName: 'dummy' },
        { toolName: 'bash', command: 'x' }
      )
    ).not.toThrow()

    // An unregistered handler type should throw
    const unknownMatcher = { type: 'unknown-type', pattern: /x/ } as unknown as GuardrailMatcher
    expect(() => registry.evaluate(unknownMatcher, { toolName: 'bash', command: 'x' })).toThrow(
      /No handler registered/
    )
  })

  it('predicate registered before initialization is accessible after', () => {
    predicateRegistry.register('pre-registered', () => true)
    initializeMatcherRegistry(registry, predicateRegistry)

    const matcher = { type: 'predicate' as const, predicateName: 'pre-registered' }
    const ctx: ToolCallContext = { toolName: 'bash', command: 'anything' }

    expect(registry.evaluate(matcher, ctx)).toBe(true)
  })

  it('predicate registered after initialization is accessible', () => {
    initializeMatcherRegistry(registry, predicateRegistry)

    predicateRegistry.register('post-registered', (ctx: ToolCallContext) => {
      return ctx.toolName === 'write'
    })

    const matcher = { type: 'predicate' as const, predicateName: 'post-registered' }
    expect(registry.evaluate(matcher, { toolName: 'write', filePath: '/tmp/out' })).toBe(true)
    expect(registry.evaluate(matcher, { toolName: 'bash', command: 'ls' })).toBe(false)
  })
})
