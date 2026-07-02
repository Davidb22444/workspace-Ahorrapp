import { create } from 'zustand'

export type Module =
  | 'dashboard'
  | 'income'
  | 'expenses'
  | 'unexpected'
  | 'savings'
  | 'debts'
  | 'budget'
  | 'recurring'
  | 'ai-assistant'
  | 'notifications'
  | 'dependents'
  | 'transactions'
  | 'tips'
  | 'report'
  | 'achievements'
  | 'annual-summary'
  | 'settings'
  | 'admin'

export interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AppState {
  // Auth
  isAuthenticated: boolean
  user: User | null
  login: (user: User) => void
  logout: () => void

  // Session management
  inactivityTimeout: number
  setInactivityTimeout: (timeout: number) => void
  lastActivity: number | null
  setLastActivity: (timestamp: number) => void
  isTokenExpired: () => boolean

  // Navigation
  activeModule: Module
  setActiveModule: (module: Module) => void

  // Sidebar
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // Data cache
  dashboardData: any
  setDashboardData: (data: any) => void

  // Notifications
  unreadCount: number
  setUnreadCount: (count: number) => void

  // Quick Add Transaction
  showQuickAdd: boolean
  setShowQuickAdd: (open: boolean) => void
  quickAddType: 'income' | 'expense'
  setQuickAddType: (type: 'income' | 'expense') => void

  // Currency
  currency: string
  setCurrency: (currency: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  isAuthenticated: false,
  user: null,
  login: (user) => {
    set({ isAuthenticated: true, user, lastActivity: Date.now() })
  },
  logout: () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    set({
      isAuthenticated: false,
      user: null,
      lastActivity: null,
      activeModule: 'dashboard',
      dashboardData: null,
      unreadCount: 0,
    })
  },

  // Navigation
  activeModule: 'dashboard',
  setActiveModule: (module) => set({ activeModule: module }),

  // Sidebar
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Data cache
  dashboardData: null,
  setDashboardData: (data) => set({ dashboardData: data }),

  // Session management
  inactivityTimeout: 15 * 60 * 1000,
  setInactivityTimeout: (timeout) => set({ inactivityTimeout: timeout }),
  lastActivity: null,
  setLastActivity: (timestamp) => set({ lastActivity: timestamp }),
  isTokenExpired: () => {
    const state = get()
    if (!state.lastActivity) return false
    return Date.now() - state.lastActivity > state.inactivityTimeout
  },

  // Notifications
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),

  // Quick Add Transaction
  showQuickAdd: false,
  setShowQuickAdd: (open) => set({ showQuickAdd: open }),
  quickAddType: 'expense' as 'income' | 'expense',
  setQuickAddType: (type) => set({ quickAddType: type }),

  // Currency
  currency: 'USD',
  setCurrency: (currency) => set({ currency }),
}))