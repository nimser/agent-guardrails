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
  | { type: 'block'; message: string }
  | { type: 'suggest'; replacement: string; message?: string }
  | { type: 'run'; replacement: string; message?: string }
  | { type: 'confirm'; message: string; fallback?: BeforeToolAction }

/**
 * Actions available in the `after-tool` phase.
 */
export type AfterToolAction = { type: 'redact'; replacement: string }

/** Union of all possible guardrail actions across both phases. */
export type GuardrailAction = BeforeToolAction | AfterToolAction

/**
 * How a rule identifies a matching tool call.
 * - `bash-command`: regex against the command string
 * - `file-path`: regex against the file path
 * - `predicate`: named function registered in the PredicateRegistry
 */
export type GuardrailMatcher =
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
  | { toolName: string; command?: string; filePath?: string }

/** A single guardrail rule evaluated in the before-tool phase. */
export interface BeforeToolRule {
  id: string
  title: string
  description: string
  phase: 'before-tool'
  match: GuardrailMatcher
  defaultAction: BeforeToolAction
}

/** A single guardrail rule evaluated in the after-tool phase. */
export interface AfterToolRule {
  id: string
  title: string
  description: string
  phase: 'after-tool'
  match: GuardrailMatcher
  defaultAction: AfterToolAction
}

/** Union of rules from both phases. */
export type GuardrailRule = BeforeToolRule | AfterToolRule

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
}
