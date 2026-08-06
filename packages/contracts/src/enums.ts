export enum FindingSeverity {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
  Info = 'info',
}

export enum AuditStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Degraded = 'degraded',
}

export enum LanguageId {
  Typescript = 'typescript',
  Javascript = 'javascript',
  Dotnet = 'dotnet',
  Unknown = 'unknown',
}

export enum SuggestionType {
  Refactor = 'refactor',
  Vulnerability = 'vulnerability',
  Performance = 'performance',
  BestPractice = 'best-practice',
}

export enum LlmProvider {
  Anthropic = 'anthropic',
  Openai = 'openai',
  Gemini = 'gemini',
  Deepseek = 'deepseek',
  Kimi = 'kimi',
  Nvidia = 'nvidia',
  OpenaiCompatible = 'openai-compatible',
}

export enum ModelRole {
  Mini = 'mini',
  Pro = 'pro',
}
