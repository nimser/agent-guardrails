---
status: accepted
decisions: [7, 8, 9]
ref: openspec/changes/change-1-project-foundation/design.md (internal use only)
---

# ADR-002: Extensible Matcher Registry

## Context

The engine must detect dangerous patterns in tool calls. A hard-coded switch of matcher types violates the Open/Closed Principle — adding a new matcher type (e.g., shell-token, glob, AST-based) would require modifying core engine code. The registry pattern inverts this: new types register themselves.

## Decision

### Matcher Registry

`MatcherRegistry` maps matcher `type` strings to `MatcherHandler` implementations:

```typescript
class MatcherRegistry {
  register(type: string, handler: MatcherHandler): void;
  evaluate(matcher: GuardrailMatcher, ctx: ToolCallContext): boolean;
  clear(): void; // test isolation
}
```

The engine uses `matcherRegistry.evaluate()` — never a switch statement. The registry is a module-level singleton exported from `src/matcher/registry.ts`.

### Explicit Initialization

Registration is explicit, not automatic on import. Adapters call `initializeMatcherRegistry()` once at bootstrap. This avoids hidden side-effects and enables test isolation (each test creates a fresh registry).

### Built-in Handlers (0.1.0)

- `bash-command` — regex match against `ToolCallContext.command`
- `file-path` — regex match against `ToolCallContext.filePath`
- `predicate` — named function from `PredicateRegistry` for complex logic

### ToolCallContext as Discriminated Union

`ToolCallContext` is a discriminated union on `toolName`. Required fields vary per tool variant (`bash` requires `command`, `read` requires `filePath`). TypeScript enforces this at compile time.

### Aggregate Validation

`validateRule()` and `validateRulePack()` (in `src/core/validator.ts`) verify:

- All required fields present
- Phase-behavior compatibility
- Matcher type is registered
- No duplicate rule IDs within a pack
- Each rule passes individual validation

Validation runs at load time, not at match time. Bad packs fail fast with descriptive errors.

### Rationale

- **OCP:** New matcher types require a handler file + one registration line — zero engine changes
- **Testability:** Tests instantiate fresh registries, register only needed handlers, avoid global state leaks
- **Predictability:** Explicit init means no import-order dependencies
- **Fail-fast:** Validation catches configuration errors before any tool call is evaluated

## Consequences

- Adding a new matcher type = create handler + add `registry.register()` to `initializeMatcherRegistry()` in `src/matcher/setup.ts`
- Tests must call `matcherRegistry.clear()` or `MatcherRegistry.new()` for isolation
- `predicate` matcher type requires TypeScript rule packs (cannot be expressed in YAML)
- Unregistered matcher types fail at pack load time, not at runtime
