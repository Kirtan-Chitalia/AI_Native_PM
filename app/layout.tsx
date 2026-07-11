import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import UserPanelProvider from '@/components/UserPanelProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tasklynx',
  description: 'Projects and tasks, kept simple',
}

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem('tasklynx-theme');
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <UserPanelProvider>
          {children}
        </UserPanelProvider>
        <Toaster
          position="top-right"
          duration={3000}
          toastOptions={{
            style: {
              background: 'white',
              color: '#0A0A0A',
              border: '1px solid #E5E7EB',
              borderLeft: '3px solid #E5002B',
              borderRadius: '10px',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  )
}
