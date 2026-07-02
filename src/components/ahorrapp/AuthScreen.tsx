'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  Lock,
  Mail,
  User,
  ArrowRight,
  Loader2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useAppStore } from '@/lib/store'
import supabase from '@/lib/supabase'
import { toast } from 'sonner'

const features = [
  {
    label: 'Control total de tus finanzas',
    emoji: '📊',
  },
  {
    label: 'Metas de ahorro inteligentes',
    emoji: '🎯',
  },
  {
    label: 'Asistente financiero con IA',
    emoji: '🤖',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
} as const

export default function AuthScreen() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [pendingVerification, setPendingVerification] = useState(() => {
    if (typeof window === 'undefined') return false
    return Boolean(window.sessionStorage.getItem('auth.pendingVerificationEmail'))
  })
  const [registeredEmail, setRegisteredEmail] = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.sessionStorage.getItem('auth.pendingVerificationEmail') || ''
  })
  const [otpValue, setOtpValue] = useState('')
  const [verifyingCode, setVerifyingCode] = useState(false)
  const login = useAppStore((s) => s.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Por favor completa todos los campos')
      return
    }
    if (!isLogin && !name) {
      toast.error('Por favor ingresa tu nombre')
      return
    }
    if (!isLogin && password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (!isLogin && password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (!isLogin && !/[A-Z]/.test(password)) {
      toast.error('La contraseña debe contener al menos una letra mayúscula')
      return
    }
    if (!isLogin && !/[a-z]/.test(password)) {
      toast.error('La contraseña debe contener al menos una letra minúscula')
      return
    }
    if (!isLogin && !/[0-9]/.test(password)) {
      toast.error('La contraseña debe contener al menos un número')
      return
    }
    if (!isLogin && !/[^A-Za-z0-9]/.test(password)) {
      toast.error('La contraseña debe contener al menos un carácter especial')
      return
    }

    setLoading(true)
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const body = isLogin
        ? { email, password }
        : { email, password, name }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        const detailMsg = data.details
          ? data.details.map((d: { message: string }) => d.message).join(', ')
          : ''
        throw new Error(data.error + (detailMsg ? ': ' + detailMsg : '') || 'Autenticación fallida')
      }

      if (!isLogin) {
        setRegisteredEmail(email)
        setPendingVerification(true)
        window.sessionStorage.setItem('auth.pendingVerificationEmail', email)
        toast.success('¡Cuenta creada! Revisa tu correo para obtener el código de verificación.')
      } else {
        login({
          id: data.user?.id || data.id || '1',
          email: data.user?.email || data.email || email,
          name: data.user?.name || data.name || name || email.split('@')[0],
          role: data.user?.role || data.role || 'user',
        })
        router.replace('/')
        toast.success('¡Bienvenido de nuevo!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Algo salió mal')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (otpValue.length !== 6) {
      toast.error('Ingresa el código completo de 6 dígitos')
      return
    }

    setVerifyingCode(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpValue, email: registeredEmail }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Código inválido')
      }

      login({
        id: data.user?.id || data.id || '1',
        email: data.user?.email || registeredEmail,
        name: data.user?.name || name || registeredEmail.split('@')[0],
        role: data.user?.role || 'user',
      })
      window.sessionStorage.removeItem('auth.pendingVerificationEmail')
      router.replace('/')
      toast.success('¡Cuenta verificada exitosamente!')
    } catch (err: any) {
      toast.error(err.message || 'Error al verificar el código')
      setOtpValue('')
    } finally {
      setVerifyingCode(false)
    }
  }

  const handleDemoLogin = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@ahorrapp.com', password: 'demo123' }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar demo')
      }
      login({
        id: data.user?.id || 'demo-1',
        email: data.user?.email || 'demo@ahorrapp.com',
        name: data.user?.name || 'Demo User',
        role: data.user?.role || 'user',
      })
      router.replace('/')
      toast.success('¡Bienvenido al demo!')
    } catch (err: any) {
      toast.error(err.message || 'No se pudo cargar la cuenta demo. Verifica que la base de datos esté inicializada.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/`
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
        skipBrowserRedirect: true,
      })

      if (error) {
        throw error
      }

      if (!data?.url) {
        throw new Error('No se pudo generar la URL de autenticación')
      }

      const popup = window.open(
        data.url,
        'ahorrapp-google-auth',
        'width=520,height=700,left=120,top=120'
      )

      if (!popup) {
        window.location.replace(data.url)
      }
    } catch (err: any) {
      toast.error(err.message || 'No se pudo iniciar sesión con Google')
      setLoading(false)
    }
  }

  const resetToRegister = () => {
    setPendingVerification(false)
    setOtpValue('')
    setRegisteredEmail('')
    window.sessionStorage.removeItem('auth.pendingVerificationEmail')
  }

  return (
    <div className="relative min-h-screen flex flex-col lg:flex-row animate-fade-in overflow-hidden">
      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row w-full">
      {/* ───────────────────────────── LEFT: Hero Panel ───────────────────────────── */}
      <div className="relative w-full lg:w-[52%] xl:w-[55%] min-h-[220px] lg:min-h-0 overflow-hidden bg-gradient-auth">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-[420px] h-[420px] rounded-full bg-emerald-400/20 blur-[100px] animate-[blobMove1_20s_ease-in-out_infinite]" />
          <div className="absolute -bottom-24 -right-16 w-[360px] h-[360px] rounded-full bg-teal-400/20 blur-[100px] animate-[blobMove2_18s_ease-in-out_infinite]" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-cyan-400/15 blur-[100px] animate-[blobMove3_22s_ease-in-out_infinite]" />
        </div>

        <Image
          src="/images/auth-hero.png"
          alt="AhorrApp – Tu compañero financiero inteligente"
          fill
          sizes="(max-width: 1024px) 100vw, 55vw"
          className="object-cover object-center opacity-30 mix-blend-luminosity select-none"
          priority
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-transparent" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col justify-end lg:justify-center h-full min-h-[220px] lg:min-h-0 px-6 sm:px-10 lg:px-12 xl:px-16 py-8 lg:py-12"
        >
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-3 mb-6 lg:mb-8"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-white/15 backdrop-blur-xl animate-pulse-emerald">
              <Wallet className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <span className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              AhorrApp
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-[2.75rem] xl:text-5xl font-extrabold text-white leading-tight max-w-lg"
          >
            Tu futuro financiero{' '}
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
              comienza aquí
            </span>
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="mt-3 text-base lg:text-lg text-white/75 max-w-md leading-relaxed"
          >
            Organiza tus ingresos, controla tus gastos y alcanza tus metas de ahorro
            con inteligencia artificial.
          </motion.p>

          <motion.ul
            variants={containerVariants}
            className="mt-8 space-y-3"
          >
            {features.map((f) => (
              <motion.li
                key={f.label}
                variants={itemVariants}
                className="flex items-center gap-3"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm text-base select-none">
                  {f.emoji}
                </span>
                <span className="text-sm lg:text-[0.95rem] text-white/90 font-medium">
                  {f.label}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </div>

      {/* ───────────────────────────── RIGHT: Form Panel ───────────────────────────── */}
      <div className="relative w-full lg:w-[48%] xl:w-[45%] flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-background">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-emerald-400/8 blur-[120px]" />
          <div className="absolute -top-24 -right-24 w-[320px] h-[320px] rounded-full bg-teal-400/6 blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
          className="w-full max-w-[420px] relative z-10"
        >
          <div className="animate-card-float rounded-2xl p-6 sm:p-8 bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-border/50 shadow-xl">
            <div className="lg:hidden text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                {pendingVerification ? 'Verifica tu cuenta' : 'Inicia sesión'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {pendingVerification ? 'Ingresa el código que recibiste' : 'Accede a tu cuenta de AhorrApp'}
              </p>
            </div>

            <div className="hidden lg:block mb-6">
              <h1 className="text-xl font-semibold text-foreground">
                {pendingVerification ? 'Verifica tu cuenta' : isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {pendingVerification
                  ? 'Ingresa el código de 6 dígitos que enviamos a tu correo'
                  : isLogin
                    ? 'Ingresa tus credenciales para continuar'
                    : 'Completa el formulario para registrarte'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {pendingVerification ? (
                <motion.div
                  key="verify-code"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6 text-center"
                >
                  <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Enviamos un código a <strong>{registeredEmail}</strong>
                  </div>

                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otpValue}
                      onChange={setOtpValue}
                      disabled={verifyingCode}
                    >
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
                    className="w-full h-11"
                    onClick={handleVerifyCode}
                    disabled={otpValue.length !== 6 || verifyingCode}
                  >
                    {verifyingCode ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 mr-2" />
                    )}
                    Verificar Código
                  </Button>

                  <div className="space-y-2">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => {
                        toast.success('Si el correo no llega, revisa la carpeta de spam.')
                      }}
                      disabled={verifyingCode}
                      className="text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      ¿No recibiste el código?
                    </Button>
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetToRegister}
                        disabled={verifyingCode}
                        className="text-xs text-muted-foreground"
                      >
                        Volver al registro
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={isLogin ? 'login' : 'register'}
                  initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="lg:hidden mb-5">
                    <h2 className="text-lg font-semibold text-foreground">
                      {isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta'}
                    </h2>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        <Label htmlFor="name">Nombre Completo</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="name"
                            placeholder="Juan Pérez"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </motion.div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="tu@ejemplo.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="********"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {!isLogin && (
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Repetir contraseña</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="********"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="w-4 h-4 mr-2" />
                      )}
                      {isLogin ? 'Iniciar Sesión' : 'Crear cuenta'}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 bg-white text-black dark:bg-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all ease-in duration-200"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                    >
                      <svg
                        viewBox="0 0 48 48"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 mr-2 shrink-0"
                        aria-hidden="true"
                      >
                        <path
                          d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                          fill="#FFC107"
                        />
                        <path
                          d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                          fill="#FF3D00"
                        />
                        <path
                          d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                          fill="#4CAF50"
                        />
                        <path
                          d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                          fill="#1976D2"
                        />
                      </svg>
                      {loading ? 'Redirigiendo a Google...' : 'Continuar con Google'}
                    </Button>
                  </form>

                  <div className="mt-4 text-center">
                    <button
                      onClick={() => {
                        setIsLogin(!isLogin)
                        setName('')
                        setPassword('')
                        setConfirmPassword('')
                      }}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {isLogin
                        ? "¿No tienes cuenta? Regístrate"
                        : '¿Ya tienes cuenta? Inicia sesión'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!pendingVerification && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">o</span>
                  </div>
                </div>

                <div className="relative rounded-lg p-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 animate-[rotateGradient_3s_linear_infinite] bg-[length:200%_200%]">
                  <Button
                    variant="outline"
                    className="w-full h-11 border-0 bg-background dark:bg-card hover:bg-background/90 dark:hover:bg-card/90 text-primary rounded-[6px]"
                    onClick={handleDemoLogin}
                    disabled={loading}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Probar Cuenta Demo
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Sin registro. Explora con datos de ejemplo.
                </p>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground/60 text-center mt-6">
            © {new Date().getFullYear()} AhorrApp · Todos los derechos reservados
          </p>
        </motion.div>
      </div>
      </div>
    </div>
  )
}
