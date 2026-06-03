import { describe, expect, it, beforeEach } from 'vitest'
import { matchAndResolve, getStats, resetStats } from './engine.js'
import { initializeMatcherRegistry } from '../matcher/setup.js'
import { matcherRegistry } from '../matcher/registry.js'
import type { ToolCallContext, RulePack, HarnessCapabilities } from '../core/types.js'

describe('matchAndResolve', () => {
  const fullCapabilities: HarnessCapabilities = {
    block: true,
    suggest: true,
    run: true,
    redact: true,
    confirm: true,
  }

  beforeEach(() => {
    // Initialize the matcher registry with built-in handlers
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
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops decrypt secret.yaml' }
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
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops decrypt secret.yaml' }
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
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops decrypt secret.yaml' }
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
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops decrypt secret.yaml' }
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
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops decrypt' }
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
    const ctx: ToolCallContext = { toolName: 'bash', command: 'sops decrypt' }
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
