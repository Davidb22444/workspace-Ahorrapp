import crypto from 'crypto'

export const generateEmailVerificationCode = (): string => {
  return crypto.randomInt(100000, 999999).toString()
}

export const renderEmailVerificationEmail = (email: string, code: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verifica tu correo electrónico - AhorrApp</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; text-align: center; }
        .code {
          display: inline-block;
          background: #f0fdf4;
          color: #065f46;
          padding: 20px 40px;
          font-size: 36px;
          font-weight: bold;
          letter-spacing: 8px;
          border-radius: 8px;
          margin: 20px 0;
          border: 2px dashed #10b981;
          font-family: monospace;
        }
        .footer { color: #6b7280; font-size: 14px; margin-top: 30px; }
        .hint { color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>¡Bienvenido a AhorrApp!</h1>
        </div>
        <div class="content">
          <h2>Verifica tu correo electrónico</h2>
          <p>Hola, gracias por registrarte en AhorrApp. Usa el siguiente código para verificar tu cuenta:</p>
          <div class="code">${code}</div>
          <p>Este código expirará en 24 horas.</p>
          <p class="hint">Si no creaste una cuenta en AhorrApp, por favor ignora este correo.</p>
          <div class="footer">
            <p>© 2026 AhorrApp. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}
