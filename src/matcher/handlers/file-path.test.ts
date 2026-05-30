import { describe, it, expect } from 'vitest'
import { filePathHandler } from './file-path'
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
})
