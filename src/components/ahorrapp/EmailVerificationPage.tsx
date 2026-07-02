'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, ShieldCheck } from 'lucide-react'

export default function EmailVerificationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [otpValue, setOtpValue] = useState('')
  const [email, setEmail] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const token = searchParams.get('token')
    const pendingEmail = window.sessionStorage.getItem('auth.pendingVerificationEmail')

    if (!token || !pendingEmail) {
      router.replace('/')
      return
    }

    setEmail(pendingEmail)
  }, [router, searchParams])

  const handleVerify = async () => {
    if (otpValue.length !== 6) {
      toast.error('Ingresa el código completo de 6 dígitos')
      return
    }

    setVerifying(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpValue, email: email || undefined }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Código inválido')
      }

      window.sessionStorage.removeItem('auth.pendingVerificationEmail')
      setDone(true)
      toast.success('¡Cuenta verificada exitosamente!')
      setTimeout(() => router.push('/'), 2000)
    } catch (err: any) {
      toast.error(err.message || 'Error al verificar')
      setOtpValue('')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-xl shadow-lg">
        {done ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">¡Correo verificado!</h2>
            <p className="text-muted-foreground">Redirigiendo al inicio...</p>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Verifica tu correo</h2>
            <p className="text-muted-foreground text-sm">
              Ingresa el código de 6 dígitos que enviamos a tu correo electrónico
            </p>

            <div className="space-y-2">
              <input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly
                className="w-full px-3 py-2 text-sm border rounded-lg bg-background border-border text-center"
              />
            </div>

            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue} disabled={verifying}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              className="w-full"
              onClick={handleVerify}
              disabled={otpValue.length !== 6 || verifying}
            >
              {verifying ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ShieldCheck className="w-4 h-4 mr-2" />
              )}
              Verificar Código
            </Button>

            <Button variant="link" size="sm" onClick={() => router.push('/')} className="text-xs">
              Volver al inicio
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
