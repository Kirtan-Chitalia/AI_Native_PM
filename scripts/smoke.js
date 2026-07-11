const fs = require('fs')
const path = require('path')

const files = [
  'components/GanttView.tsx',
  'components/CalendarView.tsx',
  'app/api/analytics/overview/route.ts',
  'app/gantt/page.tsx',
  'app/analytics/page.tsx'
]

let ok = true
for (const f of files) {
  const p = path.join(__dirname, '..', f)
  if (!fs.existsSync(p)) {
    console.error('Missing file:', f)
    ok = false
  }
}
if (!ok) process.exit(1)
console.log('Smoke check passed')
process.exit(0)
