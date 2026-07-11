// ─── AI Utility Functions ─────────────────────────────────────────────────────

import { createAIError } from './types'
import type { AIError } from './types'

/**
 * Safe JSON parse that extracts JSON from markdown fences if present.
 * Throws an AIError with code PARSE_ERROR on failure.
 */
export function parseJSON<T>(raw: string): T {
  // Try to extract from ```json ... ``` or ``` ... ```
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  const candidate = fenceMatch ? fenceMatch[1].trim() : raw.trim()

  // Some models wrap objects in extra text — find the first [ or { and last ] or }
  const arrStart = candidate.indexOf('[')
  const objStart = candidate.indexOf('{')
  let jsonStr = candidate

  if (arrStart !== -1 || objStart !== -1) {
    const start =
      arrStart === -1
        ? objStart
        : objStart === -1
          ? arrStart
          : Math.min(arrStart, objStart)

    const isArr = candidate[start] === '['
    const end = isArr ? candidate.lastIndexOf(']') : candidate.lastIndexOf('}')
    if (end > start) {
      jsonStr = candidate.slice(start, end + 1)
    }
  }

  try {
    return JSON.parse(jsonStr) as T
  } catch {
    throw createAIError(
      `Failed to parse JSON from AI response: ${jsonStr.slice(0, 120)}…`,
      'PARSE_ERROR',
    )
  }
}

/**
 * Retry an async function with exponential back-off.
 * Only retries when the thrown error has `retryable === true`.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const aiErr = err as AIError
      if (!aiErr.retryable || attempt === maxAttempts) throw err
      const delay = baseDelayMs * Math.pow(2, attempt - 1)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastErr
}

/**
 * Truncate a string to maxLength characters for safe logging / display.
 */
export function truncate(str: string, maxLength = 200): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '…'
}
