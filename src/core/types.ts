export type GuardrailBehavior = 'block' | 'suggest' | 'run' | 'redact' | 'confirm';

export type GuardrailAction =
  | { type: 'allow' }
  | { type: 'block'; message: string }
  | { type: 'suggest'; replacement: string; message?: string }
  | { type: 'run'; replacement: string; message?: string }
  | { type: 'redact'; replacement: string }
  | { type: 'confirm'; message: string; fallback?: GuardrailAction };

export type GuardrailMatcher =
  | { type: 'bash-command'; pattern: RegExp }
  | { type: 'file-path'; pattern: RegExp }
  | { type: 'predicate'; predicateName: string };

export type ToolCallContext =
  | { toolName: 'bash'; command: string; filePath?: string }
  | { toolName: 'read'; filePath: string }
  | { toolName: 'write'; filePath: string }
  | { toolName: string; command?: string; filePath?: string };

export interface GuardrailRule {
  id: string;
  title: string;
  description: string;
  phase: 'before-tool' | 'after-tool';
  match: GuardrailMatcher;
  defaultAction: GuardrailAction;
}

export interface RulePack {
  id: string;
  name: string;
  description: string;
  rules: GuardrailRule[];
}

export interface HarnessCapabilities {
  block: boolean;
  suggest: boolean;
  run: boolean;
  redact: boolean;
  confirm: boolean;
}
