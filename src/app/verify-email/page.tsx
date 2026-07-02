import { Suspense } from 'react'
import EmailVerificationPage from '@/components/ahorrapp/EmailVerificationPage'

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    }>
      <EmailVerificationPage />
    </Suspense>
  )
}
