// ─── Shared Prompt Utilities ──────────────────────────────────────────────────
// Helpers shared across all agents for building consistent, well-formed prompts.

import type { AIMessage } from './types'

/**
 * Build a standard system message.
 */
export function systemPrompt(content: string): AIMessage {
  return { role: 'system', content: content.trim() }
}

/**
 * Build a standard user message.
 */
export function userPrompt(content: string): AIMessage {
  return { role: 'user', content: content.trim() }
}

/**
 * Extract raw text from the first fenced code block in the response.
 * If no code fence is found, returns the full trimmed string.
 * Handles ```markdown, ```json, ``` (plain), and no fences at all.
 */
export function extractFencedBlock(raw: string, language?: string): string {
  // Try to match a fenced block of the requested language first, then any fence
  const patterns = language
    ? [
        new RegExp('```' + language + '\\s*\\n([\\s\\S]*?)\\n```', 'i'),
        /```[\w]*\s*\n([\s\S]*?)\n```/,
      ]
    : [/```[\w]*\s*\n([\s\S]*?)\n```/]

  for (const pattern of patterns) {
    const match = raw.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return raw.trim()
}

/**
 * Strip <think>…</think> reasoning blocks that some models (e.g. qwen3) emit
 * before the actual answer.
 */
export function stripThinkingBlocks(raw: string): string {
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

/**
 * Compose a clean final string ready for further parsing.
 */
export function cleanResponse(raw: string): string {
  return stripThinkingBlocks(raw)
}
