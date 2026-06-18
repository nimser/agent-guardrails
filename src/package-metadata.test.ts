import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const packageJsonPath = join(fileURLToPath(import.meta.url), '..', '..', 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

describe('package metadata', () => {
  it('declares yaml as a runtime dependency for packaged YAML loader consumers', () => {
    expect(packageJson.dependencies?.yaml).toBeDefined()
    expect(packageJson.devDependencies?.yaml).toBeUndefined()
  })
})
