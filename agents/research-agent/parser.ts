// ─── Research Agent — Parser ─────────────────────────────────────────────────
// Validates and sanitises the AI response into a typed ResearchOutput.

import { parseJSON } from '@/lib/ai/utils'
import { createAIError } from '@/lib/ai/types'
import type { ResearchResource, ResearchOutput } from '@/types/research'

const VALID_CATEGORIES = new Set([
  'Documentation', 'Library', 'NPM Package', 'Python Package',
  'GitHub Repository', 'Tutorial', 'Video', 'API Reference',
  'Best Practice', 'Testing', 'Security', 'Internal Resource',
  'Database', 'Component', 'Other',
])

const VALID_PRIORITIES = new Set(['Critical', 'High', 'Medium', 'Low'])

/**
 * Parse and validate the raw AI response into a ResearchOutput.
 */
export function parseResearchResponse(raw: string, taskId: string): ResearchOutput {
  const parsed = parseJSON<{ summary?: string; resources?: unknown[] }>(raw)

  if (!parsed || typeof parsed !== 'object') {
    throw createAIError('Research Agent returned invalid JSON structure', 'PARSE_ERROR')
  }

  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : ''
  const rawResources = Array.isArray(parsed.resources) ? parsed.resources : []

  if (rawResources.length === 0) {
    throw createAIError('Research Agent returned no resources', 'PARSE_ERROR')
  }

  const resources: ResearchResource[] = rawResources
    .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
    .map((r) => ({
      category: VALID_CATEGORIES.has(r.category as string)
        ? (r.category as ResearchResource['category'])
        : 'Other',
      title: typeof r.title === 'string' ? r.title.trim() : 'Untitled Resource',
      url: typeof r.url === 'string' ? r.url.trim() : '#',
      description: typeof r.description === 'string' ? r.description.trim() : '',
      reason: typeof r.reason === 'string' ? r.reason.trim() : '',
      priority: VALID_PRIORITIES.has(r.priority as string)
        ? (r.priority as ResearchResource['priority'])
        : 'Medium',
    }))
    .filter((r) => r.title !== 'Untitled Resource') // drop clearly invalid entries

  return {
    summary,
    resources,
    taskId,
  }
}
