// ─── Research Agent — Service ────────────────────────────────────────────────
// Business logic for research generation. Follows the same architecture as
// prd-agent/service.ts: prompt → AI call → parse pipeline.
// Database persistence is handled by the API route, not here.

import { createAIClient } from '@/lib/ai/client'
import { retryWithBackoff } from '@/lib/ai/utils'
import type { AgentResult } from '@/lib/ai/types'
import type { TaskContextJSON, ResearchOutput } from '@/types/research'
import { buildResearchMessages } from './prompt'
import { parseResearchResponse } from './parser'

/**
 * Generate research recommendations for a task given its context.
 *
 * @param context - The structured context JSON from the Context Service
 * @returns AgentResult containing categorized research resources
 */
export async function generateResearch(
  context: TaskContextJSON,
): Promise<AgentResult<ResearchOutput>> {
  if (!context.task?.id) {
    throw new Error('Task context must include a valid task ID.')
  }
  if (!context.task?.title?.trim()) {
    throw new Error('Task context must include a task title.')
  }

  const client = createAIClient()
  const messages = buildResearchMessages(context)

  const start = Date.now()

  const response = await retryWithBackoff(
    () =>
      client.chat({
        messages,
        temperature: 0.6,  // Slightly lower than PRD for more focused results
        maxTokens: 8192,
      }),
    1, // No auto-retry — let the user click Retry in the UI
  )

  const data = parseResearchResponse(response.content, context.task.id)

  return {
    data,
    rawContent: response.content,
    model: response.model,
    durationMs: Date.now() - start,
  }
}
