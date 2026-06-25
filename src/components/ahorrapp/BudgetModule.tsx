'use client'

import { useState, useEffect } from 'react'
import { Plus, PieChart, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react'
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
    { name: 'Housing', planned: 1200, actual: 1200, color: '#10b981' },
    { name: 'Food', planned: 600, actual: 680, color: '#f59e0b' },
    { name: 'Transport', planned: 400, actual: 450, color: '#f43f5e' },
    { name: 'Utilities', planned: 250, actual: 280, color: '#06b6d4' },
    { name: 'Entertainment', planned: 800, actual: 720, color: '#6366f1' },
    { name: 'Shopping', planned: 460, actual: 390, color: '#8b5cf6' },
    { name: 'Savings', planned: 1040, actual: 770, color: '#14b8a6' },
    { name: 'Other', planned: 450, actual: 410, color: '#64748b' },
  ],
}

export default function BudgetModule() {
  const [budget, setBudget] = useState<BudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [formPcts, setFormPcts] = useState({ needs: 50, wants: 30, savings: 20 })
  const { user } = useAppStore()

  useEffect(() => {
    let cancelled = false
    const fetchBudget = async () => {
      try {
        const res = await fetch(`/api/budget?accountId=${user?.id}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setBudget(data.budget || data || null)
          setLoading(false)
          return
        }
      } catch { /* fallback */ }
      if (!cancelled) { setBudget(mockBudget); setLoading(false) }
    }
    fetchBudget()
    return () => { cancelled = true }
  }, [user?.id])

  const handleCreate = async () => {
    const total = formPcts.needs + formPcts.wants + formPcts.savings
    if (total !== 100) { toast.error('Percentages must add up to 100%'); return }

    try {
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formPcts, accountId: user?.id }),
      })
      if (res.ok) {
        const data = await res.json()
        setBudget(data.budget || data)
        toast.success('Budget created')
        setCreateDialogOpen(false)
        fetchBudget()
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
    toast.success('Budget created')
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Presupuesto</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Set up your 50/30/20 budget rule</p>
        </div>
        <div className="text-center py-16 text-muted-foreground">
          <PieChart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No budget set up</p>
          <p className="text-sm mt-1 mb-6">Create your first budget using the 50/30/20 rule</p>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Create Budget
          </Button>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) setCreateDialogOpen(false) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Budget</DialogTitle>
              <DialogDescription>Allocate your income using the 50/30/20 rule.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-2">
              <BudgetSlider label="Needs (Essentials)" pct={formPcts.needs} color="#10b981" onChange={(v) => {
                const remaining = 100 - v
                const wantsRatio = budget ? budget.wantsPct / (budget.wantsPct + budget.savingsPct) : 0.6
                setFormPcts({ needs: v, wants: Math.round(remaining * wantsRatio), savings: Math.round(remaining * (1 - wantsRatio)) })
              }} />
              <BudgetSlider label="Wants (Lifestyle)" pct={formPcts.wants} color="#6366f1" onChange={(v) => {
                const remaining = 100 - v
                const needsRatio = budget ? budget.needsPct / (budget.needsPct + budget.savingsPct) : 0.714
                setFormPcts({ wants: v, needs: Math.round(remaining * needsRatio), savings: Math.round(remaining * (1 - needsRatio)) })
              }} />
              <BudgetSlider label="Savings" pct={formPcts.savings} color="#f59e0b" onChange={(v) => {
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
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground">Create Budget</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  const pieData = [
    { name: 'Needs', value: budget.needs.planned, color: '#10b981' },
    { name: 'Wants', value: budget.wants.planned, color: '#6366f1' },
    { name: 'Savings', value: budget.savings.planned, color: '#f59e0b' },
  ]

  const comparisonData = [
    { name: 'Needs', planned: budget.needs.planned, actual: budget.needs.actual },
    { name: 'Wants', planned: budget.wants.planned, actual: budget.wants.actual },
    { name: 'Savings', planned: budget.savings.planned, actual: budget.savings.actual },
  ]

  const totalPlanned = budget.needs.planned + budget.wants.planned + budget.savings.planned
  const totalActual = budget.needs.actual + budget.wants.actual + budget.savings.actual
  const surplus = totalPlanned - totalActual

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Presupuesto</h1>
          <p className="text-muted-foreground text-sm mt-0.5">50/30/20 budget rule</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchBudget}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
            <Plus className="w-4 h-4 mr-2" /> New Budget
          </Button>
        </div>
      </div>

      {/* Surplus/Deficit Card */}
      <Card className={surplus >= 0 ? 'border-emerald-200 dark:border-emerald-800' : 'border-rose-200 dark:border-rose-800'}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {surplus >= 0 ? <ArrowUpRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> : <ArrowDownRight className="w-6 h-6 text-rose-600 dark:text-rose-400" />}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {surplus >= 0 ? 'Surplus' : 'Deficit'} This Month
              </p>
              <p className={surplus >= 0 ? 'text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400' : 'text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400'}>
                {surplus >= 0 ? '+' : ''}{formatCurrency(surplus)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Planned: {formatCurrency(totalPlanned)}</p>
            <p className="text-xs text-muted-foreground">Actual: {formatCurrency(totalActual)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Budget Allocation</CardTitle>
            <CardDescription>How your income is distributed</CardDescription>
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
            <CardTitle className="text-base font-semibold">Planned vs Actual</CardTitle>
            <CardDescription>Budget adherence comparison</CardDescription>
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
                  <Bar dataKey="planned" name="Planned" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
                  <Bar dataKey="actual" name="Actual" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={28} />
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
            <CardTitle className="text-base font-semibold">Category Breakdown</CardTitle>
            <CardDescription>Detailed spending per category</CardDescription>
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
            <DialogTitle>Create New Budget</DialogTitle>
            <DialogDescription>Allocate your income using the 50/30/20 rule.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <BudgetSlider label="Needs (Essentials)" pct={formPcts.needs} color="#10b981" onChange={(v) => {
              const remaining = 100 - v
              setFormPcts({ needs: v, wants: Math.round(remaining * 0.6), savings: Math.round(remaining * 0.4) })
            }} />
            <BudgetSlider label="Wants (Lifestyle)" pct={formPcts.wants} color="#6366f1" onChange={(v) => {
              const remaining = 100 - v
              setFormPcts({ wants: v, needs: Math.round(remaining * 0.714), savings: Math.round(remaining * 0.286) })
            }} />
            <BudgetSlider label="Savings" pct={formPcts.savings} color="#f59e0b" onChange={(v) => {
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
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground">Create Budget</Button>
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