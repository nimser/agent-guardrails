/**
 * Split a command string into individual commands based on shell separators.
 * Respects quoted strings to avoid splitting inside quotes.
 * Handles shell line continuation (`\` + newline) as non-breaking.
 */
export function splitCommands(command: string): string[] {
  if (!command.trim()) {
    return []
  }

  const ctx: SplitContext = {
    command,
    commands: [],
    current: '',
    inSingleQuote: false,
    inDoubleQuote: false,
  }
  let i = 0

  while (i < ctx.command.length) {
    const consumed =
      handleLineContinuation(ctx, i) ?? handleQuoteChar(ctx, i) ?? handleSeparator(ctx, i)

    if (isHandled(consumed)) {
      i += consumed
    } else {
      ctx.current += ctx.command[i]
      i++
    }
  }

  pushCommand(ctx)
  return ctx.commands
}

interface SplitContext {
  command: string
  commands: string[]
  current: string
  inSingleQuote: boolean
  inDoubleQuote: boolean
}

/** Check if char at `index` is an unescaped backslash. */
function isUnescapedBackslash(input: string, index: number): boolean {
  return input[index] === '\\' && !isEscaped(input, index)
}

/** Push current buffer into commands list if non-empty. */
function pushCommand(ctx: SplitContext): void {
  const trimmed = ctx.current.trim()
  if (trimmed) {
    ctx.commands.push(trimmed)
  }
  ctx.current = ''
}

/**
 * Handle shell line continuation: `\` followed by newline.
 * Returns number of chars consumed, or null if not applicable.
 */
function handleLineContinuation(ctx: SplitContext, i: number): number | null {
  if (ctx.inSingleQuote || !isUnescapedBackslash(ctx.command, i)) {
    return null
  }

  const next = i + 1 < ctx.command.length ? ctx.command[i + 1] : ''

  if (next === '\n') {
    return 2 // LF continuation
  }
  if (next === '\r' && i + 2 < ctx.command.length && ctx.command[i + 2] === '\n') {
    return 3 // CRLF continuation
  }
  if (next === '') {
    return 1 // trailing backslash at EOF — consume it
  }

  return null
}

/**
 * Handle a quote character (single or double). Toggles quote state.
 * Returns 1 if consumed, or null if not a quote at this position.
 */
function handleQuoteChar(ctx: SplitContext, i: number): number | null {
  const char = ctx.command[i]

  if (char === "'" && !ctx.inDoubleQuote) {
    // Bash: backslash is literal inside single quotes, so a closing
    // `'` toggles regardless of any preceding backslash.
    if (ctx.inSingleQuote || !isEscaped(ctx.command, i)) {
      ctx.inSingleQuote = !ctx.inSingleQuote
    }
    ctx.current += char
    return 1
  }

  if (char === '"' && !ctx.inSingleQuote) {
    if (!isEscaped(ctx.command, i)) {
      ctx.inDoubleQuote = !ctx.inDoubleQuote
    }
    ctx.current += char
    return 1
  }

  return null
}

/**
 * Handle a shell separator (&&, ||, ;, \n) when outside quotes.
 * Pushes the current buffer and returns number of chars consumed, or null.
 */
function handleSeparator(ctx: SplitContext, i: number): number | null {
  if (ctx.inSingleQuote || ctx.inDoubleQuote) {
    return null
  }

  const char = ctx.command[i]
  const next = i + 1 < ctx.command.length ? ctx.command[i + 1] : ''

  if (char === '&' && next === '&') {
    pushCommand(ctx)
    return 2
  }

  if (char === '|' && next === '|') {
    pushCommand(ctx)
    return 2
  }

  if (char === ';') {
    pushCommand(ctx)
    return 1
  }

  if (char === '\n') {
    pushCommand(ctx)
    return 1
  }

  return null
}

function isEscaped(input: string, index: number): boolean {
  let backslashes = 0
  let j = index - 1
  while (j >= 0 && input[j] === '\\') {
    backslashes++
    j--
  }
  return backslashes % 2 !== 0
}

function isHandled(consumed: number | null): consumed is number {
  return consumed !== null
}
