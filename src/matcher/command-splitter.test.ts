import { describe, expect, it } from 'vitest'
import { splitCommands } from './command-splitter.js'

describe('splitCommands', () => {
  it('splits on semicolon', () => {
    expect(splitCommands('cmd1; cmd2')).toEqual(['cmd1', 'cmd2'])
  })

  it('splits on &&', () => {
    expect(splitCommands('cmd1 && cmd2')).toEqual(['cmd1', 'cmd2'])
  })

  it('splits on ||', () => {
    expect(splitCommands('cmd1 || cmd2')).toEqual(['cmd1', 'cmd2'])
  })

  it('splits on newline', () => {
    expect(splitCommands('cmd1\ncmd2')).toEqual(['cmd1', 'cmd2'])
  })

  it('trims whitespace from commands', () => {
    expect(splitCommands('  cmd1  ;  cmd2  ')).toEqual(['cmd1', 'cmd2'])
  })

  it('filters empty segments', () => {
    expect(splitCommands('cmd1;;cmd2')).toEqual(['cmd1', 'cmd2'])
    expect(splitCommands('cmd1; ;cmd2')).toEqual(['cmd1', 'cmd2'])
  })

  it('does not split inside double quotes', () => {
    expect(splitCommands('echo "hello;world"; cmd2')).toEqual(['echo "hello;world"', 'cmd2'])
  })

  it('does not split inside single quotes', () => {
    expect(splitCommands("echo 'hello&&world'; cmd2")).toEqual(["echo 'hello&&world'", 'cmd2'])
  })

  it('handles mixed separators and quotes', () => {
    expect(splitCommands('cmd1; echo "test;test" && cmd2')).toEqual([
      'cmd1',
      'echo "test;test"',
      'cmd2',
    ])
  })

  it('returns single command when no separators', () => {
    expect(splitCommands('ls -la')).toEqual(['ls -la'])
  })

  it('handles empty input', () => {
    expect(splitCommands('')).toEqual([])
  })

  it('handles whitespace-only input', () => {
    expect(splitCommands('   ')).toEqual([])
  })
})
