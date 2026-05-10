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

  // Шаблоны ищутся в email-templates/ относительно рабочей директории проекта.
  // Специальное имя '__raw__' — html передаётся напрямую через variables.__html__
  if (name === '__raw__') {
    return variables['__html__'] ?? ''
  }

  const templatePath = join(process.cwd(), 'email-templates', `${name}.html`)
  let html = ''
  try {
    html = await readFile(templatePath, 'utf-8')
  } catch {
    throw new Error(`Email template "${name}" not found at ${templatePath}`)
  }

  for (const [key, val] of Object.entries(variables)) {
    html = html.replaceAll(`{{${key}}}`, val)
  }

  return html
}
