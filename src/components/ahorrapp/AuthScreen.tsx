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
      toast.error('Please fill in all fields')
      return
    }
    if (!isLogin && !name) {
      toast.error('Please enter your name')
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
        throw new Error(data.error || 'Authentication failed')
      }

      login({
        id: data.user?.id || data.id || '1',
        email: data.user?.email || data.email || email,
        name: data.user?.name || data.name || name || email.split('@')[0],
        role: data.user?.role || data.role || 'user',
      })

      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
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
        toast.success('Welcome to the demo!')
        return
      }
      login({
        id: data.user?.id || 'demo-1',
        email: data.user?.email || 'demo@ahorrapp.com',
        name: data.user?.name || 'Demo User',
        role: data.user?.role || 'user',
      })
      toast.success('Welcome to the demo!')
    } catch {
      login({
        id: 'demo-1',
        email: 'demo@ahorrapp.com',
        name: 'Demo User',
        role: 'user',
      })
      toast.success('Welcome to the demo!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-auth p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/10 blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-white/5 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-cyan-400/10 blur-3xl animate-float" style={{ animationDelay: '0.8s' }} />
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
          <p className="text-white/70 mt-1">Your smart finance companion</p>
        </motion.div>

        {/* Form Card */}
        <div className="glass-card rounded-2xl p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-xl font-semibold text-foreground mb-6">
                {isLogin ? 'Welcome back' : 'Create account'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
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
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {isLogin
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
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
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Demo Button */}
          <Button
            variant="outline"
            className="w-full h-11 border-primary/30 hover:bg-primary/10 hover:border-primary/50 text-primary"
            onClick={handleDemoLogin}
            disabled={loading}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Try Demo Account
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            No sign-up required. Explore with sample data.
          </p>
        </div>
      </motion.div>
    </div>
  )
}