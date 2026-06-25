import { create } from 'zustand'

export type Module =
  | 'dashboard'
  | 'income'
  | 'expenses'
  | 'savings'
  | 'debts'
  | 'budget'
  | 'ai-assistant'
  | 'notifications'
  | 'settings'
  | 'unexpected'
  | 'dependents'

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
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  isAuthenticated: false,
  user: null,
  login: (user) => set({ isAuthenticated: true, user }),
  logout: () =>
    set({
      isAuthenticated: false,
      user: null,
      activeModule: 'dashboard',
      dashboardData: null,
      unreadCount: 0,
    }),

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

  // Notifications
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
}))