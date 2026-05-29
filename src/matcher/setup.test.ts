import { describe, it, expect } from 'vitest';
import { initializeMatcherRegistry } from './setup.js';
import { MatcherRegistry } from './registry.js';
import { PredicateRegistry } from '../core/predicate-registry.js';

describe('initializeMatcherRegistry', () => {
  it('registers all 3 built-in handlers', () => {
    const registry = new MatcherRegistry();
    const predicateRegistry = new PredicateRegistry();

    initializeMatcherRegistry(registry, predicateRegistry);

    // Test bash-command handler is registered
    const bashCtx = { toolName: 'bash', command: 'test' };
    const bashMatcher = { type: 'bash-command' as const, pattern: /test/ };
    expect(() => registry.evaluate(bashMatcher, bashCtx)).not.toThrow();

    // Test file-path handler is registered
    const fileCtx = { toolName: 'read', filePath: '/tmp/test.txt' };
    const fileMatcher = { type: 'file-path' as const, pattern: /\.txt$/ };
    expect(() => registry.evaluate(fileMatcher, fileCtx)).not.toThrow();

    // Test predicate handler is registered
    predicateRegistry.register('test-pred', () => true);
    const predCtx = { toolName: 'bash', command: 'test' };
    const predMatcher = { type: 'predicate' as const, predicateName: 'test-pred' };
    expect(() => registry.evaluate(predMatcher, predCtx)).not.toThrow();
  });
});
