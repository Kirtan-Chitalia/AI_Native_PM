// ─── Task Breakdown Agent — Service ──────────────────────────────────────────

import { createAIClient } from '@/lib/ai/client'
import { retryWithBackoff } from '@/lib/ai/utils'
import type { AgentResult } from '@/lib/ai/types'
import { buildTaskBreakdownMessages } from './prompt'
import { parseTasks } from './parser'
import type { GeneratedTask } from './types'

export type { GeneratedTask } from './types'

export interface TaskBreakdownOutput {
  tasks: GeneratedTask[]
}

/**
 * Generate a structured task list from a PRD Markdown string.
 *
 * @param prdContent - The full Markdown content of the approved PRD
 * @returns AgentResult containing the parsed task list
 */
export async function generateTasks(
  prdContent: string,
): Promise<AgentResult<TaskBreakdownOutput>> {
  if (!prdContent?.trim()) {
    throw new Error('PRD content is required to generate tasks.')
  }

  const client = createAIClient()
  const messages = buildTaskBreakdownMessages(prdContent.trim())

  const start = Date.now()

  const response = await retryWithBackoff(
    () =>
      client.chat({
        messages,
        temperature: 0.4, // lower temp for structured JSON output
        maxTokens: 8192,
      }),
    1, // no auto-retry — let the user click Retry in the UI
  )

  const tasks = parseTasks(response.content)

  return {
    data: { tasks },
    rawContent: response.content,
    model: response.model,
    durationMs: Date.now() - start,
  }
}
