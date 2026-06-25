'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  Lock,
  Mail,
  User,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/lib/store'
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
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
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
        throw new Error(data.error || 'Autenticación fallida')
      }

      login({
        id: data.user?.id || data.id || '1',
        email: data.user?.email || data.email || email,
        name: data.user?.name || data.name || name || email.split('@')[0],
        role: data.user?.role || data.role || 'user',
      })

      toast.success(isLogin ? '¡Bienvenido de nuevo!' : '¡Cuenta creada exitosamente!')
    } catch (err: any) {
      toast.error(err.message || 'Algo salió mal')
    } finally {
      setLoading(false)
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
        login({
          id: 'demo-1',
          email: 'demo@ahorrapp.com',
          name: 'Demo User',
          role: 'user',
        })
        toast.success('¡Bienvenido al demo!')
        return
      }
      login({
        id: data.user?.id || 'demo-1',
        email: data.user?.email || 'demo@ahorrapp.com',
        name: data.user?.name || 'Demo User',
        role: data.user?.role || 'user',
      })
      toast.success('¡Bienvenido al demo!')
    } catch {
      login({
        id: 'demo-1',
        email: 'demo@ahorrapp.com',
        name: 'Demo User',
        role: 'user',
      })
      toast.success('¡Bienvenido al demo!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row animate-fade-in">
      {/* ───────────────────────────── LEFT: Hero Panel ───────────────────────────── */}
      <div className="relative w-full lg:w-[52%] xl:w-[55%] min-h-[220px] lg:min-h-0 overflow-hidden bg-gradient-auth">
        {/* Subtle dot / particle pattern overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Animated gradient blobs (kept from original for depth) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-[420px] h-[420px] rounded-full bg-emerald-400/20 blur-[100px] animate-[blobMove1_20s_ease-in-out_infinite]" />
          <div className="absolute -bottom-24 -right-16 w-[360px] h-[360px] rounded-full bg-teal-400/20 blur-[100px] animate-[blobMove2_18s_ease-in-out_infinite]" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-cyan-400/15 blur-[100px] animate-[blobMove3_22s_ease-in-out_infinite]" />
        </div>

        {/* Hero image — fills the panel */}
        <Image
          src="/images/auth-hero.png"
          alt="AhorrApp – Tu compañero financiero inteligente"
          fill
          className="object-cover object-center opacity-30 mix-blend-luminosity select-none"
          priority
        />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-transparent" />

        {/* ── Content overlay (hidden on very small screens, visible sm+) ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col justify-end lg:justify-center h-full min-h-[220px] lg:min-h-0 px-6 sm:px-10 lg:px-12 xl:px-16 py-8 lg:py-12"
        >
          {/* Logo (mobile only — on desktop it's part of the left panel) */}
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

          {/* Tagline */}
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

          {/* Feature highlights */}
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
        {/* Subtle background blobs on the form side */}
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
          {/* Form card — with floating shadow animation */}
          <div className="animate-card-float rounded-2xl p-6 sm:p-8 bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-border/50 shadow-xl">
            {/* Mobile-only logo row (already shown on left panel in desktop) */}
            <div className="lg:hidden text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                Inicia sesión
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Accede a tu cuenta de AhorrApp
              </p>
            </div>

            {/* Desktop heading */}
            <div className="hidden lg:block mb-6">
              <h1 className="text-xl font-semibold text-foreground">
                {isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isLogin
                  ? 'Ingresa tus credenciales para continuar'
                  : 'Completa el formulario para registrarte'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login' : 'register'}
                initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                transition={{ duration: 0.25 }}
              >
                {/* Mobile: dynamic heading inside the card */}
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
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

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
                    {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                  </Button>
                </form>

                <div className="mt-4 text-center">
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {isLogin
                      ? "¿No tienes cuenta? Regístrate"
                      : '¿Ya tienes cuenta? Inicia sesión'}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">o</span>
              </div>
            </div>

            {/* Demo Button with rotating gradient border */}
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
          </div>

          {/* Footer text */}
          <p className="text-xs text-muted-foreground/60 text-center mt-6">
            © {new Date().getFullYear()} AhorrApp · Todos los derechos reservados
          </p>
        </motion.div>
      </div>
    </div>
  )
}