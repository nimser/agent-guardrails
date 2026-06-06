import { describe, it, expect } from 'vitest'
import { filePathHandler } from './file-path'
import { MAX_MATCH_INPUT_LENGTH } from '../constants'
import type { ToolCallContext } from '../../core/types'

describe('file-path matcher', () => {
  it('returns true when pattern matches filePath', () => {
    const matcher = { type: 'file-path' as const, pattern: /\.env$/i }
    const ctx: ToolCallContext = { toolName: 'read', filePath: '/home/user/.env' }
    expect(filePathHandler.matches(matcher, ctx)).toBe(true)
  })

  it('returns false when pattern does not match filePath', () => {
    const matcher = { type: 'file-path' as const, pattern: /\.env$/i }
    const ctx: ToolCallContext = { toolName: 'read', filePath: '/home/user/config.json' }
    expect(filePathHandler.matches(matcher, ctx)).toBe(false)
  })

  it('returns false when filePath is missing', () => {
    const matcher = { type: 'file-path' as const, pattern: /test/i }
    const ctx: ToolCallContext = { toolName: 'bash', command: 'ls' }
    expect(filePathHandler.matches(matcher, ctx)).toBe(false)
  })

  it('works with write tool', () => {
    const matcher = { type: 'file-path' as const, pattern: /\.env$/i }
    const ctx: ToolCallContext = { toolName: 'write', filePath: '/tmp/.env' }
    expect(filePathHandler.matches(matcher, ctx)).toBe(true)
  })

  it('returns true (blocks) when filePath exceeds MAX_MATCH_INPUT_LENGTH', () => {
    const matcher = { type: 'file-path' as const, pattern: /test/ }
    const ctx: ToolCallContext = {
      toolName: 'read',
      filePath: '/' + 'a'.repeat(MAX_MATCH_INPUT_LENGTH),
    }
    expect(filePathHandler.matches(matcher, ctx)).toBe(true)
  })

  it('still matches when filePath equals MAX_MATCH_INPUT_LENGTH', () => {
    const matcher = { type: 'file-path' as const, pattern: /a/ }
    const ctx: ToolCallContext = {
      toolName: 'read',
      filePath: '/' + 'a'.repeat(MAX_MATCH_INPUT_LENGTH - 1),
    }
    expect(filePathHandler.matches(matcher, ctx)).toBe(true)
  })

  it('resets lastIndex for global regex', () => {
    const pattern = /\.env$/g
    const matcher = { type: 'file-path' as const, pattern }
    const ctx: ToolCallContext = { toolName: 'read', filePath: '/home/user/.env' }

    // First match advances lastIndex
    pattern.test('/home/user/.env')
    expect(pattern.lastIndex).toBeGreaterThan(0)

    // Handler should still match (resets lastIndex internally)
    expect(filePathHandler.matches(matcher, ctx)).toBe(true)
  })

  it('resets lastIndex for sticky regex', () => {
    const pattern = /home/y
    const ctx: ToolCallContext = { toolName: 'read', filePath: '/home/user/.env' }

    // Advance lastIndex by testing against a matching substring
    pattern.test('home')
    expect(pattern.lastIndex).toBeGreaterThan(0)

    // Handler resets lastIndex, so sticky starts from 0 again
    // (won't match because /home/ has leading slash, but proves reset happened)
    // Instead, use a pattern that matches at position 0
    const anchored = /^\/home/y
    const anchoredMatcher = { type: 'file-path' as const, pattern: anchored }
    anchored.test('/home/user/.env')
    expect(anchored.lastIndex).toBeGreaterThan(0)

    expect(filePathHandler.matches(anchoredMatcher, ctx)).toBe(true)
  })
})
