/**
 * Split a command string into individual commands based on shell separators.
 * Respects quoted strings to avoid splitting inside quotes.
 * Handles shell line continuation (`\` + newline) as non-breaking.
 */
export function splitCommands(command: string): string[] {
  if (!command.trim()) {
    return []
  }

  const commands: string[] = []
  let current = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let i = 0

  while (i < command.length) {
    const char = command[i]
    const next = i + 1 < command.length ? command[i + 1] : ''

    // Shell line continuation: `\` followed by newline
    // Only when the backslash is *not* itself escaped (\ followed by \ = literal \, not continuation)
    if (!inSingleQuote && char === '\\' && !isEscaped(command, i)) {
      if (next === '\n') {
        i += 2 // LF continuation
        continue
      }
      if (next === '\r' && i + 2 < command.length && command[i + 2] === '\n') {
        i += 3 // CRLF continuation
        continue
      }
    }

    if (char === "'" && !inDoubleQuote) {
      if (!isEscaped(command, i)) {
        inSingleQuote = !inSingleQuote
      }
      current += char
      i++
      continue
    }

    if (char === '"' && !inSingleQuote) {
      if (!isEscaped(command, i)) {
        inDoubleQuote = !inDoubleQuote
      }
      current += char
      i++
      continue
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (char === '&' && next === '&') {
        const trimmed = current.trim()
        if (trimmed) {
          commands.push(trimmed)
        }
        current = ''
        i += 2
        continue
      }

      if (char === '|' && next === '|') {
        const trimmed = current.trim()
        if (trimmed) {
          commands.push(trimmed)
        }
        current = ''
        i += 2
        continue
      }

      if (char === ';') {
        const trimmed = current.trim()
        if (trimmed) {
          commands.push(trimmed)
        }
        current = ''
        i++
        continue
      }

      if (char === '\n') {
        const trimmed = current.trim()
        if (trimmed) {
          commands.push(trimmed)
        }
        current = ''
        i++
        continue
      }
    }

    current += char
    i++
  }

  const trimmed = current.trim()
  if (trimmed) {
    commands.push(trimmed)
  }

  return commands
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
