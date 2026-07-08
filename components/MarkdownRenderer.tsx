'use client'

// ─── MarkdownRenderer ─────────────────────────────────────────────────────────
// Lightweight Markdown → HTML converter that avoids adding react-markdown or
// remark as dependencies. Handles the subset of Markdown produced by the PRD
// agent: headings, bold, italic, lists, horizontal rules, and paragraphs.
//
// Output is styled to match the existing design system (dark/light mode).

interface MarkdownRendererProps {
  content: string
  className?: string
}

function mdToHtml(md: string): string {
  const lines = md.split('\n')
  const html: string[] = []
  let inUl = false
  let inOl = false

  const closeList = () => {
    if (inUl) { html.push('</ul>'); inUl = false }
    if (inOl) { html.push('</ol>'); inOl = false }
  }

  const inlineFormat = (text: string): string =>
    text
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Headings
    const h4 = line.match(/^#{4}\s+(.+)/)
    const h3 = line.match(/^#{3}\s+(.+)/)
    const h2 = line.match(/^#{2}\s+(.+)/)
    const h1 = line.match(/^#\s+(.+)/)

    if (h1) { closeList(); html.push(`<h1>${inlineFormat(h1[1])}</h1>`); continue }
    if (h2) { closeList(); html.push(`<h2>${inlineFormat(h2[1])}</h2>`); continue }
    if (h3) { closeList(); html.push(`<h3>${inlineFormat(h3[1])}</h3>`); continue }
    if (h4) { closeList(); html.push(`<h4>${inlineFormat(h4[1])}</h4>`); continue }

    // Horizontal rule
    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      closeList()
      html.push('<hr />')
      continue
    }

    // Unordered list
    const ul = line.match(/^[-*+]\s+(.+)/)
    if (ul) {
      if (inOl) { html.push('</ol>'); inOl = false }
      if (!inUl) { html.push('<ul>'); inUl = true }
      html.push(`<li>${inlineFormat(ul[1])}</li>`)
      continue
    }

    // Ordered list
    const ol = line.match(/^\d+\.\s+(.+)/)
    if (ol) {
      if (inUl) { html.push('</ul>'); inUl = false }
      if (!inOl) { html.push('<ol>'); inOl = true }
      html.push(`<li>${inlineFormat(ol[1])}</li>`)
      continue
    }

    // Close open lists on non-list lines
    if (inUl || inOl) closeList()

    // Blank line → paragraph break
    if (!line.trim()) {
      html.push('<p></p>')
      continue
    }

    // Regular paragraph
    html.push(`<p>${inlineFormat(line)}</p>`)
  }

  closeList()

  // Collapse consecutive empty <p> tags
  return html.join('\n').replace(/(<p><\/p>\n?){2,}/g, '<p></p>\n')
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div
      className={`prose-prd ${className}`}
      dangerouslySetInnerHTML={{ __html: mdToHtml(content) }}
    />
  )
}
