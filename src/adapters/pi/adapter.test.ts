import { describe, expect, it } from 'vitest'
import piGuardrails from './index.js'
import type { ExtensionAPI, PiHookResponse } from './index.js'
import type { PiToolCallEvent } from './normalize.js'

type ToolCallHandler = (event: PiToolCallEvent) => Promise<PiHookResponse | undefined>

function mockPi() {
  const handlers = new Map<string, (event?: unknown) => unknown>()
  const logs: string[] = []
  const pi: ExtensionAPI = {
    on: (event, handler) => handlers.set(event, handler as (event?: unknown) => unknown),
    log: (message) => logs.push(message),
  }
  return { pi, handlers, logs }
}

function setup() {
  const { pi, handlers, logs } = mockPi()
  piGuardrails(pi)
  return {
    toolCall: handlers.get('tool_call') as ToolCallHandler,
    sessionEnd: handlers.get('session_end') as () => void,
    logs,
  }
}

const bash = (command: string): PiToolCallEvent => ({ toolName: 'bash', input: { command } })

describe('pi adapter', () => {
  it('is a function that registers tool_call and session_end handlers', () => {
    const { toolCall, sessionEnd } = setup()
    expect(typeof piGuardrails).toBe('function')
    expect(typeof toolCall).toBe('function')
    expect(typeof sessionEnd).toBe('function')
  })

  it('blocks reading .env via bash with a reason naming the match', async () => {
    const { toolCall } = setup()
    const result = await toolCall(bash('cat .env'))
    expect(result).toMatchObject({ block: true })
    expect(result?.reason).toContain('cat .env')
  })

  it('blocks sops decryption commands', async () => {
    const { toolCall } = setup()
    const result = await toolCall(bash('sops -d secrets.yaml'))
    expect(result).toMatchObject({ block: true })
  })

  it('blocks .env reads via the read tool (file-path matcher)', async () => {
    const { toolCall } = setup()
    const result = await toolCall({ toolName: 'read', input: { path: '/app/.env' } })
    expect(result).toMatchObject({ block: true })
  })

  it('blocks private key reads via the read tool (predicate matcher)', async () => {
    const { toolCall } = setup()
    const result = await toolCall({ toolName: 'read', input: { path: '/home/u/.ssh/id_ed25519' } })
    expect(result).toMatchObject({ block: true })
  })

  it('passes through safe commands and files', async () => {
    const { toolCall } = setup()
    expect(await toolCall(bash('ls -la'))).toBeUndefined()
    expect(await toolCall(bash('cat README.md'))).toBeUndefined()
    expect(await toolCall({ toolName: 'read', input: { path: 'README.md' } })).toBeUndefined()
  })

  it('passes through unknown tools', async () => {
    const { toolCall } = setup()
    expect(await toolCall({ toolName: 'fetch', input: {} })).toBeUndefined()
  })

  it('logs an intervention summary at session end and resets stats', async () => {
    const { toolCall, sessionEnd, logs } = setup()
    await toolCall(bash('cat .env'))
    await toolCall(bash('sops -d secrets.yaml'))
    sessionEnd()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toContain('2')
    expect(logs[0]).toContain('blocked')
    // stats reset: a second session with no interventions logs nothing
    sessionEnd()
    expect(logs).toHaveLength(1)
  })

  it('logs nothing at session end when there were no interventions', async () => {
    const { toolCall, sessionEnd, logs } = setup()
    await toolCall(bash('ls'))
    sessionEnd()
    expect(logs).toHaveLength(0)
  })
})
