/**
 * The five behaviors a guardrail rule can enforce.
 * - `block`: stop the tool call entirely
 * - `suggest`: stop the call and offer a safer replacement to the LLM
 * - `run`: stop the call, execute the replacement in the hook, return output
 * - `redact`: allow the call but sanitize its output before the LLM sees it
 * - `confirm`: ask the user for approval (or fall back to suggest)
 */
export type GuardrailBehavior = 'block' | 'suggest' | 'run' | 'redact' | 'confirm'

/**
 * Actions available in the `before-tool` phase.
 */
export type BeforeToolAction =
  | { type: 'allow' }
  | { type: 'block'; message: string; fallbackReason?: string }
  | { type: 'suggest'; replacement: string; message?: string }
  | { type: 'run'; replacement: string; message?: string }
  | { type: 'confirm'; message: string; fallback?: BeforeToolAction }

/**
 * Actions available in the `after-tool` phase.
 */
export type AfterToolAction = { type: 'redact'; replacement: string }

/**
 * Actions available in the `user-input` phase.
 * `suggest` and `run` are tool-call concepts and are excluded (ADR-010).
 */
export type UserInputAction =
  | { type: 'block'; message: string; fallbackReason?: string }
  | { type: 'redact'; replacement: string }
  | { type: 'confirm'; message: string; fallback?: BeforeToolAction }

/** Union of all possible guardrail actions across all phases. */
export type GuardrailAction = BeforeToolAction | AfterToolAction

/**
 * A declarative condition that describes when a rule fires.
 * Evaluated by `matchesMatcher()` against a `ToolCallContext`.
 * - `bash-command`: regex against the command string
 * - `file-path`: regex against the file path
 * - `predicate`: named function registered in the PredicateRegistry
 */
export type MatchCondition =
  | { type: 'bash-command'; pattern: RegExp }
  | { type: 'file-path'; pattern: RegExp }
  | { type: 'predicate'; predicateName: string }

/**
 * Normalized context for a tool call, consumed by matchers and the engine.
 * Discriminated union on `toolName` — required fields differ per variant.
 */
export type ToolCallContext =
  | { toolName: 'bash'; command: string; filePath?: string }
  | { toolName: 'read'; filePath: string }
  | { toolName: 'write'; filePath: string }
  /**
   * The `user-input` phase context (ADR-010): `command` carries the prompt
   * text the user submitted, so bash-command and predicate matchers apply
   * to it unchanged. The prompt is never command-split.
   */
  | { toolName: 'user-input'; command: string; filePath?: undefined }
  | { toolName: string; command?: string; filePath?: string }

/** A single guardrail rule evaluated in the before-tool phase. */
export interface BeforeToolRule {
  id: string
  title: string
  description: string
  phase: 'before-tool'
  match: MatchCondition
  defaultAction: BeforeToolAction
}

/** A single guardrail rule evaluated in the after-tool phase. */
export interface AfterToolRule {
  id: string
  title: string
  description: string
  phase: 'after-tool'
  match: MatchCondition
  defaultAction: AfterToolAction
}

/** A single guardrail rule evaluated in the user-input phase (ADR-010). */
export interface UserInputRule {
  id: string
  title: string
  description: string
  phase: 'user-input'
  match: MatchCondition
  defaultAction: UserInputAction
}

/** Union of rules from all phases. */
export type GuardrailRule = BeforeToolRule | AfterToolRule | UserInputRule

// ── Domain Events ───────────────────────────────────────

/** Emitted when a rule's condition matches a tool call. */
export interface RuleMatchedEvent {
  readonly type: 'rule-matched'
  readonly ruleId: string
  readonly matched: string
}

/** Emitted when the resolver walks the fallback chain. */
export interface FallbackTriggeredEvent {
  readonly type: 'fallback-triggered'
  readonly from: GuardrailAction['type']
  readonly to: GuardrailAction['type']
  readonly reason: string
}

/** Union of all domain events the engine can produce. */
export type DomainEvent = RuleMatchedEvent | FallbackTriggeredEvent

/** Engine output: the resolved action plus the trace of how it was decided. */
export interface MatchResult {
  readonly action: GuardrailAction | null
  readonly events: readonly DomainEvent[]
}

/**
 * A named collection of guardrail rules. Rule packs are the unit of
 * extensibility — load them from YAML or define them in TypeScript.
 */
export interface RulePack {
  id: string
  name: string
  description: string
  rules: GuardrailRule[]
}

/**
 * Declares which behaviors a harness (AI coding agent) supports.
 * When a behavior is unsupported, the engine walks the fallback chain.
 */
export interface HarnessCapabilities {
  block: boolean
  suggest: boolean
  run: boolean
  redact: boolean
  confirm: boolean
  /** Whether the harness can rewrite the submitted prompt in the `user-input` phase (ADR-010). Defaults to false. */
  redactUserInput?: boolean
  /** Whether the adapter runs outside the process of the agent it governs (ADR-007). A declared fact, not engine behavior. */
  tamperResistant?: boolean
  /** Whether the harness can stop the current turn from the before-tool phase (ADR-002). */
  haltTurnBeforeTool?: boolean
  /** Whether the harness can stop the current turn from the after-tool phase (ADR-002). */
  haltTurnAfterTool?: boolean
}
