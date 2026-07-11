import nodemailer from 'nodemailer'

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (transporter) return transporter
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  return transporter
}

// Returns true if a real email was sent, false if it fell back to console logging
// (SMTP env vars not configured yet).
export async function sendOTPEmail(to: string, otp: string): Promise<boolean> {
  const t = getTransporter()
  if (!t) {
    console.log(`\n📧 [DEV] OTP for ${to}: ${otp}\n`)
    return false
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Your Tasklynx verification code',
    text: `Your verification code is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your verification code is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
  })
  return true
}
