'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type Module } from '@/lib/store'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Menu, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import SupabaseSetupScreen from '@/components/ahorrapp/SupabaseSetupScreen'
import AuthScreen from '@/components/ahorrapp/AuthScreen'
import AppSidebar from '@/components/ahorrapp/AppSidebar'
import Dashboard from '@/components/ahorrapp/Dashboard'
import IncomeModule from '@/components/ahorrapp/IncomeModule'
import ExpenseModule from '@/components/ahorrapp/ExpenseModule'
import SavingsModule from '@/components/ahorrapp/SavingsModule'
import DebtModule from '@/components/ahorrapp/DebtModule'
import BudgetModule from '@/components/ahorrapp/BudgetModule'
import AIAssistant from '@/components/ahorrapp/AIAssistant'
import NotificationsPanel from '@/components/ahorrapp/NotificationsPanel'
import DependentsModule from '@/components/ahorrapp/DependentsModule'
import SettingsPanel from '@/components/ahorrapp/SettingsPanel'
import UnexpectedModule from '@/components/ahorrapp/UnexpectedModule'
import TransactionCenter from '@/components/ahorrapp/TransactionCenter'
import TipsModule from '@/components/ahorrapp/TipsModule'
import MonthlyReport from '@/components/ahorrapp/MonthlyReport'
import AchievementsModule from '@/components/ahorrapp/AchievementsModule'
import AnnualSummary from '@/components/ahorrapp/AnnualSummary'
import RecurringBills from '@/components/ahorrapp/RecurringBills'

const moduleComponents: Record<Module, React.ComponentType> = {
  dashboard: Dashboard,
  income: IncomeModule,
  expenses: ExpenseModule,
  unexpected: UnexpectedModule,
  savings: SavingsModule,
  debts: DebtModule,
  budget: BudgetModule,
  'ai-assistant': AIAssistant,
  notifications: NotificationsPanel,
  dependents: DependentsModule,
  transactions: TransactionCenter,
  tips: TipsModule,
  report: MonthlyReport,
  recurring: RecurringBills,
  achievements: AchievementsModule,
  'annual-summary': AnnualSummary,
  settings: SettingsPanel,
}

const moduleTitles: Record<Module, string> = {
  dashboard: 'Panel Principal',
  income: 'Ingresos',
  expenses: 'Gastos',
  unexpected: 'Imprevistos',
  savings: 'Ahorros',
  debts: 'Deudas',
  budget: 'Presupuesto',
  'ai-assistant': 'Asistente IA',
  notifications: 'Notificaciones',
  dependents: 'Dependientes',
  transactions: 'Centro de Transacciones',
  tips: 'Consejos Financieros',
  report: 'Reporte Mensual',
  recurring: 'Pagos Recurrentes',
  achievements: 'Logros',
  'annual-summary': 'Resumen Anual',
  settings: 'Configuración',
}

type AppPhase = 'checking-db' | 'setup-db' | 'auth' | 'app'

export default function Home() {
  const { isAuthenticated, activeModule, setUnreadCount, user, unreadCount, setSidebarOpen } = useAppStore()
  const [phase, setPhase] = useState<AppPhase>('checking-db')

  // Check database status on mount
  useEffect(() => {
    async function checkDb() {
      try {
        const res = await fetch('/api/setup-db')
        const data = await res.json()
        if (data.status === 'ready') {
          setPhase('auth')
        } else if (data.status === 'needs_seed') {
          setPhase('setup-db')
        } else {
          setPhase('setup-db')
        }
      } catch {
        // If setup-db fails, try to proceed to auth anyway
        // (in case Supabase is temporarily unreachable)
        setPhase('auth')
      }
    }
    checkDb()
  }, [])

  // Fetch notification count periodically
  useEffect(() => {
    if (!isAuthenticated) return

    const pollNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?accountId=${user?.id}`)
        if (res.ok) {
          const data = await res.json()
          const list = (data.notifications || data || []).map((n: Record<string, unknown>) => n.isRead ?? n.read ?? false)
          setUnreadCount(list.filter((read: boolean) => !read).length)
        }
      } catch { /* ok */ }
    }

    const interval = setInterval(pollNotifications, 30000)
    const timeout = setTimeout(pollNotifications, 0)

    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [isAuthenticated, setUnreadCount, user?.id])

  // Database setup phase
  if (phase === 'checking-db') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Conectando con Supabase...</p>
        </div>
      </div>
    )
  }

  if (phase === 'setup-db') {
    return <SupabaseSetupScreen onReady={() => setPhase('auth')} />
  }

  if (!isAuthenticated) {
    return <AuthScreen />
  }

  const ActiveModuleComponent = moduleComponents[activeModule]
  const moduleTitle = moduleTitles[activeModule]

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
              <h1 className="text-lg font-bold text-foreground">{moduleTitle}</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 relative"
              onClick={() => useAppStore.getState().setActiveModule('notifications')}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center text-[9px] px-1"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
              <span className="sr-only">Notificaciones</span>
            </Button>
          </div>
        </header>

        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pl-4 lg:pl-8 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ActiveModuleComponent />
            </motion.div>
          </AnimatePresence>
        </div>
        <footer className="border-t border-border/50 py-4 px-4 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
            <span>© 2025 AhorrApp</span>
            <span className="flex items-center gap-1">Hecho con <Heart className="w-3 h-3 text-rose-400 fill-rose-400" /> para finanzas inteligentes</span>
          </div>
        </footer>
      </main>
    </div>
  )
}