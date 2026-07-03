'use client'

import { Suspense, useEffect, useState, useRef, Component, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppStore, type Module } from '@/lib/store'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Menu, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LOGOUT_HISTORY_GUARD_KEY } from '@/lib/auth-history'
import AuthScreen from '@/components/ahorrapp/AuthScreen'
import LandingPage from '@/components/ahorrapp/LandingPage'
import { Loading } from '@/components/ui/loading'
import AppSidebar from '@/components/ahorrapp/AppSidebar'
import Dashboard from '@/components/ahorrapp/Dashboard'

const IncomeModule = dynamic(() => import('@/components/ahorrapp/IncomeModule'), { loading: () => <Loading /> })
const ExpenseModule = dynamic(() => import('@/components/ahorrapp/ExpenseModule'), { loading: () => <Loading /> })
const SavingsModule = dynamic(() => import('@/components/ahorrapp/SavingsModule'), { loading: () => <Loading /> })
const DebtModule = dynamic(() => import('@/components/ahorrapp/DebtModule'), { loading: () => <Loading /> })
const BudgetModule = dynamic(() => import('@/components/ahorrapp/BudgetModule'), { loading: () => <Loading /> })
const AIAssistant = dynamic(() => import('@/components/ahorrapp/AIAssistant'), { loading: () => <Loading /> })
const NotificationsPanel = dynamic(() => import('@/components/ahorrapp/NotificationsPanel'), { loading: () => <Loading /> })
const DependentsModule = dynamic(() => import('@/components/ahorrapp/DependentsModule'), { loading: () => <Loading /> })
const SettingsPanel = dynamic(() => import('@/components/ahorrapp/SettingsPanel'), { loading: () => <Loading /> })
const UnexpectedModule = dynamic(() => import('@/components/ahorrapp/UnexpectedModule'), { loading: () => <Loading /> })
const TransactionCenter = dynamic(() => import('@/components/ahorrapp/TransactionCenter'), { loading: () => <Loading /> })
const TipsModule = dynamic(() => import('@/components/ahorrapp/TipsModule'), { loading: () => <Loading /> })
const MonthlyReport = dynamic(() => import('@/components/ahorrapp/MonthlyReport'), { loading: () => <Loading /> })
const AchievementsModule = dynamic(() => import('@/components/ahorrapp/AchievementsModule'), { loading: () => <Loading /> })
const AnnualSummary = dynamic(() => import('@/components/ahorrapp/AnnualSummary'), { loading: () => <Loading /> })
const RecurringBills = dynamic(() => import('@/components/ahorrapp/RecurringBills'), { loading: () => <Loading /> })
const AdminPanel = dynamic(() => import('@/components/ahorrapp/AdminPanel'), { loading: () => <Loading /> })

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground gap-2">
          <p className="text-sm">Algo salió mal al cargar este módulo</p>
          <button className="text-xs underline hover:text-foreground" onClick={() => this.setState({ error: null })}>
            Intentar de nuevo
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

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
  admin: AdminPanel,
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
  admin: 'Administración',
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, activeModule, setUnreadCount, user, unreadCount, setSidebarOpen, login } = useAppStore()
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (res.ok) {
          const data: { user: { id: string; email: string; name: string; role?: string } | null } = await res.json()
          if (data.user) {
            login({
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role || 'user',
            })
          }
        }
      } catch { /* ok */ }
      setCheckingAuth(false)
    }
    restoreSession()
  }, [login])

  const showAuthScreen = searchParams.get('auth') === 'login'

  useEffect(() => {
    if (checkingAuth || isAuthenticated || showAuthScreen) return
    if (window.sessionStorage.getItem(LOGOUT_HISTORY_GUARD_KEY) !== '1') return

    const guardState = { ahorrappLogoutGuard: true }
    window.history.replaceState(guardState, '', '/')
    window.history.pushState(guardState, '', '/')

    const keepLoggedOutLandingVisible = () => {
      window.history.pushState(guardState, '', '/')
    }

    window.addEventListener('popstate', keepLoggedOutLandingVisible)
    return () => {
      window.removeEventListener('popstate', keepLoggedOutLandingVisible)
    }
  }, [checkingAuth, isAuthenticated, showAuthScreen])

  // Fetch notification count — only when authenticated
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  useEffect(() => {
    if (!isAuthenticated) return

    const pollNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?accountId=${user?.id}`)
        if (res.ok) {
          const data = await res.json()
          const list: { isRead?: boolean; read?: boolean }[] = data.notifications ?? data ?? []
          if (Array.isArray(list)) {
            setUnreadCount(list.filter((n) => !(n.isRead ?? n.read ?? false)).length)
          }
        }
      } catch { /* ok */ }
    }

    pollNotifications()
    pollRef.current = setInterval(pollNotifications, 30000)

    return () => { if (pollRef.current !== undefined) clearInterval(pollRef.current) }
  }, [isAuthenticated, setUnreadCount, user?.id])

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loading />
      </div>
    )
  }

  if (!isAuthenticated) {
    if (!showAuthScreen) return <LandingPage onLogin={() => router.replace('/?auth=login')} />
    return <AuthScreen />
  }

  const ActiveModuleComponent = moduleComponents[activeModule]
  const moduleTitle = moduleTitles[activeModule]

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content */}
      <main className="relative z-10 flex-1 min-w-0 flex flex-col">
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
              <ErrorBoundary>
                <ActiveModuleComponent />
              </ErrorBoundary>
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

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loading />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
