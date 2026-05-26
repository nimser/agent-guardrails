## 1. Setup

- [ ] 1.1 Create `packages/redact/` directory structure
- [ ] 1.2 Initialize package.json with core dependency

## 2. Secret Detection

- [ ] 2.1 Create `src/detect.ts` with output scanning
- [ ] 2.2 Reuse patterns from `@agent-guardrails/secrets`

## 3. Redaction Logic

- [ ] 3.1 Create `src/redact.ts` with redaction functions
- [ ] 3.2 Implement descriptive marker replacement
- [ ] 3.3 Handle multiple secrets in output

## 4. Adapter Updates

- [ ] 4.1 Update opencode adapter with PostToolUse hook
- [ ] 4.2 Update Pi adapter with tool_result hook

## 5. Testing

- [ ] 5.1 Test secret detection in output
- [ ] 5.2 Test redaction markers
- [ ] 5.3 Test performance

## 6. Documentation

- [ ] 6.1 Document redaction behavior
- [ ] 6.2 Add usage examples
