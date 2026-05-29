# Proposal: Integration Testing

## Intent

End-to-end integration testing to validate all components work together.

## Problem

Individual components are tested in isolation, but we need to verify complete workflows.

## Solution

Implement integration tests that:
1. Wire all Adapters to core module
2. Test complete workflows
3. Validate performance targets

## Scope

### In Scope
- SOPS workflow: block → suggest → agent retries with **Safer Alternative**
- .env workflow: block → suggest redacted version
- Git workflow: block → suggest **Replacement**
- Performance benchmarking

### Out of Scope
- Individual component testing (covered in earlier changes)

## Approach

1. Create integration test suite
2. Test each workflow end-to-end
3. Benchmark performance

## Success Criteria

- [ ] All workflows pass end-to-end
- [ ] Performance targets met (< 50ms overhead)
- [ ] No regressions

## Dependencies

- Depends on all earlier changes
