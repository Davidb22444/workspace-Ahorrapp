'use client'

import { useState, useEffect, useRef } from 'react'
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

// SVG definitions for falling icons (neobrutalist style)
const ICONS_SVG = [
  // 1. Coin (Moneda)
  `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <circle cx="50" cy="50" r="40" fill="#F5C518" stroke="#1A1A1A" stroke-width="5" />
    <circle cx="50" cy="50" r="28" fill="none" stroke="#1A1A1A" stroke-width="3" stroke-dasharray="6 4" />
    <text x="50" y="63" font-family="sans-serif" font-weight="900" font-size="38" fill="#1A1A1A" text-anchor="middle">$</text>
  </svg>`,
  // 2. Bar Chart (Gráfica de barras)
  `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect x="15" y="55" width="18" height="30" fill="#3DDC97" stroke="#1A1A1A" stroke-width="5" rx="2" />
    <rect x="41" y="30" width="18" height="55" fill="#F5C518" stroke="#1A1A1A" stroke-width="5" rx="2" />
    <rect x="67" y="15" width="18" height="70" fill="#3DDC97" stroke="#1A1A1A" stroke-width="5" rx="2" />
    <line x1="5" y1="85" x2="95" y2="85" stroke="#1A1A1A" stroke-width="5" stroke-linecap="round" />
  </svg>`,
  // 3. Piggy Bank (Alcancía)
  `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <ellipse cx="50" cy="55" rx="35" ry="25" fill="#3DDC97" stroke="#1A1A1A" stroke-width="5" />
    <polygon points="35,35 45,20 55,32" fill="#F5C518" stroke="#1A1A1A" stroke-width="5" stroke-linejoin="round" />
    <rect x="80" y="47" width="10" height="16" rx="3" fill="#F5C518" stroke="#1A1A1A" stroke-width="5" />
    <circle cx="68" cy="48" r="4" fill="#1A1A1A" />
    <rect x="32" y="78" width="10" height="12" fill="#1A1A1A" rx="2" />
    <rect x="58" y="78" width="10" height="12" fill="#1A1A1A" rx="2" />
    <line x1="45" y1="30" x2="55" y2="30" stroke="#1A1A1A" stroke-width="5" stroke-linecap="round" />
    <path d="M 15,55 Q 8,50 12,42" fill="none" stroke="#1A1A1A" stroke-width="5" stroke-linecap="round" />
  </svg>`,
  // 4. Wallet (Billetera)
  `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect x="15" y="28" width="70" height="50" rx="6" fill="#F5C518" stroke="#1A1A1A" stroke-width="5" />
    <path d="M 50,38 L 85,38 L 85,68 L 50,68 Z" fill="#3DDC97" stroke="#1A1A1A" stroke-width="5" stroke-linejoin="round" />
    <circle cx="68" cy="53" r="6" fill="#1A1A1A" />
    <rect x="25" y="15" width="40" height="15" rx="2" fill="#3DDC97" stroke="#1A1A1A" stroke-width="5" />
    <line x1="35" y1="23" x2="55" y2="23" stroke="#1A1A1A" stroke-width="3" />
  </svg>`,
  // 5. Percentage (Porcentaje)
  `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <circle cx="30" cy="30" r="14" fill="#3DDC97" stroke="#1A1A1A" stroke-width="5" />
    <circle cx="70" cy="70" r="14" fill="#F5C518" stroke="#1A1A1A" stroke-width="5" />
    <line x1="80" y1="20" x2="20" y2="80" stroke="#1A1A1A" stroke-width="7" stroke-linecap="round" />
  </svg>`,
  // 6. Trend Arrow (Flecha de tendencia)
  `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <path d="M 15,80 L 45,50 L 60,62 L 85,25" fill="none" stroke="#1A1A1A" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 15,80 L 45,50 L 60,62 L 85,25" fill="none" stroke="#3DDC97" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    <polygon points="85,15 88,38 65,30" fill="#1A1A1A" stroke="#1A1A1A" stroke-width="2" stroke-linejoin="round" />
  </svg>`,
  // 7. Money Bag (Saco de dinero)
  `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <path d="M 35,28 C 25,45 20,75 35,85 C 50,90 65,85 70,75 C 75,65 65,45 55,28" fill="#F5C518" stroke="#1A1A1A" stroke-width="5" stroke-linejoin="round" />
    <ellipse cx="45" cy="32" rx="12" ry="6" fill="#3DDC97" stroke="#1A1A1A" stroke-width="5" />
    <path d="M 35,28 C 30,18 40,13 45,23 C 50,13 60,18 55,28" fill="#F5C518" stroke="#1A1A1A" stroke-width="5" />
    <text x="46" y="65" font-family="sans-serif" font-weight="900" font-size="28" fill="#1A1A1A" text-anchor="middle">$</text>
  </svg>`,
  // 8. Bank Card (Tarjeta bancaria)
  `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect x="12" y="25" width="76" height="50" rx="6" fill="#3DDC97" stroke="#1A1A1A" stroke-width="5" />
    <rect x="12" y="35" width="76" height="12" fill="#1A1A1A" />
    <rect x="22" y="55" width="16" height="12" rx="2" fill="#F5C518" stroke="#1A1A1A" stroke-width="3" />
  </svg>`
]

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
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const numIcons = 8
    const iconsArray: any[] = []
    let activeDragIcon: any = null
    let dragStartX = 0
    let dragStartY = 0
    let iconStartX = 0
    let iconStartY = 0

    class FallingIconInstance {
      element: HTMLDivElement
      size: number
      speed: number
      rotationSpeed: number
      x!: number
      y!: number
      rotation!: number
      isDragging: boolean

      constructor(svgMarkup: string) {
        this.element = document.createElement('div')
        this.element.style.position = 'absolute'
        this.element.style.pointerEvents = 'auto'
        this.element.style.cursor = 'grab'
        this.element.style.touchAction = 'none'
        this.element.style.filter = 'drop-shadow(5px 5px 0px #1A1A1A)'
        this.element.style.willChange = 'transform'
        
        this.element.addEventListener('mousedown', () => {
          this.element.style.cursor = 'grabbing'
          this.element.style.filter = 'drop-shadow(8px 8px 0px #1A1A1A)'
        })
        this.element.addEventListener('mouseup', () => {
          this.element.style.cursor = 'grab'
          this.element.style.filter = 'drop-shadow(5px 5px 0px #1A1A1A)'
        })

        this.element.innerHTML = svgMarkup
        container!.appendChild(this.element)

        this.isDragging = false
        this.size = Math.random() * (90 - 55) + 55
        this.speed = Math.random() * (0.45 - 0.15) + 0.15
        this.rotationSpeed = (Math.random() * 2 - 1) * 0.2

        this.element.style.width = `${this.size}px`
        this.element.style.height = `${this.size}px`

        this.resetPosition(true)
        this.setupEvents()
      }

      resetPosition(initial = false) {
        this.x = Math.random() * (window.innerWidth - this.size)
        if (initial) {
          this.y = Math.random() * (window.innerHeight + this.size) - this.size
        } else {
          this.y = -this.size - 20
        }
        this.rotation = Math.random() * 360
        this.updateTransform()
      }

      updateTransform() {
        this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) rotate(${this.rotation}deg)`
      }

      update() {
        if (this.isDragging) return

        this.y += this.speed
        this.rotation += this.rotationSpeed

        if (this.y > window.innerHeight) {
          this.resetPosition(false)
        } else {
          this.updateTransform()
        }
      }

      setupEvents() {
        const startDrag = (clientX: number, clientY: number) => {
          this.isDragging = true
          activeDragIcon = this
          dragStartX = clientX
          dragStartY = clientY
          iconStartX = this.x
          iconStartY = this.y
        }

        this.element.addEventListener('mousedown', (e) => {
          e.preventDefault()
          startDrag(e.clientX, e.clientY)
        })

        this.element.addEventListener('touchstart', (e) => {
          if (e.touches.length === 1) {
            startDrag(e.touches[0].clientX, e.touches[0].clientY)
          }
        }, { passive: true })
      }
    }

    for (let i = 0; i < numIcons; i++) {
      const svgMarkup = ICONS_SVG[i % ICONS_SVG.length]
      iconsArray.push(new FallingIconInstance(svgMarkup))
    }

    const handleMove = (clientX: number, clientY: number) => {
      if (!activeDragIcon) return
      const dx = clientX - dragStartX
      const dy = clientY - dragStartY
      activeDragIcon.x = iconStartX + dx
      activeDragIcon.y = iconStartY + dy
      activeDragIcon.updateTransform()
    }

    const stopDrag = () => {
      if (activeDragIcon) {
        activeDragIcon.element.style.cursor = 'grab'
        activeDragIcon.element.style.filter = 'drop-shadow(5px 5px 0px #1A1A1A)'
        activeDragIcon.isDragging = false
        activeDragIcon = null
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY)
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('mouseup', stopDrag)
    window.addEventListener('touchend', stopDrag)

    let animationId: number
    const animate = () => {
      for (let i = 0; i < iconsArray.length; i++) {
        iconsArray[i].update()
      }
      animationId = requestAnimationFrame(animate)
    }
    animate()

    const handleResize = () => {
      iconsArray.forEach(icon => {
        if (icon.x > window.innerWidth) {
          icon.x = Math.random() * (window.innerWidth - icon.size)
        }
      })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('mouseup', stopDrag)
      window.removeEventListener('touchend', stopDrag)
      window.removeEventListener('resize', handleResize)
      iconsArray.forEach(icon => {
        if (icon.element && container.contains(icon.element)) {
          container.removeChild(icon.element)
        }
      })
    }
  }, [])

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
      } as any)

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
    <div className="relative min-h-screen flex flex-col lg:flex-row animate-fade-in overflow-hidden bg-background">
      {/* Left Panel Background Gradient & blobs (behind falling icons) */}
      <div className="absolute top-0 left-0 h-full w-full lg:w-[52%] xl:w-[55%] bg-gradient-auth z-0 hidden lg:block overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/20 via-background to-teal-950/15" />
      </div>

      {/* Background Falling Icons */}
      <div 
        ref={containerRef} 
        className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-10"
      />

      <div className="relative z-20 flex min-h-screen flex-col lg:flex-row w-full pointer-events-none">
        <div className="relative w-full lg:w-[52%] xl:w-[55%] min-h-[220px] lg:min-h-0 overflow-hidden bg-gradient-auth-responsive pointer-events-auto">

<motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col justify-center items-center h-full min-h-[220px] lg:min-h-0 px-6 sm:px-10 lg:px-12 xl:px-16 py-8 lg:py-12"
        >
          {/* Animated Piggy Bank Loader */}
          <div className="hidden lg:block piggy-wrapper scale-90 xl:scale-100 mb-6">
            <div className="piggy-wrap">
              <div className="piggy">
                <div className="nose" />
                <div className="mouth" />
                <div className="ear" />
                <div className="tail">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="eye" />
                <div className="hole" />
              </div>
            </div>
            <div className="coin-wrap">
              <div className="coin">$</div>
            </div>
            <div className="legs" />
            <div className="legs back" />
          </div>

          <motion.div
            variants={itemVariants}
            className="flex items-center gap-3"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-white/15 backdrop-blur-xl animate-pulse-emerald">
              <Wallet className="w-6 h-6 lg:w-7 lg:h-7 text-emerald-400" />
            </div>
            <span className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
              AhorrApp
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* ───────────────────────────── RIGHT: Form Panel ───────────────────────────── */}
      <div className="relative w-full lg:w-[48%] xl:w-[45%] flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-transparent pointer-events-auto">
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
