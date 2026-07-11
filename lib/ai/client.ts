// ─── Shared AI Client ─────────────────────────────────────────────────────────
// Provider-agnostic wrapper around the OpenAI-compatible /chat/completions API.
// Switching from Ollama to LM Studio or another compatible provider only
// requires updating the three environment variables — no code changes.

import type { AIClientConfig, AIChatOptions, AIChatResponse } from './types'
import { createAIError } from './types'

// 10 minutes — local models can be slow on first load (model warm-up).
// Override with OLLAMA_TIMEOUT_MS in .env.local.
const DEFAULT_TIMEOUT_MS = 600_000

function getConfig(): AIClientConfig {
  const baseUrl = process.env.OLLAMA_BASE_URL
  const model = process.env.OLLAMA_MODEL
  const apiKey = process.env.OLLAMA_API_KEY
  const timeoutMs = process.env.OLLAMA_TIMEOUT_MS
    ? parseInt(process.env.OLLAMA_TIMEOUT_MS, 10)
    : DEFAULT_TIMEOUT_MS

  if (!baseUrl) throw createAIError('OLLAMA_BASE_URL is not set', 'UNAVAILABLE')
  if (!model) throw createAIError('OLLAMA_MODEL is not set', 'UNAVAILABLE')

  return {
    baseUrl: baseUrl.replace(/\/$/, ''), // strip trailing slash
    model,
    apiKey: apiKey ?? 'ollama',
    timeoutMs,
  }
}

export interface AIClient {
  chat(options: AIChatOptions): Promise<AIChatResponse>
  config: AIClientConfig
}

export function createAIClient(): AIClient {
  const config = getConfig()

  async function chat(options: AIChatOptions): Promise<AIChatResponse> {
    const { messages, temperature = 0.7, maxTokens = 8192 } = options
    const url = `${config.baseUrl}/chat/completions`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? DEFAULT_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
        signal: controller.signal,
      })
    } catch (err: unknown) {
      clearTimeout(timer)
      if (err instanceof Error && err.name === 'AbortError') {
        const timeoutSec = Math.round((config.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000)
        throw createAIError(
          `Ollama did not respond within ${timeoutSec}s. The model may still be loading — please wait a moment and try again. If this keeps happening, increase OLLAMA_TIMEOUT_MS in .env.local.`,
          'TIMEOUT',
        )
      }
      throw createAIError(
        `Cannot reach Ollama at ${config.baseUrl}. Is it running?`,
        'UNAVAILABLE',
      )
    } finally {
      clearTimeout(timer)
    }

    if (res.status === 401 || res.status === 403) {
      throw createAIError('Ollama auth failed — check OLLAMA_API_KEY', 'AUTH_ERROR', res.status)
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw createAIError(
        `Ollama returned HTTP ${res.status}: ${body.slice(0, 200)}`,
        'INVALID_RESPONSE',
        res.status,
      )
    }

    let json: Record<string, unknown>
    try {
      json = (await res.json()) as Record<string, unknown>
    } catch {
      throw createAIError('Ollama returned non-JSON response', 'INVALID_RESPONSE')
    }

    type Choice = { message?: { content?: string } }
    type Usage = { prompt_tokens?: number; completion_tokens?: number }

    const choices = json['choices'] as Choice[] | undefined
    const content = choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      throw createAIError('Ollama returned an empty or invalid response body', 'INVALID_RESPONSE')
    }

    const usage = (json['usage'] as Usage) ?? {}
    return {
      content: content.trim(),
      model: (json['model'] as string) ?? config.model,
      promptTokens: usage.prompt_tokens ?? 0,
      completionTokens: usage.completion_tokens ?? 0,
    }
  }

  return { chat, config }
}
