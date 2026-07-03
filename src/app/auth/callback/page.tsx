'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import supabase from '@/lib/supabase'

function AuthCallbackContent() {
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
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--comic-bg, #FBF1DE)' }}
    >
      <div
        className="flex flex-col items-center gap-4 text-center max-w-sm p-8 rounded-2xl"
        style={{
          background: 'var(--comic-white, #FFFFFF)',
          border: '3px solid var(--comic-outline, #1A1A2E)',
          boxShadow: '6px 6px 0 var(--comic-outline, #1A1A2E)',
        }}
      >
        <Loader2
          className="w-10 h-10 animate-spin"
          style={{ color: 'var(--comic-mint, #3DDCA1)' }}
        />
        <div>
          <p
            className="text-xl"
            style={{
              fontFamily: 'var(--font-display, Fredoka, sans-serif)',
              fontWeight: 600,
              color: 'var(--comic-text, #1A1A2E)',
            }}
          >
            Iniciando sesión
          </p>
          <p
            className="text-sm mt-1"
            style={{
              fontFamily: 'var(--font-body, Nunito, sans-serif)',
              color: 'var(--comic-text-muted, #6B7280)',
            }}
          >
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}

function AuthCallbackFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--comic-bg, #FBF1DE)' }}
    >
      <div
        className="flex flex-col items-center gap-4 text-center max-w-sm p-8 rounded-2xl"
        style={{
          background: 'var(--comic-white, #FFFFFF)',
          border: '3px solid var(--comic-outline, #1A1A2E)',
          boxShadow: '6px 6px 0 var(--comic-outline, #1A1A2E)',
        }}
      >
        <Loader2
          className="w-10 h-10 animate-spin"
          style={{ color: 'var(--comic-mint, #3DDCA1)' }}
        />
        <p
          className="text-xl"
          style={{
            fontFamily: 'var(--font-display, Fredoka, sans-serif)',
            fontWeight: 600,
            color: 'var(--comic-text, #1A1A2E)',
          }}
        >
          Cargando...
        </p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackContent />
    </Suspense>
  )
}
