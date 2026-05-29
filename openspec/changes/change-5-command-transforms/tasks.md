# Tasks: Command Transforms

> **TDD MANDATE**: Every task below follows Test-Driven Development. For each
> implementation section: write failing tests for the related scenarios (RED),
> then write the minimal code to make them pass (GREEN), then refactor
> (REFACTOR). Related scenarios within a section may share one refactoring pass.
> **Never write implementation before the tests.** See `.agents/skills/tdd/SKILL.md`.
>
> **Dependency**: This change depends on Changes 1–4. The engine, rule packs,
> and both adapters already exist. We modify existing YAML rule packs and add
> new resolver functions.

## 1. New Rule Packs (YAML)

> **TDD cycle**: Write failing tests that load each YAML pack and verify
> matching behavior before creating the YAML files.

- [ ] 1.0 RED: Write tests for kubernetes pack — `kubectl get secrets`, `kubectl describe secrets` match; `kubectl get pods`, `kubectl get configmap` do not
- [ ] 1.1 GREEN: Create `src/packs/kubernetes.yaml`:
  - Rule `kubernetes.secrets`: bash-command matcher for `kubectl get/describe secrets`
  - `defaultAction: { type: suggest, replacement: "...", message: "..." }`
- [ ] 1.2 REFACTOR: Verify tests pass
- [ ] 1.3 RED: Write tests for gh-cli pack — `gh secret view`, `gh variable get` match; `gh secret list`, `gh pr list` do not
- [ ] 1.4 GREEN: Create `src/packs/gh-cli.yaml`:
  - Rule `gh-cli.secret-view`: bash-command matcher for `gh secret view`
  - Rule `gh-cli.variable-get`: bash-command matcher for `gh variable get`
  - Both with `defaultAction: suggest`
- [ ] 1.5 REFACTOR: Verify tests pass
- [ ] 1.6 RED: Write tests for direnv pack — `direnv exec`, `source .env`, `. .env` match; `direnv allow`, `direnv status` do not
- [ ] 1.7 GREEN: Create `src/packs/direnv.yaml`:
  - Rule `direnv.exec`: bash-command matcher for `direnv exec`, action: block
  - Rule `direnv.source-env`: bash-command matcher for `source .env` / `. .env`, action: suggest
- [ ] 1.8 REFACTOR: Verify tests pass
- [ ] 1.9 Re-export new packs from `src/packs/index.ts` (loaded from YAML)
- [ ] 1.10 Update `ALL_RULE_PACKS` loader to include kubernetes, gh-cli, direnv

## 2. Update Existing YAML Rule Pack Default Actions to Suggest

> **TDD cycle**: For each rule pack, update the test expectations first
> (expect `suggest` instead of `block`), watch tests fail on the action type,
> then update the YAML.

- [ ] 2.0 RED: Update test expectations for `env` pack to expect `suggest` actions
- [ ] 2.1 GREEN: Update `src/packs/env.yaml`:
  - `env.read` → `defaultAction: { type: suggest, replacement: "sed 's/=.*/=[REDACTED]/' {matched}", message: "..." }`
  - `env.read-bash` → `defaultAction: { type: suggest, replacement: "sed 's/=.*/=[REDACTED]/' {matched}", message: "..." }`
- [ ] 2.2 RED: Update test expectations for `sops` pack
- [ ] 2.3 GREEN: Update `src/packs/sops.yaml`:
  - `sops.decrypt` → `defaultAction: { type: suggest, replacement: "<format-aware>", message: "..." }`
  - Note: actual replacement is resolved at runtime by `findSaferCommand()` using format detection
- [ ] 2.4 RED: Update test expectations for `private-key` pack
- [ ] 2.5 GREEN: Update `src/packs/private-key.yaml`:
  - `private-key.read-ext`, `private-key.read-ssh-key`, `private-key.read-ssh-dir` → `suggest` with `head -5` truncation
- [ ] 2.6 Verify all existing rule pack tests pass with new action types

## 3. findSaferCommand Implementation (resolver layer)

> **TDD cycle**: `findSaferCommand()` is a pure function — ideal for RED→GREEN.

- [ ] 3.0 RED: Write tests for `findSaferCommand()`:
  - `cat .env` → `sed 's/=.*/=[REDACTED]/' .env`
  - `sops -d secrets.yaml` → format-aware YAML redaction
  - `sops -d secrets.json` → format-aware JSON redaction
  - `kubectl get secrets` → redacted kubectl alternative
  - `gh secret view MY_SECRET` → `gh secret list`
  - `source .env` → `sed 's/=.*/=[REDACTED]/' .env`
  - `ls -la` → `null` (no **Safer Alternative**)
  - `echo "..." | sops -d` → `null` (stdin, no format)
- [ ] 3.1 GREEN: Create `src/resolver/safer-commands.ts`:
  ```typescript
  export function findSaferCommand(command: string, matchContext?: { matched?: string }): string | null
  ```
- [ ] 3.2 REFACTOR: Verify all tests pass

## 4. Suggest → Block Fallback (Integration with action-resolver)

> **TDD cycle**: Test the fallback integration, not action-resolver internals.

- [ ] 4.0 RED: Write tests:
  - `resolveAction` with `suggest` action + `findSaferCommand` returns string → returns suggest with replacement
  - `resolveAction` with `suggest` action + `findSaferCommand` returns null → returns block with generic message
  - Fallback block message: `"Blocked: \`{matched}\` — no Replacement available."`
- [ ] 4.1 GREEN: Update `src/resolver/action-resolver.ts`:
  - Import `findSaferCommand` from `./safer-commands`
  - When action type is `suggest`: call `findSaferCommand`, populate replacement
  - If null: fall back to `block`
- [ ] 4.2 REFACTOR: Verify all resolver tests pass

## 5. SOPS Format-Aware Redaction (resolver layer)

> **TDD cycle**: `detectSopsFormat()` is a pure function — test all format
> detection scenarios before implementing.

- [ ] 5.0 RED: Write tests for `detectSopsFormat()`:
  - `sops -d secrets.yaml` → `yaml`
  - `sops -d secrets.json` → `json`
  - `sops -d secrets.env` → `env`
  - `sops -d --output-type json secrets.yaml` → `json` (flag overrides extension)
  - `sops -d --input-type yaml` → `yaml` (no extension, no output-type)
  - `echo "..." | sops -d` → `null` (stdin, no format)
- [ ] 5.1 GREEN: Create `src/resolver/sops-format.ts`:
  ```typescript
  export function detectSopsFormat(command: string): 'yaml' | 'json' | 'env' | null
  export function sopsFormatPipeline(format: 'yaml' | 'json' | 'env'): string
  ```
- [ ] 5.2 GREEN: Implement `sopsFormatPipeline()`:
  - `yaml` → `| sed 's/:.*/: [REDACTED]/'`
  - `json` → `| jq 'walk(if type == "string" then "[REDACTED]" else . end)'`
  - `env` → `| sed 's/=.*/=[REDACTED]/'`
- [ ] 5.3 REFACTOR: Verify all format detection tests pass
- [ ] 5.4 Integrate `detectSopsFormat()` + `sopsFormatPipeline()` into `findSaferCommand()` — verify end-to-end SOPS tests pass

## 6. Adapter Updates (Pi + opencode)

> **TDD cycle**: The adapters already handle `suggest` actions correctly from
> Changes 3/4 (they check `result?.type === "block" || result?.type === "suggest"`).
> Verify with tests; no code changes needed unless tests fail.

- [ ] 6.0 RED: Write/update adapter tests to verify suggest Behavior:
  - Pi adapter: `suggest` action → returns `{ block: true, reason: "..." }`
  - opencode adapter: `suggest` action → throws `Error(result.message)`
- [ ] 6.1 GREEN: Verify existing adapter code handles suggest (it should from Changes 3/4)
- [ ] 6.2 If tests fail, update adapter code
- [ ] 6.3 REFACTOR: Verify all adapter tests pass

## 7. Module Exports

- [ ] 7.1 Export `findSaferCommand` from `src/resolver/index.ts`
- [ ] 7.2 Export `detectSopsFormat` from `src/resolver/index.ts`
- [ ] 7.3 Verify `ALL_RULE_PACKS` includes all packs (existing + new)

## 8. Integration Tests

> **TDD cycle**: Write end-to-end tests for the full pipeline.

- [ ] 8.0 RED: Write integration tests:
  - `sops -d secrets.yaml` → suggest with YAML redaction pipeline
  - `sops -d secrets.json` → suggest with JSON redaction pipeline
  - `sops -d --output-type json secrets.yaml` → suggest with JSON (flag wins)
  - `echo "..." | sops -d` → block (no format detected → null → fallback)
  - `cat .env` → suggest redacted version
  - `kubectl get secrets` → suggest redacted kubectl
  - `gh secret view MY_SECRET` → suggest `gh secret list`
  - `direnv exec . cat .env` → block (no **Safer Alternative**)
  - `source .env` → suggest `sed` redaction
- [ ] 8.1 GREEN: Verify all integration tests pass
- [ ] 8.2 REFACTOR: Clean up

## 9. Documentation

- [ ] 9.1 Document kubernetes, gh-cli, and direnv Rule Packs
- [ ] 9.2 Document SOPS format detection (extension, --output-type, --input-type, fallback to block)
- [ ] 9.3 Document suggest → block fallback behavior
- [ ] 9.4 Note Smart Piped Command Detection is deferred to post-MVP
