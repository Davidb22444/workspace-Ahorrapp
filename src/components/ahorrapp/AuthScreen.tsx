'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, Lock, Mail, User, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

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
        // If demo login fails (API not ready), still login with demo data
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-auth p-4 relative overflow-hidden animate-fade-in">
      {/* Floating animated gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-[420px] h-[420px] rounded-full bg-emerald-400/20 blur-[100px] animate-[blobMove1_20s_ease-in-out_infinite]" />
        <div className="absolute -bottom-24 -right-16 w-[360px] h-[360px] rounded-full bg-teal-400/20 blur-[100px] animate-[blobMove2_18s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-cyan-400/15 blur-[100px] animate-[blobMove3_22s_ease-in-out_infinite]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xl mb-4 animate-pulse-emerald">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">AhorrApp</h1>
          <p className="text-white/70 mt-1">Tu compañero financiero inteligente</p>
        </motion.div>

        {/* Form Card with glassmorphism */}
        <div className="rounded-2xl p-8 bg-white/70 dark:bg-[#1a2332]/70 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl shadow-black/10 dark:shadow-black/30">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-xl font-semibold text-foreground mb-6">
                {isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta'}
              </h2>

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
              className="w-full h-11 border-0 bg-white dark:bg-[#1a2332] hover:bg-white/90 dark:hover:bg-[#1a2332]/90 text-primary rounded-[6px]"
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
      </motion.div>
    </div>
  )
}