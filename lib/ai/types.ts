// ─── AI Shared Types ─────────────────────────────────────────────────────────
// Used by all agents and the shared AI client. Keep this file import-free so
// it can be referenced from both server and (if needed) edge code.

export interface AIClientConfig {
  baseUrl: string
  model: string
  apiKey: string
  timeoutMs?: number
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIChatOptions {
  messages: AIMessage[]
  temperature?: number
  maxTokens?: number
}

export interface AIChatResponse {
  content: string
  model: string
  promptTokens: number
  completionTokens: number
}

export interface AIError extends Error {
  code: 'UNAVAILABLE' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'PARSE_ERROR' | 'AUTH_ERROR' | 'UNKNOWN'
  statusCode?: number
  retryable: boolean
}

export function createAIError(
  message: string,
  code: AIError['code'],
  statusCode?: number,
): AIError {
  const err = new Error(message) as AIError
  err.code = code
  err.statusCode = statusCode
  // TIMEOUT is NOT retryable — retrying just doubles the wait.
  // Only transient connection failures (UNAVAILABLE, UNKNOWN) are worth retrying.
  err.retryable = ['UNAVAILABLE', 'UNKNOWN'].includes(code)
  return err
}

// Shape produced by every agent service (generalised over its parsed output)
export interface AgentResult<T> {
  data: T
  rawContent: string
  model: string
  durationMs: number
}
