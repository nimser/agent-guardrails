import { describe, expect, it } from 'vitest'
import { normalizeToContext } from './normalize.js'

describe('normalizeToContext', () => {
  it('maps a bash event to a bash context with its command', () => {
    expect(normalizeToContext({ toolName: 'bash', input: { command: 'cat .env' } })).toEqual({
      toolName: 'bash',
      command: 'cat .env',
    })
  })

  it('maps a read event to a read context with its file path', () => {
    expect(normalizeToContext({ toolName: 'read', input: { path: '.env' } })).toEqual({
      toolName: 'read',
      filePath: '.env',
    })
  })

  it('maps a write event to a write context with its file path', () => {
    expect(normalizeToContext({ toolName: 'write', input: { path: 'out.txt' } })).toEqual({
      toolName: 'write',
      filePath: 'out.txt',
    })
  })

  it('defaults to an empty command when a bash event has no input', () => {
    expect(normalizeToContext({ toolName: 'bash' })).toEqual({ toolName: 'bash', command: '' })
  })

  it('defaults to an empty file path when a read event has an empty input', () => {
    expect(normalizeToContext({ toolName: 'read', input: {} })).toEqual({
      toolName: 'read',
      filePath: '',
    })
  })

  it('maps an unknown tool to a catch-all context with no targets', () => {
    expect(normalizeToContext({ toolName: 'fetch', input: { url: 'https://x' } })).toEqual({
      toolName: 'fetch',
    })
  })
})
