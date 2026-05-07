import { Resend } from 'resend'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

export interface SendEmailParams {
  to: string | string[]
  subject: string
  template: string        // template name (maps to project email-templates/ or bot-core/email-templates/)
  variables: Record<string, string>
  from?: string
}

// sendEmail({ to, subject, template, variables })
// Template files live in: projects/[name]/email-templates/{template}.html
// Falls back to packages/bot-core/email-templates/{template}.html

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { to, subject, variables, from = 'noreply@portfolio.app' } = params

  // Build HTML by reading template file and substituting {{key}} placeholders
  const html = await loadTemplate(params.template, variables)

  await getResend().emails.send({
    from,
    to,
    subject,
    html,
  })
}

async function loadTemplate(name: string, variables: Record<string, string>): Promise<string> {
  const { readFile } = await import('fs/promises')
  const { join } = await import('path')

  // Projects can override templates by placing them in their email-templates/
  const candidates = [
    join(process.cwd(), 'email-templates', `${name}.html`),
    join(new URL(import.meta.url).pathname.replace('/src/email/index.ts', ''), 'email-templates', `${name}.html`),
  ]

  let html = ''
  for (const p of candidates) {
    try {
      html = await readFile(p, 'utf-8')
      break
    } catch {
      // try next
    }
  }

  if (!html) throw new Error(`Email template "${name}" not found`)

  for (const [key, val] of Object.entries(variables)) {
    html = html.replaceAll(`{{${key}}}`, val)
  }

  return html
}
