import { describe, it, expect } from 'vitest'
import type { ToolCallContext } from './types.js'
import { extractTargets, isKnownTool, isMissingRequiredFields } from './normalizer.js'

describe('isKnownTool', () => {
  it('recognizes bash, read, write', () => {
    expect(isKnownTool('bash')).toBe(true)
    expect(isKnownTool('read')).toBe(true)
    expect(isKnownTool('write')).toBe(true)
  })

  it('rejects arbitrary tool names', () => {
    expect(isKnownTool('grep')).toBe(false)
    expect(isKnownTool('unknown')).toBe(false)
  })
})

describe('extractTargets', () => {
  it('extracts command from bash context', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'ls -la' }
    expect(extractTargets(ctx)).toEqual({ command: 'ls -la', filePath: undefined })
  })

  it('extracts filePath from read context', () => {
    const ctx: ToolCallContext = { toolName: 'read', filePath: '/etc/passwd' }
    expect(extractTargets(ctx)).toEqual({ command: undefined, filePath: '/etc/passwd' })
  })

  it('extracts filePath from write context', () => {
    const ctx: ToolCallContext = { toolName: 'write', filePath: '/tmp/out.txt' }
    expect(extractTargets(ctx)).toEqual({ command: undefined, filePath: '/tmp/out.txt' })
  })

  it('extracts both command and filePath when present', () => {
    const ctx: ToolCallContext = { toolName: 'bash', command: 'cat', filePath: '/tmp' }
    expect(extractTargets(ctx)).toEqual({ command: 'cat', filePath: '/tmp' })
  })

  it('returns undefined for both fields on catch-all context', () => {
    const ctx: ToolCallContext = { toolName: 'grep' }
    expect(extractTargets(ctx)).toEqual({ command: undefined, filePath: undefined })
  })
})

describe('isMissingRequiredFields', () => {
  it('bash without command is missing', () => {
    const ctx = { toolName: 'bash' } as ToolCallContext
    expect(isMissingRequiredFields(ctx, undefined, undefined)).toBe(true)
  })

  it('bash with command is not missing', () => {
    const ctx = { toolName: 'bash', command: 'ls' } as ToolCallContext
    expect(isMissingRequiredFields(ctx, 'ls', undefined)).toBe(false)
  })

  it('read without filePath is missing', () => {
    const ctx = { toolName: 'read' } as ToolCallContext
    expect(isMissingRequiredFields(ctx, undefined, undefined)).toBe(true)
  })

  it('read with filePath is not missing', () => {
    const ctx = { toolName: 'read', filePath: '/f' } as ToolCallContext
    expect(isMissingRequiredFields(ctx, undefined, '/f')).toBe(false)
  })

  it('write without filePath is missing', () => {
    const ctx = { toolName: 'write' } as ToolCallContext
    expect(isMissingRequiredFields(ctx, undefined, undefined)).toBe(true)
  })

  it('write with filePath is not missing', () => {
    const ctx = { toolName: 'write', filePath: '/f' } as ToolCallContext
    expect(isMissingRequiredFields(ctx, undefined, '/f')).toBe(false)
  })

  it('unknown tool with no fields is missing', () => {
    const ctx = { toolName: 'grep' } as ToolCallContext
    expect(isMissingRequiredFields(ctx, undefined, undefined)).toBe(true)
  })

  it('unknown tool with command is not missing', () => {
    const ctx = { toolName: 'grep', command: 'pattern' } as ToolCallContext
    expect(isMissingRequiredFields(ctx, 'pattern', undefined)).toBe(false)
  })

  it('unknown tool with filePath is not missing', () => {
    const ctx = { toolName: 'grep', filePath: '/f' } as ToolCallContext
    expect(isMissingRequiredFields(ctx, undefined, '/f')).toBe(false)
  })
})
