'use client'

import { useEffect } from 'react'
import { useAppStore, type Module } from '@/lib/store'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  settings: SettingsPanel,
}

const moduleTitles: Record<Module, string> = {
  dashboard: 'Dashboard',
  income: 'Ingresos',
  expenses: 'Gastos',
  unexpected: 'Imprevistos',
  savings: 'Ahorros',
  debts: 'Deudas',
  budget: 'Presupuesto',
  'ai-assistant': 'Asistente IA',
  notifications: 'Notificaciones',
  dependents: 'Dependientes',
  settings: 'Configuración',
}

export default function Home() {
  const { isAuthenticated, activeModule, setUnreadCount, user, unreadCount, setSidebarOpen } = useAppStore()

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
      <main className="flex-1 min-w-0">
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
                <span className="sr-only">Open menu</span>
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
              <span className="sr-only">Notifications</span>
            </Button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pl-4 lg:pl-8">
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
      </main>
    </div>
  )
}