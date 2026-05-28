## 1. New Rule Packs

- [ ] 1.1 Create `src/packs/kubernetes.ts` with kubernetesRulePack
- [ ] 1.2 Add rule `kubernetes.secrets` with bash-command matcher `/\bkubectl\s+(get|describe)\s+secrets?\b/`
- [ ] 1.3 Create `src/packs/gh-cli.ts` with ghCliRulePack
- [ ] 1.4 Add rule `gh-cli.secret-view` with bash-command matcher `/\bgh\s+secret\s+view\b/`
- [ ] 1.5 Add rule `gh-cli.variable-get` with bash-command matcher `/\bgh\s+variable\s+get\b/`
- [ ] 1.6 Create `src/packs/direnv.ts` with direnvRulePack
- [ ] 1.7 Add rule `direnv.exec` with bash-command matcher `/\bdirenv\s+exec\b/`
- [ ] 1.8 Add rule `direnv.source-env` with bash-command matcher `/\b(source|\.)\s+\.env\b/`
- [ ] 1.9 Add unit tests for kubernetes rules (positive + negative)
- [ ] 1.10 Add unit tests for gh-cli rules (positive + negative)
- [ ] 1.11 Add unit tests for direnv rules (positive + negative)
- [ ] 1.12 Export new packs from rule packs (`src/packs/`) index
- [ ] 1.13 Update `ALL_RULE_PACKS` to include kubernetes, gh-cli, direnv

## 2. Update Rule Pack DefaultActions to Suggest

- [ ] 2.1 Update `env.read` defaultAction to suggest with single replacement and `{matched}` template
- [ ] 2.2 Update `env.read-bash` defaultAction to suggest with single replacement
- [ ] 2.3 Update `sops.decrypt` defaultAction to suggest with format-aware replacement
- [ ] 2.4 Update `private-key.read` defaultAction to suggest with single replacement
- [ ] 2.5 Set `kubernetes.secrets` defaultAction to suggest
- [ ] 2.6 Set `gh-cli.secret-view` defaultAction to suggest (`gh secret list`)
- [ ] 2.7 Set `gh-cli.variable-get` defaultAction to suggest (`gh variable list`)
- [ ] 2.8 Set `direnv.exec` defaultAction to block (no safer alternative for exec)
- [ ] 2.9 Set `direnv.source-env` defaultAction to suggest (`sed` redaction)

## 3. findSaferCommand Implementation

- [ ] 3.1 Create `src/safer-commands.ts` with `findSaferCommand(command: string): string | null` function
- [ ] 3.2 Implement env read detection and suggestion: `sed 's/=.*/=[REDACTED]/' {matched}`
- [ ] 3.3 Implement sops detection with format-aware suggestion (see section 5)
- [ ] 3.4 Implement kubectl detection and suggestion
- [ ] 3.5 Implement gh-cli detection and suggestion (`gh secret list` / `gh variable list`)
- [ ] 3.6 Implement direnv detection and suggestion
- [ ] 3.7 Implement private key detection and suggestion
- [ ] 3.8 Return `null` when no known safer alternative exists
- [ ] 3.9 Add unit tests: findSaferCommand returns correct suggestion per command type
- [ ] 3.10 Add unit tests: findSaferCommand returns null for unknown commands

## 4. Suggest → Block Fallback

- [ ] 4.1 Integrate findSaferCommand with engine's `resolveAction` function
- [ ] 4.2 When suggest Action and findSaferCommand returns null, fall back to block
- [ ] 4.3 Fallback block message: `"Blocked: \`{matched}\` — no safer alternative available."`
- [ ] 4.4 Add unit tests: suggest falls back to block when no safer command found
- [ ] 4.5 Add unit tests: fallback message includes `{matched}` interpolation

## 5. SOPS Format-Aware Redaction (Shell-Based)

- [ ] 5.1 Create `src/sops-format.ts` with format detection function
- [ ] 5.2 Implement `detectSopsFormat(command: string): 'yaml' | 'json' | 'env' | null` function
- [ ] 5.3 Parse `--output-type` flag (highest priority)
- [ ] 5.4 Parse `--input-type` flag (second priority)
- [ ] 5.5 Extract file extension from last non-flag argument (third priority)
- [ ] 5.6 Return `null` if no format detected (triggers suggest → block fallback)
- [ ] 5.7 Implement YAML shell redaction: `| sed 's/:.*/: [REDACTED]/'`
- [ ] 5.8 Implement JSON shell redaction: `| jq 'walk(if type == "string" then "[REDACTED]" else . end)'`
- [ ] 5.9 Implement ENV shell redaction: `| sed 's/=.*/=[REDACTED]/'`
- [ ] 5.10 Add unit tests: format detection from --output-type
- [ ] 5.11 Add unit tests: format detection from --input-type
- [ ] 5.12 Add unit tests: format detection from file extension
- [ ] 5.13 Add unit tests: format detection returns null for stdin/no-extension
- [ ] 5.14 Add unit tests: correct shell pipeline per format

## 6. Pi Adapter Updates

- [ ] 6.1 Update Pi Adapter to check `defaultAction.type` for suggest Behavior (via engine)
- [ ] 6.2 For suggest: engine resolves Action, Adapter returns `{ block: true, reason: result.message }`
- [ ] 6.3 For suggest → block fallback: Adapter returns `{ block: true, reason: fallbackMessage }`
- [ ] 6.4 Add unit tests for suggest Behavior in Pi Adapter

## 7. opencode Adapter Updates

- [ ] 7.1 Update opencode Adapter to check `defaultAction.type` for suggest Behavior (via engine)
- [ ] 7.2 For suggest: engine resolves Action, Adapter throws `Error(result.message)`
- [ ] 7.3 For suggest → block fallback: Adapter throws `Error(fallbackMessage)`
- [ ] 7.4 Add unit tests for suggest Behavior in opencode Adapter

## 8. Module Exports

- [ ] 8.1 Export kubernetesRulePack, ghCliRulePack, direnvRulePack from index
- [ ] 8.2 Export `findSaferCommand` from safer-commands.ts
- [ ] 8.3 Export `detectSopsFormat` from sops-format.ts
- [ ] 8.4 Update `ALL_RULE_PACKS` to include new packs

## 9. Integration Tests

- [ ] 9.1 Test SOPS transform suggests format-aware redacted decrypt command
- [ ] 9.2 Test env transform suggests redacted read command
- [ ] 9.3 Test kubernetes transform suggests redacted secrets command
- [ ] 9.4 Test gh-cli transform suggests list instead of view
- [ ] 9.5 Test direnv transform blocks/suggests appropriately
- [ ] 9.6 Test SOPS redaction uses correct format based on extension
- [ ] 9.7 Test SOPS redaction respects --output-type flag
- [ ] 9.8 Test SOPS redaction respects --input-type flag
- [ ] 9.9 Test SOPS with no detectable format falls back to block
- [ ] 9.10 Test suggest works in all Harnesses
- [ ] 9.11 Test suggest → block fallback with generic contextual message

## 10. Documentation

- [ ] 10.1 Document kubernetes, gh-cli, and direnv Rule Packs
- [ ] 10.2 Document SOPS format detection (extension, --output-type, --input-type, fallback to block)
- [ ] 10.3 Document suggest → block fallback behavior
- [ ] 10.4 Note Smart Piped Command Detection is deferred to post-MVP
