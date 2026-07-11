// ─── Task Breakdown Agent — Prompt Builder ────────────────────────────────────

import { systemPrompt, userPrompt } from '@/lib/ai/prompts'
import type { AIMessage } from '@/lib/ai/types'

const SYSTEM_CONTENT = `You are a senior software engineering lead and agile project manager.

Your task is to analyse a Product Requirements Document (PRD) and break it down into a structured list of development tasks.

Output ONLY a valid JSON array — no markdown fences, no preamble, no commentary.
The JSON must be an array of task objects with exactly these fields:

[
  {
    "title": "string — short, actionable task title (max 80 chars)",
    "description": "string — 2-4 sentence description of what needs to be done",
    "priority": "critical" | "high" | "medium" | "low",
    "complexity": "low" | "medium" | "high",
    "suggestedRole": "Frontend Developer" | "Backend Developer" | "Full Stack Developer" | "QA Engineer" | "DevOps Engineer" | "UI/UX Designer",
    "estimatedEffort": "string — e.g. '2 days', '1 week', '3 hours'",
    "dependencies": ["array of other task titles this task depends on — empty array if none"]
  }
]

Rules:
- Generate between 8 and 25 tasks depending on project complexity.
- Cover all major areas: UI/UX design, frontend, backend, API, database, testing, deployment, documentation.
- Dependencies must reference exact titles from the same list.
- Priority must reflect business value and technical risk.
- Complexity must reflect engineering effort.
- Output ONLY the JSON array. No surrounding text whatsoever.`

export function buildTaskBreakdownMessages(prdContent: string): AIMessage[] {
  return [
    systemPrompt(SYSTEM_CONTENT),
    userPrompt(
      `Analyse the following PRD and generate the task breakdown JSON array.

---
${prdContent}
---

Output the JSON array now:`,
    ),
  ]
}
