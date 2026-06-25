'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Plus, PieChart, ArrowUpRight, ArrowDownRight, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  PieChart as RCPieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

interface BudgetData {
  id: string
  totalIncome: number
  needsPct: number
  wantsPct: number
  savingsPct: number
  needs: { planned: number; actual: number }
  wants: { planned: number; actual: number }
  savings: { planned: number; actual: number }
  categories?: Array<{ name: string; planned: number; actual: number; color: string }>
}

const mockBudget: BudgetData = {
  id: '1',
  totalIncome: 5200,
  needsPct: 50,
  wantsPct: 30,
  savingsPct: 20,
  needs: { planned: 2600, actual: 2510 },
  wants: { planned: 1560, actual: 1480 },
  savings: { planned: 1040, actual: 770 },
  categories: [
    { name: 'Vivienda', planned: 1200, actual: 1200, color: '#10b981' },
    { name: 'Alimentación', planned: 600, actual: 680, color: '#f59e0b' },
    { name: 'Transporte', planned: 400, actual: 450, color: '#f43f5e' },
    { name: 'Servicios', planned: 250, actual: 280, color: '#06b6d4' },
    { name: 'Entretenimiento', planned: 800, actual: 720, color: '#6366f1' },
    { name: 'Compras', planned: 460, actual: 390, color: '#8b5cf6' },
    { name: 'Ahorros', planned: 1040, actual: 770, color: '#14b8a6' },
    { name: 'Otro', planned: 450, actual: 410, color: '#64748b' },
  ],
}

// Mock previous month for comparison
const mockPrevMonth = {
  totalPlanned: 5000,
  totalActual: 5100,
  needs: { actual: 2650 },
  wants: { actual: 1550 },
  savings: { actual: 900 },
}

const SPLIT_CONFIG = [
  { key: 'needs' as const, label: 'Necesidades', sublabel: 'Esenciales', color: '#10b981', bgColor: 'bg-emerald-500' },
  { key: 'wants' as const, label: 'Deseos', sublabel: 'Estilo de Vida', color: '#f59e0b', bgColor: 'bg-amber-500' },
  { key: 'savings' as const, label: 'Ahorros', sublabel: 'Futuro', color: '#06b6d4', bgColor: 'bg-cyan-500' },
]

export default function BudgetModule() {
  const [budget, setBudget] = useState<BudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [formPcts, setFormPcts] = useState({ needs: 50, wants: 30, savings: 20 })
  const [mounted, setMounted] = useState(false)
  const { user } = useAppStore()

  function mapApiBudget(raw: Record<string, unknown>): BudgetData | null {
    const periods = (raw.periods as Array<Record<string, unknown>>) || []
    const latest = periods[0] || {}
    const totalIncome = (raw.totalAmount as number) || 0
    const needsPct = (raw.needsPercent as number) || 50
    const wantsPct = (raw.wantsPercent as number) || 30
    const savingsPct = (raw.savingsPercent as number) || 20
    return {
      id: raw.id as string,
      totalIncome,
      needsPct,
      wantsPct,
      savingsPct,
      needs: { planned: totalIncome * needsPct / 100, actual: (latest.actualNeeds as number) || 0 },
      wants: { planned: totalIncome * wantsPct / 100, actual: (latest.actualWants as number) || 0 },
      savings: { planned: totalIncome * savingsPct / 100, actual: (latest.actualSavings as number) || 0 },
    }
  }

  useEffect(() => {
    let cancelled = false
    const fetchBudget = async () => {
      try {
        const res = await fetch(`/api/budget?accountId=${user?.id}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          const list = Array.isArray(data.budgets) ? data.budgets : Array.isArray(data.budget) ? [data.budget] : Array.isArray(data) ? data : []
          const active = list.find((b: Record<string, unknown>) => b.isActive) || list[0]
          if (active) {
            setBudget(mapApiBudget(active))
          } else {
            setBudget(null)
          }
          setLoading(false)
          return
        }
      } catch { /* fallback */ }
      if (!cancelled) { setBudget(mockBudget); setLoading(false) }
    }
    fetchBudget()
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleCreate = async () => {
    const total = formPcts.needs + formPcts.wants + formPcts.savings
    if (total !== 100) { toast.error('Los porcentajes deben sumar 100%'); return }

    try {
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formPcts, accountId: user?.id }),
      })
      if (res.ok) {
        const data = await res.json()
        setBudget(data.budget || data)
        toast.success('Presupuesto creado')
        setCreateDialogOpen(false)
        return
      }
    } catch { /* fallback */ }

    const income = budget?.totalIncome || 5200
    const newBudget: BudgetData = {
      id: Date.now().toString(),
      totalIncome: income,
      ...formPcts,
      needs: { planned: income * formPcts.needs / 100, actual: 0 },
      wants: { planned: income * formPcts.wants / 100, actual: 0 },
      savings: { planned: income * formPcts.savings / 100, actual: 0 },
      categories: [],
    }
    setBudget(newBudget)
    toast.success('Presupuesto creado')
    setCreateDialogOpen(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
        </div>
      </div>
    )
  }

  if (!budget) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 module-header">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gradient">Presupuesto</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Configura tu regla de presupuesto 50/30/20</p>
          </div>
          <Image src="/images/budget-planning.png" alt="Presupuesto" width={96} height={96} className="h-24 w-24 object-contain rounded-xl opacity-80 hidden sm:block" />
        </div>
        <div className="empty-state rounded-xl text-center py-16 px-6 text-muted-foreground">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-4"
          >
            <Image src="/images/empty-state.png" alt="Sin presupuesto" width={128} height={128} className="h-32 w-32 object-contain rounded-2xl mx-auto" />
          </motion.div>
          <p className="text-lg font-medium">Sin presupuesto configurado</p>
          <p className="text-sm mt-1 mb-6">Crea tu primer presupuesto usando la regla 50/30/20</p>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Crear Presupuesto
          </Button>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) setCreateDialogOpen(false) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Presupuesto</DialogTitle>
              <DialogDescription>Asigna tu ingreso usando la regla 50/30/20.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-2">
              <BudgetSlider label="Necesidades (Esenciales)" pct={formPcts.needs} color="#10b981" onChange={(v) => {
                const remaining = 100 - v
                const wantsRatio = budget ? budget.wantsPct / (budget.wantsPct + budget.savingsPct) : 0.6
                setFormPcts({ needs: v, wants: Math.round(remaining * wantsRatio), savings: Math.round(remaining * (1 - wantsRatio)) })
              }} />
              <BudgetSlider label="Deseos (Estilo de Vida)" pct={formPcts.wants} color="#6366f1" onChange={(v) => {
                const remaining = 100 - v
                const needsRatio = budget ? budget.needsPct / (budget.needsPct + budget.savingsPct) : 0.714
                setFormPcts({ wants: v, needs: Math.round(remaining * needsRatio), savings: Math.round(remaining * (1 - needsRatio)) })
              }} />
              <BudgetSlider label="Ahorros" pct={formPcts.savings} color="#f59e0b" onChange={(v) => {
                const remaining = 100 - v
                const needsRatio = budget ? budget.needsPct / (budget.needsPct + budget.wantsPct) : 0.625
                setFormPcts({ savings: v, needs: Math.round(remaining * needsRatio), wants: Math.round(remaining * (1 - needsRatio)) })
              }} />
              <div className="text-center">
                <span className={cn('text-sm font-semibold', formPcts.needs + formPcts.wants + formPcts.savings === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                  Total: {formPcts.needs + formPcts.wants + formPcts.savings}%
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground">Crear Presupuesto</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  const pieData = [
    { name: 'Necesidades', value: budget.needs.planned, color: '#10b981' },
    { name: 'Deseos', value: budget.wants.planned, color: '#f59e0b' },
    { name: 'Ahorros', value: budget.savings.planned, color: '#06b6d4' },
  ]

  const comparisonData = [
    { name: 'Necesidades', planned: budget.needs.planned, actual: budget.needs.actual },
    { name: 'Deseos', planned: budget.wants.planned, actual: budget.wants.actual },
    { name: 'Ahorros', planned: budget.savings.planned, actual: budget.savings.actual },
  ]

  const totalPlanned = budget.needs.planned + budget.wants.planned + budget.savings.planned
  const totalActual = budget.needs.actual + budget.wants.actual + budget.savings.actual
  const surplus = totalPlanned - totalActual
  const budgetUsagePct = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0

  // Budget health logic
  const budgetHealth = budgetUsagePct <= 80
    ? { status: 'good' as const, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', label: 'En Camino', desc: 'El gasto está bien dentro de los límites del presupuesto' }
    : budgetUsagePct <= 100
      ? { status: 'warning' as const, icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', label: 'Precaución', desc: `${budgetUsagePct}% del presupuesto usado — cuida tus gastos` }
      : { status: 'danger' as const, icon: AlertCircle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', label: 'Sobre Presupuesto', desc: `Has excedido tu presupuesto en ${formatCurrency(Math.abs(surplus))}` }

  // Period comparison
  const prevTotalActual = mockPrevMonth.totalActual
  const currentTotalActual = totalActual
  const monthChangePct = prevTotalActual > 0 ? Math.round(((currentTotalActual - prevTotalActual) / prevTotalActual) * 100) : 0
  const isImproved = currentTotalActual <= prevTotalActual

  const HealthIcon = budgetHealth.icon

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 module-header">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gradient">Presupuesto</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Regla de presupuesto 50/30/20</p>
          </div>
          <Image src="/images/budget-planning.png" alt="Presupuesto" width={96} height={96} className="h-24 w-24 object-contain rounded-xl opacity-80 hidden sm:block" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Actualizar
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Presupuesto
          </Button>
        </div>
      </div>

      {/* 50/30/20 Split Bars */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Distribución del Presupuesto</CardTitle>
          <CardDescription>Asignación de tu ingreso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SPLIT_CONFIG.map((item, idx) => {
            const data = budget[item.key]
            const pct = budget[`${item.key}Pct` as keyof BudgetData] as number
            const usagePct = data.planned > 0 ? Math.round((data.actual / data.planned) * 100) : 0
            const isOver = usagePct > 100

            return (
              <div key={item.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-3 h-3 rounded-sm', item.bgColor)} />
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground">({pct}%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{formatCurrency(data.actual)}</span>
                    <span>de</span>
                    <span className="tabular-nums font-medium text-foreground">{formatCurrency(data.planned)}</span>
                  </div>
                </div>
                <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-lg"
                    style={{ background: item.color }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${mounted ? Math.min(usagePct, 100) : 0}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.15, ease: 'easeOut' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn('text-xs font-semibold tabular-nums', isOver ? 'text-rose-600 dark:text-rose-400' : 'text-foreground')}>
                      {usagePct}%
                    </span>
                  </div>
                </div>
                {isOver && (
                  <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Sobrepasado por {formatCurrency(data.actual - data.planned)}
                  </p>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Budget Health & Period Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Budget Health */}
        <Card className={cn('border-2', budgetHealth.status === 'good' ? 'border-emerald-200 dark:border-emerald-800' : budgetHealth.status === 'warning' ? 'border-amber-200 dark:border-amber-800' : 'border-rose-200 dark:border-rose-800')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2.5 rounded-xl', budgetHealth.bg)}>
                <HealthIcon className={cn('w-5 h-5', budgetHealth.color)} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Salud del Presupuesto</p>
                <p className={cn('text-lg font-bold', budgetHealth.color)}>{budgetHealth.label}</p>
                <p className="text-xs text-muted-foreground">{budgetHealth.desc}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Period Comparison */}
        <Card className="stat-card card-hover">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Este Mes vs Mes Pasado</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(currentTotalActual)}</p>
                <p className="text-xs text-muted-foreground">vs {formatCurrency(prevTotalActual)} mes pasado</p>
              </div>
              <div className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold', isImproved ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400')}>
                {isImproved ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                {Math.abs(monthChangePct)}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Surplus/Deficit Card */}
      <Card className={surplus >= 0 ? 'border-emerald-200 dark:border-emerald-800' : 'border-rose-200 dark:border-rose-800'}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {surplus >= 0 ? <ArrowUpRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> : <ArrowDownRight className="w-6 h-6 text-rose-600 dark:text-rose-400" />}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {surplus >= 0 ? 'Superávit' : 'Déficit'} Este Mes
              </p>
              <p className={surplus >= 0 ? 'text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400' : 'text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400'}>
                {surplus >= 0 ? '+' : ''}{formatCurrency(surplus)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Planeado: {formatCurrency(totalPlanned)}</p>
            <p className="text-xs text-muted-foreground">Real: {formatCurrency(totalActual)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Asignación del Presupuesto</CardTitle>
            <CardDescription>Cómo se distribuye tu ingreso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RCPieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }} />
                </RCPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                  <span className="text-muted-foreground">{item.name} ({item.value / totalPlanned * 100}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Planeado vs Real</CardTitle>
            <CardDescription>Comparación de cumplimiento del presupuesto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }} />
                  <Legend />
                  <Bar dataKey="planned" name="Planeado" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
                  <Bar dataKey="actual" name="Real" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {budget.categories && budget.categories.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Desglose por Categoría</CardTitle>
            <CardDescription>Gastos detallados por categoría</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {budget.categories.map((cat) => {
                const pct = cat.planned > 0 ? Math.round((cat.actual / cat.planned) * 100) : 0
                const over = pct > 100
                return (
                  <div key={cat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                        <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold tabular-nums">{formatCurrency(cat.actual)}</span>
                        <span className="text-xs text-muted-foreground"> / {formatCurrency(cat.planned)}</span>
                        <Badge variant={over ? 'destructive' : 'secondary'} className="ml-2 text-[10px] h-4 px-1.5">
                          {pct}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={Math.min(pct, 100)} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) setCreateDialogOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Presupuesto</DialogTitle>
            <DialogDescription>Asigna tu ingreso usando la regla 50/30/20.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <BudgetSlider label="Necesidades (Esenciales)" pct={formPcts.needs} color="#10b981" onChange={(v) => {
              const remaining = 100 - v
              setFormPcts({ needs: v, wants: Math.round(remaining * 0.6), savings: Math.round(remaining * 0.4) })
            }} />
            <BudgetSlider label="Deseos (Estilo de Vida)" pct={formPcts.wants} color="#6366f1" onChange={(v) => {
              const remaining = 100 - v
              setFormPcts({ wants: v, needs: Math.round(remaining * 0.714), savings: Math.round(remaining * 0.286) })
            }} />
            <BudgetSlider label="Ahorros" pct={formPcts.savings} color="#f59e0b" onChange={(v) => {
              const remaining = 100 - v
              setFormPcts({ savings: v, needs: Math.round(remaining * 0.625), wants: Math.round(remaining * 0.375) })
            }} />
            <div className="text-center">
              <span className={`text-sm font-semibold ${formPcts.needs + formPcts.wants + formPcts.savings === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                Total: {formPcts.needs + formPcts.wants + formPcts.savings}%
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground">Crear Presupuesto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BudgetSlider({ label, pct, color, onChange }: { label: string; pct: number; color: string; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-semibold tabular-nums" style={{ color }}>{pct}%</span>
      </div>
      <Slider
        value={[pct]}
        onValueChange={([v]) => onChange(v)}
        max={80}
        step={1}
        className="[&_[role=slider]]:bg-primary"
      />
    </div>
  )
}