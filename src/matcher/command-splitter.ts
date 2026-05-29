/**
 * Split a command string into individual commands based on shell separators.
 * Respects quoted strings to avoid splitting inside quotes.
 *
 * @param command - The command string to split
 * @returns Array of individual commands (trimmed, empty strings filtered out)
 */
export function splitCommands(command: string): string[] {
  if (!command.trim()) {
    return [];
  }

  const commands: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let i = 0;

  while (i < command.length) {
    const char = command[i];
    const next = i + 1 < command.length ? command[i + 1] : '';

    // Handle quotes
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += char;
      i++;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      i++;
      continue;
    }

    // If not in quotes, check for separators
    if (!inSingleQuote && !inDoubleQuote) {
      // Check for && or ||
      if (char === '&' && next === '&') {
        const trimmed = current.trim();
        if (trimmed) {
          commands.push(trimmed);
        }
        current = '';
        i += 2;
        continue;
      }

      if (char === '|' && next === '|') {
        const trimmed = current.trim();
        if (trimmed) {
          commands.push(trimmed);
        }
        current = '';
        i += 2;
        continue;
      }

      // Semicolon
      if (char === ';') {
        const trimmed = current.trim();
        if (trimmed) {
          commands.push(trimmed);
        }
        current = '';
        i++;
        continue;
      }

      // Newline
      if (char === '\n') {
        const trimmed = current.trim();
        if (trimmed) {
          commands.push(trimmed);
        }
        current = '';
        i++;
        continue;
      }
    }

    // Regular character
    current += char;
    i++;
  }

  // Add final command if not empty
  const trimmed = current.trim();
  if (trimmed) {
    commands.push(trimmed);
  }

  return commands;
}
