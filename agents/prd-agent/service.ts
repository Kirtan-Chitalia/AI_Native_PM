// ─── PRD Agent — Service ──────────────────────────────────────────────────────
// Business logic for PRD generation. Owns the prompt → AI call → parse pipeline.
// Database persistence is handled by the API route, not here.

import { createAIClient } from '@/lib/ai/client'
import { retryWithBackoff } from '@/lib/ai/utils'
import type { AgentResult } from '@/lib/ai/types'
import { buildPRDMessages } from './prompt'
import { parsePRD } from './parser'

export interface PRDOutput {
  content: string // validated Markdown string
}

/**
 * Generate a PRD for the given project.
 *
 * @param projectName - The human-readable project name
 * @param projectDescription - A description of what the project is about
 * @returns AgentResult containing the parsed Markdown PRD
 */
export async function generatePRD(
  projectName: string,
  projectDescription: string,
): Promise<AgentResult<PRDOutput>> {
  if (!projectName?.trim()) {
    throw new Error('Project name is required to generate a PRD.')
  }
  if (!projectDescription?.trim()) {
    throw new Error('Project description is required to generate a PRD.')
  }

  const client = createAIClient()
  const messages = buildPRDMessages(projectName.trim(), projectDescription.trim())

  const start = Date.now()

  const response = await retryWithBackoff(
    () =>
      client.chat({
        messages,
        temperature: 0.7,
        maxTokens: 8192,
      }),
    1, // no auto-retry — timeouts are not retryable; let the user click Retry in the UI
  )

  const content = parsePRD(response.content)

  return {
    data: { content },
    rawContent: response.content,
    model: response.model,
    durationMs: Date.now() - start,
  }
}
