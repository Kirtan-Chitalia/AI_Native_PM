import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Auth App',
  description: 'Next.js auth with HTTP cookies and OTP',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
