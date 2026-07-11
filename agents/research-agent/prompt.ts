// ─── Research Agent — Prompt Builder ─────────────────────────────────────────

import type { AIMessage } from '@/lib/ai/types'
import type { TaskContextJSON } from '@/types/research'

/**
 * Build the system + user messages for the Research Agent.
 * The prompt instructs the AI to return a JSON array of research resources.
 */
export function buildResearchMessages(context: TaskContextJSON): AIMessage[] {
  const system: AIMessage = {
    role: 'system',
    content: `You are a Senior Software Engineering Research Assistant. Your job is to analyze a development task in the context of its project and recommend the most relevant, high-quality resources to help the developer complete it successfully.

You MUST respond with ONLY a valid JSON object in this exact shape:

{
  "summary": "A 2-3 sentence overview of the task and what the developer needs",
  "resources": [
    {
      "category": "Documentation | Library | NPM Package | Python Package | GitHub Repository | Tutorial | Video | API Reference | Best Practice | Testing | Security | Internal Resource | Database | Component | Other",
      "title": "Resource title",
      "url": "https://...",
      "description": "What this resource covers",
      "reason": "Why this is relevant to this specific task",
      "priority": "Critical | High | Medium | Low"
    }
  ]
}

Rules:
1. Return 8–20 resources covering different categories.
2. Prioritize official documentation and well-maintained libraries.
3. URLs must be real, well-known resources (MDN, npm, GitHub, official docs).
4. Include at least one resource for testing and one for security best practices.
5. If the project has a tech stack listed, prioritize resources for those technologies.
6. Consider the task's priority when setting resource priorities.
7. Include internal project resources (existing components, APIs) when relevant.
8. For internal resources, use "#internal" as the URL.
9. Do NOT include any text outside the JSON object.`,
  }

  // Build a concise context summary for the user message
  const taskInfo = [
    `Task: ${context.task.title}`,
    context.task.description ? `Description: ${context.task.description}` : null,
    `Status: ${context.task.status} | Priority: ${context.task.priority} | Story Points: ${context.task.story_points}`,
    context.task.assignee_name ? `Assigned to: ${context.task.assignee_name}` : null,
    context.task.due_date ? `Due: ${context.task.due_date}` : null,
  ].filter(Boolean).join('\n')

  const projectInfo = [
    `Project: ${context.project.name}`,
    context.project.description ? `Description: ${context.project.description}` : null,
    `Status: ${context.project.status} | Priority: ${context.project.priority}`,
  ].filter(Boolean).join('\n')

  const sections: string[] = [
    '--- TASK ---',
    taskInfo,
    '',
    '--- PROJECT ---',
    projectInfo,
  ]

  if (context.techStack.length > 0) {
    sections.push('', '--- TECH STACK ---', context.techStack.join(', '))
  }

  if (context.project.prd) {
    // Include only first 2000 chars of PRD to save tokens
    const prdSnippet = context.project.prd.length > 2000
      ? context.project.prd.slice(0, 2000) + '... (truncated)'
      : context.project.prd
    sections.push('', '--- PRD (excerpt) ---', prdSnippet)
  }

  if (context.relatedTasks.length > 0) {
    const related = context.relatedTasks.slice(0, 10).map(
      (t) => `• ${t.title} [${t.status}/${t.priority}]`
    ).join('\n')
    sections.push('', '--- RELATED TASKS ---', related)
  }

  if (context.existingComponents.length > 0) {
    sections.push('', '--- EXISTING COMPONENTS ---', context.existingComponents.join(', '))
  }

  if (context.apiEndpoints.length > 0) {
    sections.push('', '--- EXISTING APIs ---', context.apiEndpoints.join(', '))
  }

  if (context.databaseSchema.length > 0) {
    sections.push('', '--- DATABASE TABLES ---', context.databaseSchema.join(', '))
  }

  if (context.dependencies.length > 0) {
    sections.push('', '--- DEPENDENCIES ---', context.dependencies.join(', '))
  }

  if (context.codingStandards.length > 0) {
    sections.push('', '--- CODING STANDARDS ---', context.codingStandards.join(', '))
  }

  if (context.sprint) {
    sections.push('', '--- SPRINT ---',
      `${context.sprint.name} [${context.sprint.status}]`,
      context.sprint.goal ? `Goal: ${context.sprint.goal}` : '',
    )
  }

  const user: AIMessage = {
    role: 'user',
    content: `Analyze the following task and its project context. Recommend the most relevant resources to help complete this task.\n\n${sections.join('\n')}`,
  }

  return [system, user]
}
