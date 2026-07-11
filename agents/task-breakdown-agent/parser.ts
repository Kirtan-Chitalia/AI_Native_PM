// ─── Task Breakdown Agent — Parser ────────────────────────────────────────────

import { cleanResponse } from '@/lib/ai/prompts'
import { parseJSON } from '@/lib/ai/utils'
import { createAIError } from '@/lib/ai/types'
import type { GeneratedTask, TaskPriority, TaskComplexity, SuggestedRole } from './types'

const VALID_PRIORITIES: TaskPriority[] = ['critical', 'high', 'medium', 'low']
const VALID_COMPLEXITIES: TaskComplexity[] = ['low', 'medium', 'high']
const VALID_ROLES: SuggestedRole[] = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'QA Engineer',
  'DevOps Engineer',
  'UI/UX Designer',
]

function coercePriority(v: unknown): TaskPriority {
  const s = String(v ?? '').toLowerCase()
  if ((VALID_PRIORITIES as string[]).includes(s)) return s as TaskPriority
  return 'medium'
}

function coerceComplexity(v: unknown): TaskComplexity {
  const s = String(v ?? '').toLowerCase()
  if ((VALID_COMPLEXITIES as string[]).includes(s)) return s as TaskComplexity
  return 'medium'
}

function coerceRole(v: unknown): SuggestedRole {
  const s = String(v ?? '')
  if ((VALID_ROLES as string[]).includes(s)) return s as SuggestedRole
  return 'Full Stack Developer'
}

/**
 * Parse and validate the raw JSON task list from the LLM.
 * Returns a typed GeneratedTask[] ready for storage.
 */
export function parseTasks(raw: string): GeneratedTask[] {
  const cleaned = cleanResponse(raw)

  let parsed: unknown
  try {
    parsed = parseJSON<unknown>(cleaned)
  } catch {
    throw createAIError(
      'The AI did not return valid JSON for task breakdown. Please try again.',
      'PARSE_ERROR',
    )
  }

  if (!Array.isArray(parsed)) {
    throw createAIError(
      'Expected a JSON array of tasks but got a different structure. Please try again.',
      'PARSE_ERROR',
    )
  }

  if (parsed.length === 0) {
    throw createAIError('The AI returned an empty task list. Please try again.', 'PARSE_ERROR')
  }

  const tasks: GeneratedTask[] = parsed.map((item: unknown, index: number) => {
    if (typeof item !== 'object' || item === null) {
      throw createAIError(`Task at index ${index} is not an object.`, 'PARSE_ERROR')
    }
    const t = item as Record<string, unknown>

    if (!t['title'] || typeof t['title'] !== 'string') {
      throw createAIError(`Task at index ${index} is missing a valid title.`, 'PARSE_ERROR')
    }

    return {
      title: String(t['title']).slice(0, 80),
      description: typeof t['description'] === 'string' ? t['description'] : '',
      priority: coercePriority(t['priority']),
      complexity: coerceComplexity(t['complexity']),
      suggestedRole: coerceRole(t['suggestedRole']),
      estimatedEffort: typeof t['estimatedEffort'] === 'string' ? t['estimatedEffort'] : 'TBD',
      dependencies: Array.isArray(t['dependencies'])
        ? (t['dependencies'] as unknown[]).map(String)
        : [],
    }
  })

  return tasks
}
