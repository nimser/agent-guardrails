## Context

Agent Guardrails needs end-to-end integration testing to ensure all components work together correctly. Individual components are tested in isolation, but we need to verify complete workflows.

## Goals / Non-Goals

**Goals:**
- Test all complete workflows end-to-end
- Validate performance targets
- Ensure no regressions
- Update documentation

**Non-Goals:**
- Individual component testing (covered in Changes 1-11)
- New features
- Bug fixes (unless found during integration)

## Decisions

### Decision 1: Integration test suite

**Choice**: Create comprehensive integration test suite

**Rationale**:
- Tests complete workflows
- Catches integration issues early
- Validates performance targets
- Documents expected Behavior

**Test scenarios**:
- SOPS decrypt workflow
- .env file reading workflow
- PostToolUse (Tool Result) redaction workflow
- Git guardrails workflow

### Decision 2: Performance benchmarking

**Choice**: Benchmark performance during integration testing

**Rationale**:
- Ensures performance targets are met
- Catches performance regressions
- Identifies optimization opportunities
- Documents performance characteristics

**Targets**:
- PreToolUse: < 10ms
- PostToolUse: < 50ms
- Total overhead: < 50ms

### Decision 3: Documentation updates

**Choice**: Update documentation during integration

**Rationale**:
- Documentation is part of the product
- Easier to write while testing
- Ensures accuracy
- Helps future contributors

**Documentation to update**:
- README.md
- API documentation
- Configuration guide
- Troubleshooting guide

## Risks / Trade-offs

### Risk: Integration issues
**Mitigation**:
- Test early and often
- Fix issues as they arise
- Don't wait until the end

### Risk: Performance regressions
**Mitigation**:
- Benchmark continuously
- Optimize as needed
- Set clear targets

### Risk: Documentation gaps
**Mitigation**:
- Write documentation during integration
- Review documentation carefully
- Get feedback from users

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we test with real agents or mocks?
2. How to test cross-platform compatibility?
3. Should we automate documentation generation?
