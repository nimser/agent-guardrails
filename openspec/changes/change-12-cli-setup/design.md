## Context

Agent Guardrails needs a CLI for zero-friction installation across different Harnesses. Users should be able to install with a single command: `npx ag setup <agent>`.

## Goals / Non-Goals

**Goals:**
- Detect Harness config locations automatically
- Copy Adapter files and register hooks
- Report installed versions
- Run self-tests
- Work on macOS and Linux

**Non-Goals:**
- Core guardrails logic (covered in Changes 1-5)
- Platform Adapters (covered in Changes 6-9)
- Configuration system (covered in Change 11)

## Decisions

### Decision 1: Commander.js for CLI framework

**Choice**: Use Commander.js for CLI argument parsing

**Rationale**:
- Popular and well-maintained
- TypeScript support
- Easy to use
- Good documentation

**Alternatives considered**:
- Yargs: More features, but more complex
- Meow: Too simple
- Custom: Too much work

### Decision 2: Auto-detection of Harness config locations

**Choice**: Detect Harness config locations automatically

**Rationale**:
- Users don't need to know where configs are
- Reduces installation friction
- Works across different environments
- Consistent with "zero-friction" goal

**Detection logic**:
- opencode: `.opencode/plugins/`
- Pi: `.pi/extensions/`
- Codex CLI: `.codex/hooks/`
- Claude Code: `.claude/`

### Decision 3: File copy for installation

**Choice**: Copy Adapter files to Harness config directories

**Rationale**:
- Simple and reliable
- No network required
- Works offline
- Easy to update

**Alternative considered**:
- npm install: More complex, requires package registry
- Symlinks: Platform-specific, can break
- Git submodules: Too complex

### Decision 4: Version embedding

**Choice**: Embed version in CLI and Adapter files

**Rationale**:
- Easy to report versions
- Helps with debugging
- Enables update notifications
- Consistent with npm conventions

## Risks / Trade-offs

### Risk: Harness config locations change
**Mitigation**:
- Test with multiple Harness versions
- Update detection logic
- Document manual override

### Risk: Permission issues
**Mitigation**:
- Clear error messages
- Suggest fixes (chmod, sudo)
- Test on different environments

### Risk: Cross-platform compatibility
**Mitigation**:
- Use Node.js APIs (platform-agnostic)
- Test on macOS and Linux
- Avoid platform-specific code

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we support Windows?
2. How to handle agent version detection?
3. Should we support uninstall command?
