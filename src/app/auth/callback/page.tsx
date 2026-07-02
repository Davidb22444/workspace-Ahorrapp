'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import supabase from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const [message, setMessage] = useState('Procesando inicio de sesión...')

  useEffect(() => {
    let cancelled = false

    const finishLogin = async () => {
      try {
        let session = null

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error || !data.session?.access_token) {
            throw error || new Error('No se pudo completar la sesión')
          }
          session = data.session
        } else {
          const { data, error } = await supabase.auth.getSession()
          if (error || !data.session?.access_token) {
            throw error || new Error('No se encontró sesión de Google en la URL')
          }
          session = data.session
        }

        const res = await fetch('/api/auth/google-session', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (!res.ok) {
          throw new Error('No se pudo crear la sesión de AhorrApp')
        }

        try {
          await supabase.auth.signOut({ scope: 'local' })
        } catch {
          // Best effort: the app uses its own cookie session after this point.
        }

        if (!cancelled) {
          const target = next.startsWith('/') ? next : '/'
          if (window.opener && !window.opener.closed) {
            window.opener.location.replace(target)
            window.close()
            return
          }
          router.replace(target)
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setMessage('No se pudo completar el inicio de sesión. Volviendo al inicio...')
          router.replace('/?auth=google-error')
        }
      }
    }

    finishLogin()

    return () => {
      cancelled = true
    }
  }, [code, next, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div>
          <p className="text-lg font-semibold">Iniciando sesión</p>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        </div>
      </div>
    </div>
  )
}
