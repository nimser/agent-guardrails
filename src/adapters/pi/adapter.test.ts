import { describe, expect, it } from 'vitest'
import piGuiderails from './index.js'
import type { ExtensionAPI, PiContext, PiHookResponse } from './index.js'
import type { PiToolCallEvent } from './normalize.js'

type Handler = (event: unknown, ctx: PiContext) => unknown

function setup() {
  const handlers = new Map<string, Handler>()
  const logs: string[] = []
  const ctx: PiContext = { ui: { notify: (message) => logs.push(message) } }
  const pi: ExtensionAPI = {
    on: (event: string, handler: unknown) => handlers.set(event, handler as Handler),
  }
  piGuiderails(pi)
  return {
    toolCall: (event: PiToolCallEvent) =>
      (handlers.get('tool_call') as Handler)(event, ctx) as Promise<PiHookResponse | undefined>,
    sessionEnd: () => handlers.get('session_shutdown')?.({}, ctx),
    handlers,
    logs,
  }
}

const bash = (command: string): PiToolCallEvent => ({ toolName: 'bash', input: { command } })

describe('pi adapter', () => {
  it('is a function that registers tool_call and session_shutdown handlers', () => {
    const { handlers } = setup()
    expect(typeof piGuiderails).toBe('function')
    expect(handlers.has('tool_call')).toBe(true)
    expect(handlers.has('session_shutdown')).toBe(true)
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

  it.each([
    ['secret-managers: op read', 'op read op://vault/item/password'],
    ['secret-managers: pass show', 'pass show work/github'],
    ['secret-managers: gopass show', 'gopass show web/site'],
    ['secret-managers: bw get', 'bw get password github'],
    ['encryption-tools: age -d', 'age -d secrets.age'],
    ['encryption-tools: gpg --decrypt', 'gpg --decrypt backup.gpg'],
    ['encryption-tools: openssl enc -d', 'openssl enc -d -in secrets.enc'],
    ['hardening: eval wrapper', 'eval "cat .env"'],
    ['hardening: nested shell', 'sh -c "cat .env"'],
    ['hardening: command substitution', 'echo $(cat .env)'],
  ])('blocks %s', async (_name, command) => {
    const { toolCall } = setup()
    expect(await toolCall(bash(command))).toMatchObject({ block: true })
  })

  it.each([
    ['alternate reader: less', 'less .env'],
    ['alternate reader: head', 'head .env'],
    ['alternate reader: tail', 'tail .env'],
    ['quoted path', "cat './.env'"],
  ])('blocks adversarial variant — %s', async (_name, command) => {
    const { toolCall } = setup()
    expect(await toolCall(bash(command))).toMatchObject({ block: true })
  })

  it('blocks a bash event with no input at all (missing required fields fail closed)', async () => {
    const { toolCall } = setup()
    expect(await toolCall({ toolName: 'bash' })).toMatchObject({ block: true })
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
