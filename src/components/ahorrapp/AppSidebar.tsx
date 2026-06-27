'use client'

import { useAppStore, type Module } from '@/lib/store'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  PiggyBank,
  CreditCard,
  PieChart,
  Repeat,
  Bot,
  Bell,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  Wallet,
  Search,
  FileBarChart,
  Trophy,
  CalendarDays,
  Lightbulb,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface NavItem {
  id: Module
  label: string
  icon: React.ElementType
  badge?: boolean
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
  { id: 'income', label: 'Ingresos', icon: TrendingUp },
  { id: 'expenses', label: 'Gastos', icon: ShoppingCart },
  { id: 'unexpected', label: 'Imprevistos', icon: AlertTriangle },
  { id: 'savings', label: 'Ahorros', icon: PiggyBank },
  { id: 'debts', label: 'Deudas', icon: CreditCard },
  { id: 'budget', label: 'Presupuesto', icon: PieChart },
  { id: 'recurring', label: 'Pagos Recurrentes', icon: Repeat },
  { id: 'ai-assistant', label: 'Asistente IA', icon: Bot },
  { id: 'tips', label: 'Consejos Financieros', icon: Lightbulb },
  { id: 'notifications', label: 'Notificaciones', icon: Bell, badge: true },
  { id: 'dependents', label: 'Dependientes', icon: Users },
  { id: 'transactions', label: 'Centro de Transacciones', icon: Search },
  { id: 'report', label: 'Reporte Mensual', icon: FileBarChart },
  { id: 'achievements', label: 'Logros', icon: Trophy },
  { id: 'annual-summary', label: 'Resumen Anual', icon: CalendarDays },
  { id: 'settings', label: 'Configuración', icon: Settings },
]

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { user, activeModule, setActiveModule, logout, unreadCount } = useAppStore()
  const { setTheme, theme } = useTheme()

  const handleNav = (id: Module) => {
    setActiveModule(id)
    onNavigate?.()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 shrink-0">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h2 className="font-bold text-foreground text-lg leading-none">AhorrApp</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Gestor de Finanzas</p>
          </div>
        )}
      </div>

      <Separator />

      {/* User info */}
      <div className={cn('px-4 py-4', collapsed && 'px-2')}>
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 animate-fade-in">
              <p className="text-sm font-medium text-foreground truncate">{user?.name || 'Usuario'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeModule === item.id
          const Icon = item.icon

          const button = (
            <button
              onClick={() => handleNav(item.id)}
              className={cn(
                'sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative sidebar-item-hover',
                isActive
                  ? 'active'
                  : 'text-muted-foreground hover:text-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary')} />
              {!collapsed && <span className="animate-fade-in">{item.label}</span>}
              {item.badge && unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className={cn(
                    'h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1.5',
                    collapsed && 'absolute -top-1 -right-1'
                  )}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
              {isActive && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full animate-pulse-dot" />
              )}
              {isActive && collapsed && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse-dot" />
              )}
            </button>
          )

          if (collapsed) {
            return (
              <TooltipProvider key={item.id} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                    {item.badge && unreadCount > 0 && (
                      <span className="ml-2 text-destructive">({unreadCount})</span>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          }

          return <div key={item.id}>{button}</div>
        })}
      </nav>

      {/* Gradient divider before bottom actions */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />

      {/* Bottom actions */}
      <div className="px-3 py-3 space-y-1">
        {/* Quick Stats */}
        {!collapsed && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="status-dot status-dot-active" />
              <span>Sistema operativo</span>
            </div>
          </div>
        )}
        <div className={cn('flex items-center gap-3', collapsed ? 'justify-center px-2' : 'px-3 py-1')}>
          <label className="theme-switch">
            <input
              className="theme-toggle"
              type="checkbox"
              checked={theme === 'dark'}
              onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            />
            <span className="theme-slider"></span>
          </label>
          {!collapsed && <span className="text-xs text-muted-foreground">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>}
        </div>
        <button
          onClick={logout}
          className={cn(
            'sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive/80 hover:text-destructive hover:bg-destructive/10',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="animate-fade-in">Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  )
}

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { sidebarOpen, setSidebarOpen } = useAppStore()

  useEffect(() => {
    setMobileOpen(sidebarOpen)
  }, [sidebarOpen])

  const handleMobileClose = () => {
    setMobileOpen(false)
    setSidebarOpen(false)
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col h-screen sticky top-0 border-r border-border bg-card transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-[260px]'
        )}
      >
        <SidebarContent collapsed={collapsed} />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full bg-card border shadow-sm hover:bg-accent"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className={cn('w-3 h-3 transition-transform duration-300', collapsed && 'rotate-180')} />
          </Button>
        </div>
      </aside>

      {/* Mobile Trigger - hidden since mobile header now includes it */}

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={(open) => { if (!open) handleMobileClose() }}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
          <SidebarContent collapsed={false} onNavigate={handleMobileClose} />
        </SheetContent>
      </Sheet>
    </>
  )
}