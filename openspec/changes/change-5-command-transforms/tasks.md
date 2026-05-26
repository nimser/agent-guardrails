## 1. New Rule Packs

- [ ] 1.1 Create `src/packs/kubernetes.ts` with kubernetesRulePack
- [ ] 1.2 Add rule `kubernetes.secrets` with bash-command matcher `/\bkubectl\s+(get|describe)\s+secrets?\b/`
- [ ] 1.3 Create `src/packs/vault.ts` with vaultRulePack
- [ ] 1.4 Add rule `vault.read` with bash-command matcher `/\bvault\s+(kv\s+)?(get|read)\b/`
- [ ] 1.5 Add unit tests for kubernetes rules (positive + negative)
- [ ] 1.6 Add unit tests for vault rules (positive + negative)
- [ ] 1.7 Export new packs from `@agent-guardrails/secrets` index

## 2. Update Rule Pack DefaultActions to Suggest

- [ ] 2.1 Update `env.read` defaultAction to suggest with multiple replacements
- [ ] 2.2 Update `env.read-bash` defaultAction to suggest with multiple replacements
- [ ] 2.3 Update `sops.decrypt` defaultAction to suggest with multiple replacements
- [ ] 2.4 Update `private-key.read` defaultAction to suggest with single replacement
- [ ] 2.5 Set `kubernetes.secrets` defaultAction to suggest
- [ ] 2.6 Set `vault.read` defaultAction to suggest

## 3. findSaferCommands Implementation

- [ ] 3.1 Create `src/safer-commands.ts` with `SaferCommand` interface (command, description, confidence)
- [ ] 3.2 Implement `findSaferCommands(command: string): SaferCommand[]` function
- [ ] 3.3 Implement env read detection: `/\b(cat|bat|head|tail|less|more|type)\b.*\.env\b/`
- [ ] 3.4 Implement env read suggestions: sed redaction, head -c 4, grep -c
- [ ] 3.5 Implement sops detection: `/\bsops\s+(-d|--decrypt)\b/`
- [ ] 3.6 Implement sops suggestions: sed redaction, grep -o with context
- [ ] 3.7 Implement kubectl detection: `/\bkubectl\s+(get|describe)\s+secrets?\b/`
- [ ] 3.8 Implement vault detection: `/\bvault\s+(kv\s+)?(get|read)\b/`
- [ ] 3.9 Implement private key detection: `/\b(cat|bat|head|tail|less)\b.*\.(pem|key|p12|pfx|p8)\b/`
- [ ] 3.10 Implement sorting by confidence (highest first)

## 4. Smart Piped Command Detection

- [ ] 4.1 Create `src/piped-detection.ts` with `isPipedSafe(command: string): boolean` function
- [ ] 4.2 Detect `grep -o` with limited context pattern: `grep\s+-o\s+.\{0,\d+\}`
- [ ] 4.3 Detect `head`/`tail` with line limit: `(head|tail)\s+-\d+`
- [ ] 4.4 Detect `wc -l` for line counting
- [ ] 4.5 Detect `grep -c` for counting matches
- [ ] 4.6 Return true when safe piped precautions detected
- [ ] 4.7 Add unit tests for safe piped commands
- [ ] 4.8 Add unit tests for unsafe piped commands (grep without -o)

## 5. SOPS Redaction

- [ ] 5.1 Create `src/redact-sops.ts` with format detection
- [ ] 5.2 Implement `detectSopsFormat(command: string): 'yaml' | 'json' | 'env' | 'generic'` function
- [ ] 5.3 Parse `--output-type` flag from command to determine format
- [ ] 5.4 Implement YAML redaction: replace values after `:` with `[REDACTED]`
- [ ] 5.5 Implement JSON redaction: parse, replace all string values, stringify
- [ ] 5.6 Implement ENV redaction: replace values after `=` with `[REDACTED]`
- [ ] 5.7 Implement generic fallback redaction
- [ ] 5.8 Add unit tests for all format variants
- [ ] 5.9 Add unit tests for --output-type flag handling

## 6. Pi Adapter Updates

- [ ] 6.1 Update Pi Adapter to check `defaultAction.type` for suggest Behavior
- [ ] 6.2 For suggest: return `{ block: true, reason: "Suggestion: ..." }` with primary Replacement
- [ ] 6.3 Include description of what suggestion does in Message
- [ ] 6.4 Add unit tests for suggest Behavior in Pi Adapter

## 7. opencode Adapter Updates

- [ ] 7.1 Update opencode Adapter to check `defaultAction.type` for suggest Behavior
- [ ] 7.2 For suggest: throw Error with primary Replacement Message
- [ ] 7.3 Include description of what suggestion does in Message
- [ ] 7.4 Add unit tests for suggest Behavior in opencode Adapter

## 8. Module Exports

- [ ] 8.1 Export kubernetesRulePack, vaultRulePack from index
- [ ] 8.2 Export `findSaferCommands` from safer-commands.ts
- [ ] 8.3 Export `isPipedSafe` from piped-detection.ts
- [ ] 8.4 Export `redactSopsOutput` from redact-sops.ts
- [ ] 8.5 Update `ALL_RULE_PACKS` to include new packs

## 9. Integration Tests

- [ ] 9.1 Test SOPS transform suggests redacted decrypt command
- [ ] 9.2 Test env transform suggests multiple redacted read commands
- [ ] 9.3 Test kubernetes transform suggests redacted secrets command
- [ ] 9.4 Test vault transform suggests redacted read command
- [ ] 9.5 Test SOPS redaction is format-aware (YAML, JSON, ENV)
- [ ] 9.6 Test SOPS redaction respects --output-type flag
- [ ] 9.7 Test findSaferCommands returns multiple alternatives
- [ ] 9.8 Test smart piped detection allows safe commands
- [ ] 9.9 Test smart piped detection blocks unsafe commands
- [ ] 9.10 Test suggest works in all Harnesses

## 10. Documentation

- [ ] 10.1 Document kubernetes and vault Rule Packs
- [ ] 10.2 Document SOPS redaction Behavior and --output-type handling
- [ ] 10.3 Document multiple suggestions and prioritization
- [ ] 10.4 Document smart piped command detection
