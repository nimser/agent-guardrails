# Design Session Summary

**Date:** 2026-05-28  
**Participants:** Architecture review session  
**Outcome:** Comprehensive architectural refinement of Agent Guardrails MVP

---

## Executive Summary

This session transformed the Agent Guardrails specification from a proof-of-concept mindset to a production-ready MVP architecture. Key improvements include:

- **SOLID compliance** via matcher registry pattern (OCP)
- **DDD alignment** through aggregate validation functions
- **Clean Architecture** with proper dependency direction
- **Security hardening** via multi-layer matching strategy
- **Community extensibility** with YAML rule packs
- **Observability** with Tier 1 in-memory statistics

---

## Terminology Refinement

| Before | After | Rationale |
|--------|-------|-----------|
| POC | MVP | Signals production intent, not throwaway code |
| `@agent-guardrails/core`, `/engine`, `/secrets` | `../../../core`, `src/engine`, `src/packs` | Single-package clarity |
| `packages/*` | `src/*` | Simplified structure for MVP |

---

## Architectural Decisions

### 1. Matcher Registry Pattern (OCP Compliance)

**Decision:** Implement matcher registry instead of exhaustive switch statements

**Rationale:**
- Open/Closed Principle: extend without modification
- New matcher types registered, not hardcoded
- Core defines base types (bash-command, file-path, predicate)
- Future matchers (shell-token, glob) added via registration

**Implementation:**
```typescript
// Core defines interface
interface GuardrailMatcher {
  type: string;
  // ...
}

// Registry pattern
class MatcherRegistry {
  private handlers = new Map<string, MatcherHandler>();
  
  register(type: string, handler: MatcherHandler): void { ... }
  getHandler(type: string): MatcherHandler | undefined { ... }
}

// Engine delegates to registry
function matchRule(rule: Rule, ctx: ToolCallContext): boolean {
  const handler = registry.getHandler(rule.matcher.type);
  return handler?.matches(rule.matcher, ctx) ?? false;
}
```

**Files Updated:**
- `openspec/changes/change-1-project-foundation/design.md`
- `openspec/changes/change-1-project-foundation/tasks.md`
- `openspec/changes/change-1-project-foundation/spec.md`

---

### 2. Aggregate Validation (DDD Compliance)

**Decision:** Validate aggregates at system boundaries with pure functions

**Rationale:**
- DDD principle: aggregates maintain invariants
- Fail-fast with clear error messages
- Pure functions: testable, no side effects
- Validation at load time, not runtime

**Implementation:**
```typescript
// Validate rule pack
export function validateRulePack(pack: RulePack): void {
  const ruleIds = new Set<string>();
  
  for (const rule of pack.rules) {
    if (ruleIds.has(rule.id)) {
      throw new Error(`Duplicate rule ID: ${rule.id}`);
    }
    ruleIds.add(rule.id);
    
    validateRule(rule);
  }
}

// Validate individual rule
export function validateRule(rule: Rule): void {
  // Phase matches capability
  if (rule.phase === 'before-tool' && rule.behavior === 'redact') {
    throw new Error(`Redact requires after-tool phase: ${rule.id}`);
  }
  
  // Matcher type is registered
  if (!registry.getHandler(rule.matcher.type)) {
    throw new Error(`Unknown matcher type: ${rule.matcher.type}`);
  }
}
```

**Files Updated:**
- `openspec/changes/change-1-project-foundation/design.md`
- `openspec/changes/change-1-project-foundation/tasks.md`

---

### 3. Single-Package Structure with Layering

**Decision:** Ship MVP as single package with clear internal layering

**Structure:**
```
src/
  core/          # Types, constants, no logic
  matcher/       # Matcher implementations
  resolver/      # Action resolution logic
  engine/        # Orchestration
  adapters/      # Platform integrations
    pi/
    opencode/
  packs/         # Built-in rule packs (YAML)
    env.yaml
    sops.yaml
    private-key.yaml
    encryption-tools.yaml
    secret-managers.yaml
    kubernetes.yaml
    gh-cli.yaml
    direnv.yaml
    hardening.yaml
  infrastructure/ # I/O boundary
    config-loader.ts
    yaml-pack-loader.ts
    stats-writer.ts
```

**Rationale:**
- Simpler for MVP (no workspace complexity)
- Clear dependency direction: adapters → engine → matcher → core
- Infrastructure isolated (easy to test/mount)
- Split trigger: 3+ adapters or community growth

**Files Updated:**
- `openspec/changes/change-1-project-foundation/design.md`
- `openspec/changes/change-1-project-foundation/tasks.md`

---

### 4. Infrastructure Classes (Clean Architecture)

**Decision:** Implement infrastructure classes without dependency inversion initially

**Current State:**
```typescript
// infrastructure/config-loader.ts
export class ConfigLoader {
  async load(): Promise<Config> {
    // Read from file system
  }
}

// engine.ts
const configLoader = new ConfigLoader();
const config = await configLoader.load();
```

**Future State (Post-MVP):**
```typescript
// core/ports.ts
interface ConfigLoaderPort {
  load(): Promise<Config>;
}

// infrastructure/config-loader.ts
export class ConfigLoader implements ConfigLoaderPort {
  async load(): Promise<Config> { ... }
}

// engine.ts (dependency injection)
export class Engine {
  constructor(private configLoader: ConfigLoaderPort) {}
}
```

**Rationale:**
- Start simple, refactor when needed
- Dependency direction already correct (adapters → engine → infrastructure → core)
- Ports added when multiple implementations emerge

**Files Created:**
- Task added to `openspec/changes/change-1-project-foundation/tasks.md`

---

### 5. Hardening Rule Pack (Security Layer)

**Decision:** Dedicated rule pack for adversarial pattern detection

**Rationale:**
- Separates "secret detection" from "attack detection"
- Force-escalation: cannot be overridden by user config
- Defense in depth: Layer 1 catches obvious attacks

**Rules:**
```yaml
# hardening.yaml
id: hardening
description: Detect adversarial command patterns

rules:
  - id: hardening.eval
    matcher: { type: bash-command, pattern: "(?<=^|\\s)eval\\s+" }
    action: { behavior: block, message: "Eval detected - possible injection attack" }
    
  - id: hardening.bash-c
    matcher: { type: bash-command, pattern: "\\bbash\\s+-c\\b" }
    action: { behavior: block, message: "bash -c detected - possible obfuscation" }
    
  - id: hardening.sh-c
    matcher: { type: bash-command, pattern: "\\bsh\\s+-c\\b" }
    action: { behavior: block, message: "sh -c detected - possible obfuscation" }
    
  - id: hardening.subshell
    matcher: { type: bash-command, pattern: "\\$\\(.*\\)" }
    action: { behavior: block, message: "Subshell detected - possible command injection" }
    
  - id: hardening.backticks
    matcher: { type: bash-command, pattern: "`.*`" }
    action: { behavior: block, message: "Backticks detected - possible command injection" }
```

**Behavior:**
- NonOverridable Block Action: action cannot be overridden to 'allow'
- Logged separately for security audit
- Configurable: entire pack can be disabled (not individual rules)

**Files Updated:**
- `openspec/changes/change-2-secret-blocking/proposal.md`
- `openspec/changes/change-2-secret-blocking/design.md`
- `openspec/changes/change-2-secret-blocking/tasks.md`

---

### 6. Multi-Layer Matching Strategy

**Decision:** Three-layer defense-in-depth matching

**Layers:**
1. **Substring Detection (Layer 1):** Find keywords like "password", "secret", "token"
2. **Regex Patterns (Layer 2):** Match known secret formats
3. **Adversarial Detection (Layer 3):** Detect attack patterns (eval, bash -c, etc.)

**Behavior Matrix:**

| Layer 1 | Layer 2 | Layer 3 | Result |
|---------|---------|---------|--------|
| No | No | No | Allow |
| No | Yes | No | Apply rule action |
| Yes | No | No | Block (generic) |
| Yes | Yes | No | Apply rule action |
| Any | Any | Yes | **Block (force)** |

**Rationale:**
- Defense in depth: multiple layers catch different threats
- Layer 3 escalation: adversarial patterns always blocked
- Reduces false positives: Layer 2 refines Layer 1
- Flexible: rules can opt into Layer 1 detection

**Files Created:**
- `docs/matching-strategy.md` (user-facing documentation)

**Files Updated:**
- `openspec/changes/change-2-secret-blocking/design.md`

---

### 7. YAML Rule Packs (Community Extensibility)

**Decision:** Rule packs defined in YAML with JSON Schema validation

**Rationale:**
- Zero TypeScript barrier for contributors
- Easy to read/write/validate
- Community can contribute without code changes
- Built-in packs also use YAML (consistency)

**Format:**
```yaml
id: env
name: Environment Files
description: Protect .env and similar files

rules:
  - id: env.read
    description: Reading .env files
    phase: before-tool
    matcher:
      type: file-path
      pattern: "\\.env(\\..+)?$"
    action:
      behavior: block
      message: "Cannot read {matched} - contains secrets"
      
  - id: env.cat
    description: cat/less/more on .env
    phase: before-tool
    matcher:
      type: bash-command
      pattern: "\\b(cat|less|more|head|tail)\\s+[^|&]*\\.env"
    action:
      behavior: suggest
      message: "Use dotenv-safe to load .env files"
      replacement: "dotenv-safe load {matched}"
```

**Validation:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "name", "rules"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "description": { "type": "string" },
    "rules": {
      "type": "array",
      "items": { "$ref": "#/definitions/Rule" }
    }
  },
  "definitions": {
    "Rule": {
      "type": "object",
      "required": ["id", "phase", "matcher", "action"],
      "properties": {
        "id": { "type": "string" },
        "description": { "type": "string" },
        "phase": { "enum": ["before-tool", "after-tool"] },
        "matcher": { "$ref": "#/definitions/Matcher" },
        "action": { "$ref": "#/definitions/Action" }
      }
    }
  }
}
```

**Files Created:**
- `docs/yaml-rule-packs.md` (complete format specification)

**Files Updated:**
- `openspec/changes/change-1-project-foundation/design.md`
- `openspec/changes/change-1-project-foundation/tasks.md`
- `openspec/changes/change-2-secret-blocking/tasks.md`

---

### 8. Observability Tier 1 (Production Readiness)

**Decision:** In-memory statistics with session-end logging

**Implementation:**
```typescript
// src/engine/stats.ts
export interface GuardrailStats {
  totalChecks: number;
  totalMatches: number;
  matchesByRule: Record<string, number>;
  matchesByBehavior: Record<string, number>;
  blocks: number;
  suggests: number;
  runActions: number;
}

let stats: GuardrailStats = {
  totalChecks: 0,
  totalMatches: 0,
  matchesByRule: {},
  matchesByBehavior: {},
  blocks: 0,
  suggests: 0,
  runActions: 0
};

export function recordMatch(rule: Rule): void {
  stats.totalMatches++;
  stats.matchesByRule[rule.id] = (stats.matchesByRule[rule.id] || 0) + 1;
  
  const behavior = rule.action.behavior;
  stats.matchesByBehavior[behavior] = (stats.matchesByBehavior[behavior] || 0) + 1;
  
  if (behavior === 'block') stats.blocks++;
  if (behavior === 'suggest') stats.suggests++;
  if (behavior === 'run') stats.runActions++;
}

export function getStats(): GuardrailStats {
  return { ...stats };
}

export function resetStats(): void {
  stats = {
    totalChecks: 0,
    totalMatches: 0,
    matchesByRule: {},
    matchesByBehavior: {},
    blocks: 0,
    suggests: 0,
    runActions: 0
  };
}
```

**Adapter Integration:**
```typescript
// Pi adapter
pi.on("session_end", () => {
  const stats = getStats();
  if (stats.totalMatches > 0) {
    pi.log(`Agent Guardrails: ${stats.totalMatches} rules triggered`);
    pi.log(`  Blocks: ${stats.blocks}, Suggests: ${stats.suggests}, Runs: ${stats.runActions}`);
  }
});

// OpenCode adapter
opencode.on("session.end", () => {
  const stats = getStats();
  if (stats.totalMatches > 0) {
    console.log(`Agent Guardrails: ${stats.totalMatches} rules triggered`);
  }
});
```

**Rationale:**
- Zero overhead when disabled
- In-memory: no I/O, no dependencies
- Opt-in opt-out: harness controls logging
- Tier 2 (file-based) deferred to post-MVP

**Files Updated:**
- `openspec/changes/change-3-pi-adapter/proposal.md`
- `openspec/changes/change-4-opencode-adapter/proposal.md`

---

## Deferred Features (Post-MVP)

Documented in `openspec/could-have-features.md`:

1. **Tier 2 Observability:** File-based stats persistence
2. **Clean Architecture Ports:** Dependency inversion for ConfigLoader
3. **Package Splitting:** When community grows
4. **Write Tool Detection:** Analyze file write content for secrets
5. **Read Tool Enhancement:** Sniff read results for secret patterns
6. **Custom Rule Packs:** User-defined pack directories

---

## Architecture Decision Records

Created `openspec/future-architecture-decisions.md` documenting:

1. **Port Infrastructure:** When to add dependency inversion
2. **Package Splitting:** Criteria for separating adapters
3. **Infrastructure Layer:** Evolution path to full Clean Architecture
4. **Cross-Package Dependency Management:** Turborepo/Nx evaluation
5. **Multi-line Splitting:** Implementation approach
6. **Observability Evolution:** Tier 2 and Tier 3 roadmap

---

## Impact Analysis

### Files Modified: 11

**Change 1 (Foundation):**
- `proposal.md` - Updated package structure, added matcher registry
- `design.md` - Added aggregate validation, infrastructure layer
- `tasks.md` - Expanded task list with new architectural components
- `spec.md` - Updated to reflect single-package structure

**Change 2 (Secrets):**
- `proposal.md` - Added hardening rule pack
- `design.md` - Documented multi-layer matching strategy
- `tasks.md` - Added hardening pack implementation tasks

**Change 3 (Pi Adapter):**
- `proposal.md` - Added observability integration
- `spec.md` - Updated imports to relative paths

**Change 4 (OpenCode Adapter):**
- `proposal.md` - Added observability integration
- `spec.md` - Updated imports to relative paths

**Change 6 (Codex Adapter):**
- `spec.md` - Updated imports to relative paths

**Change 8 (Shell Tokenizer):**
- `tasks.md` - Updated imports to relative paths

**Change 9 (Git Guardrails):**
- `spec.md` - Added integration with hardening pack

### Files Created: 4

1. `docs/matching-strategy.md` - User-facing multi-layer matching documentation
2. `docs/yaml-rule-packs.md` - YAML format specification with examples
3. `openspec/future-architecture-decisions.md` - Post-MVP architectural roadmap
4. `openspec/could-have-features.md` - Deferred feature catalog

---

## Quality Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **SOLID Compliance** | Partial (SRP, DIP) | Full (SRP, OCP, DIP) |
| **DDD Alignment** | Informal | Formal aggregates, validation |
| **Clean Architecture** | Ad-hoc | Layered with clear dependencies |
| **Security** | Single-layer regex | Three-layer defense in depth |
| **Extensibility** | Code changes required | YAML contribution |
| **Observability** | None | In-memory stats + logging |
| **Documentation** | Inline | Dedicated docs/ directory |

---

## Next Steps

1. **Review this summary** with stakeholders
2. **Update implementation plan** based on new architecture
3. **Begin Change 1 implementation** with revised task list
4. **Set up docs/ structure** for user-facing documentation
5. **Create example YAML packs** for validation testing

---

## Questions for Future Sessions

1. Should Layer 1 substring detection be opt-in per rule or global?
2. What's the threshold for "adversarial" patterns before force-blocking?
3. How should we handle Layer 1 + Layer 3 overlap (substring + attack pattern)?
4. Should stats be exported as JSON for external analysis?
5. What's the retention policy for Tier 2 file-based stats?

---

**End of Session**
