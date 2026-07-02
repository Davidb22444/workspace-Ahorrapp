'use client'

import { useState, useEffect } from 'react'
import {
  Shield, Users, Search, Ban, CheckCircle, Trash2, UserCog,
  BarChart3, Activity, AlertTriangle, TrendingUp, DollarSign,
  PiggyBank, Bell, CreditCard,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/lib/store'
import { motion } from 'framer-motion'

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  status: string
  created_at: string
}

interface AdminStats {
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  adminUsers: number
  totalIncomes: number
  totalExpenses: number
  totalDebts: number
  totalSavingsGoals: number
  totalNotifications: number
}

type Tab = 'dashboard' | 'users'

export default function AdminPanel() {
  const { user } = useAppStore()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats'),
      ])
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users || [])
      }
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
        setRecentUsers(data.recentUsers || [])
      }
    } catch {
      // silencio
    }
    setLoading(false)
  }

  const changeRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    }
  }

  const toggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)))
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('¿Eliminar este usuario permanentemente? Todos sus datos se perderán.')) return
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' }),
    })
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  const statCards = stats
    ? [
        { label: 'Usuarios Totales', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
        { label: 'Activos', value: stats.activeUsers, icon: Activity, color: 'text-green-500' },
        { label: 'Suspendidos', value: stats.suspendedUsers, icon: AlertTriangle, color: 'text-red-500' },
        { label: 'Administradores', value: stats.adminUsers, icon: Shield, color: 'text-purple-500' },
        { label: 'Ingresos', value: stats.totalIncomes, icon: TrendingUp, color: 'text-emerald-500' },
        { label: 'Gastos', value: stats.totalExpenses, icon: DollarSign, color: 'text-orange-500' },
        { label: 'Deudas', value: stats.totalDebts, icon: CreditCard, color: 'text-rose-500' },
        { label: 'Metas Ahorro', value: stats.totalSavingsGoals, icon: PiggyBank, color: 'text-cyan-500' },
      ]
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground animate-pulse">Cargando panel de administración...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Administración</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestión del sistema AhorrApp</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit">
        <button
          onClick={() => setTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'dashboard' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Dashboard
        </button>
        <button
          onClick={() => setTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'users' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuarios ({users.length})
        </button>
      </div>

      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${s.color}`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Recent Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4 text-primary" />
                Últimos usuarios registrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay usuarios registrados.</p>
              ) : (
                <div className="space-y-2">
                  {recentUsers.map((u, i) => (
                    <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-[10px]">
                        {u.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'users' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCog className="w-4 h-4 text-primary" />
                Gestión de Usuarios
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Usuario</th>
                    <th className="text-left px-4 py-3 font-medium">Email</th>
                    <th className="text-left px-4 py-3 font-medium">Rol</th>
                    <th className="text-left px-4 py-3 font-medium">Estado</th>
                    <th className="text-right px-4 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                        No se encontraron usuarios.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-[10px]">
                            {u.role === 'admin' ? <Shield className="w-3 h-3 mr-1 inline" /> : null}
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              u.status === 'active'
                                ? 'text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800'
                                : 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800'
                            }`}
                          >
                            {u.status === 'active' ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <Ban className="w-3 h-3 mr-1" />
                            )}
                            {u.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {user?.id !== u.id && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => changeRole(u.id, u.role)}
                                  className="text-xs h-8"
                                  title={u.role === 'admin' ? 'Revocar admin' : 'Hacer admin'}
                                >
                                  <Shield className="w-3.5 h-3.5 mr-1" />
                                  {u.role === 'admin' ? 'Revocar' : 'Admin'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleStatus(u.id, u.status)}
                                  className={`text-xs h-8 ${
                                    u.status === 'active' ? 'text-red-500 hover:text-red-600' : 'text-green-500 hover:text-green-600'
                                  }`}
                                  title={u.status === 'active' ? 'Suspender' : 'Restaurar'}
                                >
                                  {u.status === 'active' ? (
                                    <Ban className="w-3.5 h-3.5 mr-1" />
                                  ) : (
                                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                  )}
                                  {u.status === 'active' ? 'Suspender' : 'Restaurar'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteUser(u.id)}
                                  className="text-xs h-8 text-red-500 hover:text-red-600"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                            {user?.id === u.id && (
                              <span className="text-xs text-muted-foreground italic px-2">(tú)</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
