'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Wallet, TrendingUp, PiggyBank, Bot, ArrowRight, Moon, Sun, Smartphone, Monitor, Download } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: Wallet,
    title: 'Control de Gastos',
    desc: 'Registra y categoriza todos tus gastos en un solo lugar.',
    bgColor: 'bg-mint text-black',
    iconBgColor: 'bg-white',
    iconColor: 'text-black',
  },
  {
    icon: TrendingUp,
    title: 'Ingresos y Presupuesto',
    desc: 'Planifica tu presupuesto mensual y sigue tus ingresos.',
    bgColor: 'bg-yellow text-black',
    iconBgColor: 'bg-white',
    iconColor: 'text-black',
  },
  {
    icon: PiggyBank,
    title: 'Metas de Ahorro',
    desc: 'Establece metas y ahorra de forma inteligente.',
    bgColor: 'bg-purple text-black',
    iconBgColor: 'bg-white',
    iconColor: 'text-black',
  },
  {
    icon: Bot,
    title: 'Asistente IA',
    desc: 'Recibe consejos financieros personalizados con IA.',
    bgColor: 'bg-celeste text-black',
    iconBgColor: 'bg-white',
    iconColor: 'text-black',
  },
]

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

export default function LandingPage({ onLogin }: { onLogin: () => void }) {
  const { theme, setTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDownload = (platform: string) => {
    if (platform === 'android') {
      window.open('/downloads/AhorrApp.apk', '_blank')
    } else {
      window.open('/downloads/AhorrApp-Setup.exe', '_blank')
    }
  }

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
        
        // Add styling for active state dynamically
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
          // Spread icons across the visible height so they appear instantly
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

    // Initialize Icons
    for (let i = 0; i < numIcons; i++) {
      const svgMarkup = ICONS_SVG[i % ICONS_SVG.length]
      iconsArray.push(new FallingIconInstance(svgMarkup))
    }

    // Drag move and stop global events
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

    // Animation Loop
    let animationId: number
    const animate = () => {
      for (let i = 0; i < iconsArray.length; i++) {
        iconsArray[i].update()
      }
      animationId = requestAnimationFrame(animate)
    }
    animate()

    // Handle Window Resize
    const handleResize = () => {
      iconsArray.forEach(icon => {
        if (icon.x > window.innerWidth) {
          icon.x = Math.random() * (window.innerWidth - icon.size)
        }
      })
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
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

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Background Falling Icons */}
      <div 
        ref={containerRef} 
        className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0"
      />

      {/* Main Content (using pointer-events-none to let clicks pass through to icons) */}
      <div className="relative z-10 pointer-events-none">        {/* Navbar */}
        <header className="sticky top-0 z-50 bg-background/90 border-b-4 border-black backdrop-blur-md pointer-events-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 border-3 border-black bg-primary rounded-xl flex items-center justify-center shadow-[3px_3px_0px_#000000]">
                <Wallet className="w-5 h-5 text-black" />
              </div>
              <span className="font-display font-bold text-2xl tracking-wide text-black dark:text-foreground">AhorrApp</span>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-10 h-10 rounded-xl border-3 border-black bg-white dark:bg-card hover:bg-yellow transition-all flex items-center justify-center text-black dark:text-foreground shadow-[3px_3px_0px_#000000]"
                aria-label="Cambiar modo"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95, y: 1 }}
                onClick={onLogin} 
                className="btn-comic bg-coral text-black font-display font-bold text-sm px-4 py-2 rounded-xl"
              >
                Iniciar Sesión
              </motion.button>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-3 border-black bg-yellow text-black text-sm font-display font-bold mb-8 shadow-[3px_3px_0px_#000000] -rotate-2 pointer-events-auto">
                <span className="w-2.5 h-2.5 rounded-full bg-coral animate-live-dot border border-black" />
                Tu asistente financiero personal
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-black tracking-tight text-black dark:text-foreground leading-tight pointer-events-auto">
                Controla tus finanzas{' '}
                <span className="inline-block bg-mint px-4 py-1 border-4 border-black shadow-[6px_6px_0px_#000000] rotate-1 text-black">
                  de forma divertida
                </span>
              </h1>
              <p className="mt-8 text-lg font-sans font-bold text-gray-800 dark:text-gray-200 max-w-xl mx-auto leading-relaxed pointer-events-auto">
                AhorrApp te ayuda a registrar gastos, planificar presupuestos, establecer metas de ahorro y obtener
                consejos financieros con inteligencia artificial.
              </p>
              <div className="mt-10 flex items-center justify-center gap-4 pointer-events-auto">
                <motion.button
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95, y: 1 }}
                  onClick={onLogin}
                  className="btn-comic bg-primary text-black font-display font-black text-lg py-3.5 px-8 rounded-2xl flex items-center gap-2"
                >
                  Comenzar <ArrowRight className="w-5 h-5 stroke-[3px]" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95, y: 1 }}
                  onClick={onLogin}
                  className="btn-comic bg-white text-black font-display font-black text-lg py-3.5 px-8 rounded-2xl"
                >
                  Iniciar Sesión
                </motion.button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t-4 border-black py-20 pointer-events-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-14"
            >
              <h2 className="text-3xl sm:text-5xl font-display font-black text-black dark:text-foreground">
                Todo lo que necesitas en un solo lugar
              </h2>
              <p className="mt-3 font-semibold text-gray-700 dark:text-gray-300">
                Herramientas diseñadas para ayudarte a tomar el control de tu dinero.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className={cn(
                    'rounded-2xl border-[3.5px] border-black p-6 shadow-[6px_6px_0px_#000000] hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_#000000] transition-all duration-150',
                    f.bgColor,
                    i % 2 === 0 ? '-rotate-1.5' : 'rotate-1.5'
                  )}
                >
                  <div className={cn('w-12 h-12 rounded-xl border-3 border-black flex items-center justify-center mb-4 shadow-[3px_3px_0px_#000000]', f.iconBgColor)}>
                    <f.icon className={cn('w-6 h-6', f.iconColor)} />
                  </div>
                  <h3 className="font-display font-bold text-xl text-black mb-2">{f.title}</h3>
                  <p className="text-sm font-semibold opacity-90 leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Download */}
        <section className="border-t-4 border-black py-20 pointer-events-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-5xl font-display font-black text-black dark:text-foreground">Descarga la App</h2>
              <p className="mt-3 font-semibold text-gray-700 dark:text-gray-300">Disponible para Android y Windows como aplicación instalable.</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl mx-auto">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="relative rounded-3xl border-3 border-black bg-white dark:bg-card p-6 text-center shadow-[6px_6px_0px_#000000] -rotate-1 hover:rotate-0 transition-transform"
              >
                <div className="absolute -top-3 -right-3 bg-coral text-black border-3 border-black font-display font-black text-xs px-3 py-1 rounded-xl rotate-6 shadow-[3px_3px_0px_#000000]">
                  Próximamente
                </div>
                <div className="w-14 h-14 rounded-2xl bg-mint border-3 border-black flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0px_#000000]">
                  <Smartphone className="w-7 h-7 text-black" />
                </div>
                <h3 className="font-display font-bold text-xl text-black dark:text-foreground mb-1">Android</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-5">Instala AhorrApp en tu dispositivo Android como una app nativa.</p>
                <button
                  disabled
                  className="btn-comic bg-gray-200 dark:bg-neutral-800 text-neutral-500 font-display font-bold text-sm px-4 py-2 rounded-xl cursor-not-allowed opacity-75 shadow-none transform-none"
                >
                  Descargar APK
                </button>
                <p className="text-xs text-muted-foreground mt-3 font-semibold">
                  Versión para Android 8+ ~5MB
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="relative rounded-3xl border-3 border-black bg-white dark:bg-card p-6 text-center shadow-[6px_6px_0px_#000000] rotate-1 hover:rotate-0 transition-transform"
              >
                <div className="absolute -top-3 -right-3 bg-coral text-black border-3 border-black font-display font-black text-xs px-3 py-1 rounded-xl rotate-6 shadow-[3px_3px_0px_#000000]">
                  Próximamente
                </div>
                <div className="w-14 h-14 rounded-2xl bg-celeste border-3 border-black flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0px_#000000]">
                  <Monitor className="w-7 h-7 text-black" />
                </div>
                <h3 className="font-display font-bold text-xl text-black dark:text-foreground mb-1">Windows</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-5">Instala AhorrApp en tu PC como una aplicación de escritorio.</p>
                <button
                  disabled
                  className="btn-comic bg-gray-200 dark:bg-neutral-800 text-neutral-500 font-display font-bold text-sm px-4 py-2 rounded-xl cursor-not-allowed opacity-75 shadow-none transform-none"
                >
                  Descargar .exe
                </button>
                <p className="text-xs text-muted-foreground mt-3 font-semibold">
                  Versión para Windows 10+ ~80MB
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t-4 border-black py-20 pointer-events-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="rounded-3xl bg-yellow border-4 border-black p-10 sm:p-14 shadow-[8px_8px_0px_#000000] rotate-1"
            >
              <h2 className="text-3xl sm:text-5xl font-display font-black text-black mb-3">
                ¿Listo para empezar?
              </h2>
              <p className="text-black font-semibold max-w-md mx-auto mb-7 text-base">
                Regístrate gratis y comienza a tomar el control de tus finanzas personales.
              </p>
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95, y: 1 }}
                onClick={onLogin}
                className="btn-comic bg-coral text-black font-display font-black text-lg py-3.5 px-8 rounded-2xl inline-flex items-center gap-2"
              >
                Crear Cuenta Gratis <ArrowRight className="w-5 h-5 stroke-[3px]" />
              </motion.button>
            </motion.div>
          </div>
        </section>
        {/* Footer */}
        <footer className="border-t-4 border-black bg-white dark:bg-card py-6 pointer-events-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between text-sm font-bold text-black dark:text-foreground">
            <span>© 2025 AhorrApp</span>
            <span className="flex items-center gap-1 font-display">Hecho para finanzas inteligentes 💰</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

