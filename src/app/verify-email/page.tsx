import { Suspense } from 'react'
import EmailVerificationPage from '@/components/ahorrapp/EmailVerificationPage'

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--comic-bg, var(--background))' }}>
        <div
          className="text-center space-y-4 p-8 rounded-2xl"
          style={{
            background: 'var(--card)',
            border: '3px solid var(--border)',
            boxShadow: '6px 6px 0 var(--border)',
          }}
        >
          <div
            className="w-10 h-10 border-4 rounded-full animate-spin mx-auto"
            style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
          />
          <p style={{ fontFamily: 'var(--font-display)', color: 'var(--muted-foreground)' }}>Cargando...</p>
        </div>
      </div>
    }>
      <EmailVerificationPage />
    </Suspense>
  )
}

