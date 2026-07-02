import nodemailer from 'nodemailer'

const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
const smtpPort = Number(process.env.SMTP_PORT) || 587
const fromEmail = process.env.SMTP_FROM || smtpUser

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter
  if (!smtpUser || !smtpPass) return null
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  })
  return transporter
}

export const sendEmail = async (to: string, subject: string, html: string) => {
  const t = getTransporter()
  if (!t) {
    console.log('[email] SMTP no configurado. Establece SMTP_USER y SMTP_PASS en .env')
    console.log('[email] Para:', to)
    console.log('[email] Asunto:', subject)
    console.log('[email] HTML:', html.substring(0, 200) + '...')
    return { id: 'mock-id', email: to }
  }

  try {
    const info = await t.sendMail({
      from: fromEmail ? `"AhorrApp" <${fromEmail}>` : undefined,
      to,
      subject,
      html,
    })
    console.log('[email] Enviado:', info.messageId)
    return { id: info.messageId, email: to }
  } catch (error) {
    console.error('[email] Error al enviar:', error)
    throw error
  }
}
