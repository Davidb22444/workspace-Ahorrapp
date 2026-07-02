'use client'

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
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: TrendingUp,
    title: 'Ingresos y Presupuesto',
    desc: 'Planifica tu presupuesto mensual y sigue tus ingresos.',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    icon: PiggyBank,
    title: 'Metas de Ahorro',
    desc: 'Establece metas y ahorra de forma inteligente.',
    color: 'from-violet-500 to-violet-600',
    bgColor: 'bg-violet-50 dark:bg-violet-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    icon: Bot,
    title: 'Asistente IA',
    desc: 'Recibe consejos financieros personalizados con IA.',
    color: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
]

export default function LandingPage({ onLogin }: { onLogin: () => void }) {
  const { theme, setTheme } = useTheme()

  const handleDownload = (platform: string) => {
    if (platform === 'android') {
      window.open('/downloads/AhorrApp.apk', '_blank')
    } else {
      window.open('/downloads/AhorrApp-Setup.exe', '_blank')
    }
  }

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      <div className="relative z-10">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gradient">AhorrApp</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 rounded-lg border border-border bg-card hover:bg-accent transition-colors flex items-center justify-center text-muted-foreground"
              aria-label="Cambiar modo"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Button onClick={onLogin} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Tu asistente financiero personal
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
              Controla tus finanzas{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
                de forma inteligente
              </span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              AhorrApp te ayuda a registrar gastos, planificar presupuestos, establecer metas de ahorro y obtener
              consejos financieros con inteligencia artificial.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                onClick={onLogin}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 text-base"
              >
                Comenzar <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button
                onClick={onLogin}
                variant="outline"
                size="lg"
                className="h-11 px-6 text-base"
              >
                Iniciar Sesión
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Todo lo que necesitas en un solo lugar
            </h2>
            <p className="mt-3 text-muted-foreground">
              Herramientas diseñadas para ayudarte a tomar el control de tu dinero.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={cn(
                  'rounded-xl border border-border bg-card p-6 hover:shadow-md transition-shadow',
                )}
              >
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-4', f.bgColor)}>
                  <f.icon className={cn('w-5 h-5', f.iconColor)} />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Download */}
      <section className="border-t border-border/50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Descarga la App</h2>
            <p className="mt-3 text-muted-foreground">Disponible para Android y Windows como aplicación instalable.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="rounded-xl border border-border bg-card p-6 text-center hover:shadow-md transition-shadow"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Android</h3>
              <p className="text-sm text-muted-foreground mb-5">Instala AhorrApp en tu dispositivo Android como una app nativa.</p>
              <Button
                onClick={() => handleDownload('android')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                size="sm"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Descargar APK
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Versión para Android 8+ ~5MB
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="rounded-xl border border-border bg-card p-6 text-center hover:shadow-md transition-shadow"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Monitor className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Windows</h3>
              <p className="text-sm text-muted-foreground mb-5">Instala AhorrApp en tu PC como una aplicación de escritorio.</p>
              <Button
                onClick={() => handleDownload('windows')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                size="sm"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Descargar .exe
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Versión para Windows 10+ ~80MB
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-10 sm:p-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              ¿Listo para empezar?
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-7">
              Registrate gratis y comienza a tomar el control de tus finanzas personales.
            </p>
            <Button
              onClick={onLogin}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-7 text-base"
            >
              Crear Cuenta Gratis <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© 2025 AhorrApp</span>
          <span className="flex items-center gap-1">Hecho para finanzas inteligentes</span>
        </div>
      </footer>
      </div>
    </div>
  )
}
