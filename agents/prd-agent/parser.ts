// ─── PRD Agent — Parser ───────────────────────────────────────────────────────
// Validates and cleans the raw LLM output into a canonical PRD Markdown string.

import { cleanResponse } from '@/lib/ai/prompts'
import { createAIError } from '@/lib/ai/types'

// Sections that must exist in a valid PRD
const REQUIRED_SECTIONS = [
  '## Executive Summary',
  '## Project Vision',
  '## Problem Statement',
  '## Functional Requirements',
  '## User Stories',
]

/**
 * Validate and clean the raw PRD content from the LLM.
 * Returns a trimmed Markdown string ready for storage.
 * Throws AIError with code PARSE_ERROR if validation fails.
 */
export function parsePRD(raw: string): string {
  const cleaned = cleanResponse(raw)

  if (!cleaned || cleaned.length < 200) {
    throw createAIError(
      'The AI returned an empty or too-short PRD. Please try again.',
      'PARSE_ERROR',
    )
  }

  // Ensure required sections are present
  const missingSections = REQUIRED_SECTIONS.filter(
    (section) => !cleaned.toLowerCase().includes(section.toLowerCase()),
  )

  if (missingSections.length > 2) {
    throw createAIError(
      `The generated PRD is missing key sections: ${missingSections.join(', ')}. Please try regenerating.`,
      'PARSE_ERROR',
    )
  }

  return cleaned
}
