import { describe, expect, it, beforeEach } from 'vitest'
import { matchAndResolve, processMatch, getStats, resetStats } from './engine.js'
import { initializeMatcherRegistry } from '../matcher/setup.js'
import { matcherRegistry } from '../matcher/registry.js'
import { PredicateRegistry } from '../core/predicate-registry.js'
import type { ToolCallContext, RulePack, HarnessCapabilities } from '../core/types.js'

const fullCapabilities: HarnessCapabilities = {
  block: true,
  suggest: true,
  run: true,
  redact: true,
  confirm: true,
}

describe('matchAndResolve', () => {
  beforeEach(() => {
    matcherRegistry.clear()
    initializeMatcherRegistry()
    resetStats()
  })

  it('returns undefined when no command and no filePath (early exit)', () => {
    const ctx: ToolCallContext = { toolName: 'custom-tool' }
    const packs: RulePack[] = []
    const result = matchAndResolve(ctx, packs, fullCapabilities)
    expect(result).toBeUndefined()
  })

  it('fails closed (block) when bash context is missing required command', () => {
    const ctx: ToolCallContext = { toolName: 'bash' } as ToolCallContext
    const packs: RulePack[] = []
    const result = matchAndResolve(ctx, packs, fullCapabilities)
    expect(result).toEqual({
      type: 'block',
      message: 'Malformed bash tool call: missing required fields',
    })
  })

  it('fails closed (block) when read context is missing required filePath', () => {
    const ctx = { toolName: 'read' } as ToolCallContext
    const packs: RulePack[] = []
    const result = matchAndResolve(ctx, packs, fullCapabilities)
    expect(result).toEqual({
      type: 'block',
      message: 'Malformed read tool call: missing required fields',
    })
  })

  it('fails closed (block) when write context is missing required filePath', () => {
    const ctx = { toolName: 'write' } as ToolCallContext
    const packs: RulePack[] = []
    const result = matchAndResolve(ctx, packs, fullCapabilities)
    expect(result).toEqual({
      type: 'block',
      message: 'Malformed write tool call: missing required fields',
    })
  })

  it('returns undefined when no rules match', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'ls -la' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'test-rule',
            title: 'Test Rule',
            description: 'Matches sops',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'block', message: 'Blocked' },
          },
        ],
      },
    ]
    const result = matchAndResolve(ctx, packs, fullCapabilities)
    expect(result).toBeUndefined()
  })

  it('returns resolved action when rule matches', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops --decrypt secret.yaml' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'sops-block',
            title: 'SOPS Block',
            description: 'Block sops commands',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'block', message: 'Blocked: {matched}' },
          },
        ],
      },
    ]
    const result = matchAndResolve(ctx, packs, fullCapabilities)
    expect(result).toBeDefined()
    expect(result?.type).toBe('block')
    if (result?.type === 'block') {
      expect(result.message).toContain('sops')
    }
  })

  it('returns first match when multiple rules match (priority order)', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops --decrypt secret.yaml' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'first-match',
            title: 'First Match',
            description: 'Should match first',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'block', message: 'First' },
          },
          {
            id: 'second-match',
            title: 'Second Match',
            description: 'Should not match',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'block', message: 'Second' },
          },
        ],
      },
    ]
    const result = matchAndResolve(ctx, packs, fullCapabilities)
    expect(result?.type).toBe('block')
    if (result?.type === 'block') {
      expect(result.message).toBe('First')
    }
  })

  it('interpolates {matched} in action message', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'rm -rf /' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'rm-block',
            title: 'RM Block',
            description: 'Block rm',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /rm\s/ },
            defaultAction: { type: 'block', message: 'Blocked: {matched}' },
          },
        ],
      },
    ]
    const result = matchAndResolve(ctx, packs, fullCapabilities)
    expect(result?.type).toBe('block')
    if (result?.type === 'block') {
      expect(result.message).toBe('Blocked: rm -rf /')
    }
  })

  it('matches file-path rules', () => {
    const ctx: ToolCallContext = { toolName: 'read', filePath: '/home/user/.env' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'env-block',
            title: 'ENV Block',
            description: 'Block .env files',
            phase: 'before-tool',
            match: { type: 'file-path', pattern: /\.env$/i },
            defaultAction: { type: 'block', message: 'Blocked: {matched}' },
          },
        ],
      },
    ]
    const result = matchAndResolve(ctx, packs, fullCapabilities)
    expect(result?.type).toBe('block')
    if (result?.type === 'block') {
      expect(result.message).toBe('Blocked: /home/user/.env')
    }
  })

  it('handles multiple rule packs', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops --decrypt secret.yaml' }
    const packs: RulePack[] = [
      {
        id: 'pack-1',
        name: 'Pack 1',
        description: 'First pack',
        rules: [],
      },
      {
        id: 'pack-2',
        name: 'Pack 2',
        description: 'Second pack',
        rules: [
          {
            id: 'sops-block',
            title: 'SOPS Block',
            description: 'Block sops',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'block', message: 'Blocked' },
          },
        ],
      },
    ]
    const result = matchAndResolve(ctx, packs, fullCapabilities)
    expect(result?.type).toBe('block')
  })

  it('applies capability fallback (run → suggest)', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops --decrypt secret.yaml' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'sops-run',
            title: 'SOPS Run',
            description: 'Run sops',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'run', replacement: 'safe-cmd', message: 'Running' },
          },
        ],
      },
    ]
    const noRun: HarnessCapabilities = {
      block: true,
      suggest: true,
      run: false,
      redact: false,
      confirm: false,
    }
    const result = matchAndResolve(ctx, packs, noRun)
    expect(result?.type).toBe('suggest')
  })
})

describe('getStats', () => {
  beforeEach(() => {
    matcherRegistry.clear()
    initializeMatcherRegistry()
    resetStats()
  })

  it('returns current stats', () => {
    resetStats()
    const stats = getStats()
    expect(stats).toEqual({ checks: 0, blocks: 0, suggests: 0 })
  })

  it('stats increment after matchAndResolve calls', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops --decrypt' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'sops-block',
            title: 'SOPS Block',
            description: 'Block sops',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'block', message: 'Blocked' },
          },
        ],
      },
    ]
    const caps: HarnessCapabilities = {
      block: true,
      suggest: true,
      run: true,
      redact: true,
      confirm: true,
    }
    matchAndResolve(ctx, packs, caps)
    const stats = getStats()
    expect(stats.checks).toBe(1)
    expect(stats.blocks).toBe(1)
  })
})

describe('resetStats', () => {
  beforeEach(() => {
    matcherRegistry.clear()
    initializeMatcherRegistry()
    resetStats()
  })

  it('resets stats to zero', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops --decrypt' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'sops-block',
            title: 'SOPS Block',
            description: 'Block sops',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'block', message: 'Blocked' },
          },
        ],
      },
    ]
    const caps: HarnessCapabilities = {
      block: true,
      suggest: true,
      run: true,
      redact: true,
      confirm: true,
    }
    matchAndResolve(ctx, packs, caps)
    resetStats()
    const stats = getStats()
    expect(stats).toEqual({ checks: 0, blocks: 0, suggests: 0 })
  })
})

describe('matchAndResolve — phase handling', () => {
  beforeEach(() => {
    matcherRegistry.clear()
    initializeMatcherRegistry()
    resetStats()
  })

  it('ignores after-tool rules (entry point is before-tool only)', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops --decrypt' }
    const packs: RulePack[] = [
      {
        id: 'after-pack',
        name: 'After Pack',
        description: 'Only after-tool rules',
        rules: [
          {
            id: 'redact-secret',
            title: 'Redact Secret',
            description: 'Redact after execution',
            phase: 'after-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'redact', replacement: '[REDACTED]' },
          },
        ],
      },
    ]
    const caps: HarnessCapabilities = {
      block: true,
      suggest: true,
      run: true,
      redact: true,
      confirm: true,
    }
    expect(matchAndResolve(ctx, packs, caps)).toBeUndefined()
  })
})

describe('matchAndResolve — split commands', () => {
  beforeEach(() => {
    matcherRegistry.clear()
    initializeMatcherRegistry()
    resetStats()
  })

  it('matches only the second sub-command in a split', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'ls; sops --decrypt secret.yaml' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'sops-block',
            title: 'SOPS Block',
            description: 'Block sops',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/ },
            defaultAction: { type: 'block', message: 'Blocked: {matched}' },
          },
        ],
      },
    ]
    const result = matchAndResolve(ctx, packs, fullCapabilities)
    expect(result?.type).toBe('block')
    if (result?.type === 'block') {
      expect(result.message).toBe('Blocked: sops --decrypt secret.yaml')
    }
  })
})

describe('matchAndResolve — predicate matcher', () => {
  beforeEach(() => {
    matcherRegistry.clear()
    initializeMatcherRegistry()
    resetStats()
  })

  it('matches via predicate matcher end-to-end', () => {
    const predicateRegistry = new PredicateRegistry()
    predicateRegistry.register('is-dangerous-rm', (ctx) => {
      return ctx.toolName === 'bash' && !!ctx.command && ctx.command.includes('rm -rf')
    })

    matcherRegistry.clear()
    initializeMatcherRegistry(matcherRegistry, predicateRegistry)

    const ctx: ToolCallContext = { toolName: 'bash', command: 'rm -rf /' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'rm-block',
            title: 'RM Block',
            description: 'Block rm -rf',
            phase: 'before-tool',
            match: { type: 'predicate', predicateName: 'is-dangerous-rm' },
            defaultAction: { type: 'block', message: 'Blocked: {matched}' },
          },
        ],
      },
    ]
    const result = matchAndResolve(ctx, packs, fullCapabilities)
    expect(result?.type).toBe('block')
    if (result?.type === 'block') {
      expect(result.message).toBe('Blocked: rm -rf /')
    }
  })
})

describe('processMatch — domain events', () => {
  beforeEach(() => {
    matcherRegistry.clear()
    initializeMatcherRegistry()
    resetStats()
  })

  it('emits rule-matched event when a rule fires', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops --decrypt secret.yaml' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'sops-block',
            title: 'SOPS Block',
            description: 'Block sops',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'block', message: 'Blocked: {matched}' },
          },
        ],
      },
    ]
    const result = processMatch(ctx, packs, fullCapabilities)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toEqual({
      type: 'rule-matched',
      ruleId: 'sops-block',
      matched: 'sops --decrypt secret.yaml',
    })
  })

  it('emits no events when no rule matches', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'ls -la' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'sops-block',
            title: 'SOPS Block',
            description: 'Block sops',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'block', message: 'Blocked' },
          },
        ],
      },
    ]
    const result = processMatch(ctx, packs, fullCapabilities)
    expect(result.events).toHaveLength(0)
    expect(result.action).toBeUndefined()
  })

  it('emits fallback-triggered when run falls back to suggest', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops --decrypt secret.yaml' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'sops-run',
            title: 'SOPS Run',
            description: 'Run sops',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'run', replacement: 'safe-cmd', message: 'Running' },
          },
        ],
      },
    ]
    const noRun: HarnessCapabilities = {
      block: true,
      suggest: true,
      run: false,
      redact: false,
      confirm: false,
    }
    const result = processMatch(ctx, packs, noRun)
    expect(result.action?.type).toBe('suggest')
    expect(result.events).toHaveLength(2)
    expect(result.events[0].type).toBe('rule-matched')
    expect(result.events[1]).toEqual({
      type: 'fallback-triggered',
      from: 'run',
      to: 'suggest',
      reason: expect.stringContaining('run'),
    })
  })

  it('emits fallback-triggered when suggest has no replacement and caps lack suggest', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops --decrypt secret.yaml' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'sops-suggest',
            title: 'SOPS Suggest',
            description: 'Suggest alternative',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'suggest', replacement: 'safe-cmd', message: 'Try this' },
          },
        ],
      },
    ]
    const noSuggest: HarnessCapabilities = {
      block: true,
      suggest: false,
      run: false,
      redact: false,
      confirm: false,
    }
    const result = processMatch(ctx, packs, noSuggest)
    expect(result.action?.type).toBe('block')
    expect(result.events).toHaveLength(2)
    expect(result.events[1]).toEqual({
      type: 'fallback-triggered',
      from: 'suggest',
      to: 'block',
      reason: expect.stringContaining('suggest'),
    })
  })

  it('emits fallback-triggered when run falls all the way to block', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops --decrypt secret.yaml' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'sops-run',
            title: 'SOPS Run',
            description: 'Run sops',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'run', replacement: 'safe-cmd', message: 'Running' },
          },
        ],
      },
    ]
    const blockOnly: HarnessCapabilities = {
      block: true,
      suggest: false,
      run: false,
      redact: false,
      confirm: false,
    }
    const result = processMatch(ctx, packs, blockOnly)
    expect(result.action?.type).toBe('block')
    expect(result.events[1]).toEqual({
      type: 'fallback-triggered',
      from: 'run',
      to: 'block',
      reason: expect.any(String),
    })
  })

  it('does not emit fallback event when action resolves without fallback', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops --decrypt secret.yaml' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'sops-block',
            title: 'SOPS Block',
            description: 'Block sops',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'block', message: 'Blocked' },
          },
        ],
      },
    ]
    const result = processMatch(ctx, packs, fullCapabilities)
    expect(result.events).toHaveLength(1)
    expect(result.events[0].type).toBe('rule-matched')
  })

  it('emits fallback-triggered on malformed bash tool call', () => {
    const ctx = { toolName: 'bash' } as ToolCallContext
    const result = processMatch(ctx, [], fullCapabilities)
    expect(result.action?.type).toBe('block')
    expect(result.events).toHaveLength(1)
    expect(result.events[0].type).toBe('fallback-triggered')
    expect(result.events[0]).toMatchObject({
      from: 'allow',
      to: 'block',
    })
  })

  it('emits no events for unknown tool with no fields (early exit)', () => {
    const ctx: ToolCallContext = { toolName: 'custom-tool' }
    const result = processMatch(ctx, [], fullCapabilities)
    expect(result.action).toBeUndefined()
    expect(result.events).toHaveLength(0)
  })

  it('matchAndResolve still returns only the action (backward compatible)', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops --decrypt secret.yaml' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'sops-block',
            title: 'SOPS Block',
            description: 'Block sops',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'block', message: 'Blocked' },
          },
        ],
      },
    ]
    const action = matchAndResolve(ctx, packs, fullCapabilities)
    expect(action?.type).toBe('block')
    // matchAndResolve returns GuardrailAction, not MatchResult
    expect(action).not.toHaveProperty('events')
  })
})

describe('matchAndResolve — stats tracking', () => {
  beforeEach(() => {
    matcherRegistry.clear()
    initializeMatcherRegistry()
    resetStats()
  })

  it('tracks suggest actions in stats', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops --decrypt' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'sops-suggest',
            title: 'SOPS Suggest',
            description: 'Suggest alternative',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'suggest', replacement: 'safe-cmd', message: 'Try this' },
          },
        ],
      },
    ]
    matchAndResolve(ctx, packs, fullCapabilities)
    const stats = getStats()
    expect(stats.checks).toBe(1)
    expect(stats.suggests).toBe(1)
    expect(stats.blocks).toBe(0)
  })

  it('tracks no-match as check without block or suggest', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'ls -la' }
    const packs: RulePack[] = [
      {
        id: 'test-pack',
        name: 'Test Pack',
        description: 'Test',
        rules: [
          {
            id: 'sops-block',
            title: 'SOPS Block',
            description: 'Block sops',
            phase: 'before-tool',
            match: { type: 'bash-command', pattern: /sops/i },
            defaultAction: { type: 'block', message: 'Blocked' },
          },
        ],
      },
    ]
    matchAndResolve(ctx, packs, fullCapabilities)
    const stats = getStats()
    expect(stats.checks).toBe(1)
    expect(stats.blocks).toBe(0)
    expect(stats.suggests).toBe(0)
  })
})
