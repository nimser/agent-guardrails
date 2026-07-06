#!/usr/bin/env node
// Extracts the release notes for a single version from CHANGELOG.md.
//
// Usage: node scripts/extract-changelog.mjs <version>
//   <version> is the bare semver, e.g. 0.1.0 (no leading "v").
//
// Prints the Markdown body between the matching "## [<version>]" heading
// and the next "## [" heading (or end of file). Exits non-zero with no
// output if the version has no entry, so callers can fail closed.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const version = process.argv[2]
if (!version) {
  process.stderr.write('Usage: extract-changelog.mjs <version>\n')
  process.exit(1)
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const changelog = readFileSync(join(repoRoot, 'CHANGELOG.md'), 'utf8')
const lines = changelog.split('\n')

const headingPattern = new RegExp(`^##\\s+\\[${version.replace(/\./g, '\\.')}\\]`)
const startIndex = lines.findIndex((line) => headingPattern.test(line))

if (startIndex === -1) {
  process.stderr.write(`No CHANGELOG.md entry found for version ${version}\n`)
  process.exit(1)
}

const rest = lines.slice(startIndex + 1)
const nextHeadingOffset = rest.findIndex((line) => /^##\s+\[/.test(line))
const body = nextHeadingOffset === -1 ? rest : rest.slice(0, nextHeadingOffset)

// Drop trailing Keep-a-Changelog link reference definitions, e.g.
// "[0.1.0]: https://…", which live below the last version section.
const withoutLinkRefs = body.filter((line) => !/^\[.+\]:\s/.test(line))

const notes = withoutLinkRefs.join('\n').trim()
if (!notes) {
  process.stderr.write(`CHANGELOG.md entry for version ${version} is empty\n`)
  process.exit(1)
}

process.stdout.write(`${notes}\n`)
