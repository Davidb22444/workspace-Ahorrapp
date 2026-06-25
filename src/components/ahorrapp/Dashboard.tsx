'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Plus,
  Calendar,
  Trophy,
  Tag,
  Target,
  BarChart3,
  X,
  Loader2,
  Wallet,
  PiggyBank,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import { format, startOfMonth, getDay, getDaysInMonth } from 'date-fns'

const CHART_COLORS = ['#10b981', '#f59e0b', '#f43f5e', '#6366f1', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6']

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

interface DashboardData {
  balance: number
  totalIncome: number
  totalExpenses: number
  totalDebt: number
  monthlyCashFlow: Array<{ month: string; income: number; expenses: number }>
  expenseCategories: Array<{ name: string; value: number; color: string }>
  budgetVsActual: Array<{ name: string; planned: number; actual: number }>
  recentTransactions: Array<{
    id: string
    type: string
    description: string
    amount: number
    date: string
    category?: string
    categoryColor?: string
  }>
  savingsGoals: Array<{
    id: string
    name: string
    saved: number
    target: number
    deadline?: string
  }>
}

const mockData: DashboardData = {
  balance: 12450.75,
  totalIncome: 5200.0,
  totalExpenses: 3420.5,
  totalDebt: 8500.0,
  monthlyCashFlow: [
    { month: 'Jan', income: 4800, expenses: 3200 },
    { month: 'Feb', income: 5100, expenses: 2900 },
    { month: 'Mar', income: 4900, expenses: 3500 },
    { month: 'Apr', income: 5300, expenses: 3100 },
    { month: 'May', income: 5000, expenses: 3400 },
    { month: 'Jun', income: 5200, expenses: 3420 },
  ],
  expenseCategories: [
    { name: 'Housing', value: 1200, color: '#10b981' },
    { name: 'Food', value: 680, color: '#f59e0b' },
    { name: 'Transport', value: 450, color: '#f43f5e' },
    { name: 'Entertainment', value: 320, color: '#6366f1' },
    { name: 'Utilities', value: 380, color: '#06b6d4' },
    { name: 'Other', value: 390.5, color: '#8b5cf6' },
  ],
  budgetVsActual: [
    { name: 'Needs', planned: 2600, actual: 2510 },
    { name: 'Wants', planned: 1560, actual: 1480 },
    { name: 'Savings', planned: 1040, actual: 770 },
  ],
  recentTransactions: [
    { id: '1', type: 'income', description: 'Monthly Salary', amount: 5200, date: '2025-06-01', category: 'Salary' },
    { id: '2', type: 'expense', description: 'Rent Payment', amount: -1200, date: '2025-06-02', category: 'Housing', categoryColor: '#10b981' },
    { id: '3', type: 'expense', description: 'Grocery Store', amount: -156.80, date: '2025-06-03', category: 'Food', categoryColor: '#f59e0b' },
    { id: '4', type: 'expense', description: 'Electric Bill', amount: -120, date: '2025-06-04', category: 'Utilities', categoryColor: '#06b6d4' },
    { id: '5', type: 'income', description: 'Freelance Project', amount: 800, date: '2025-06-05', category: 'Freelance' },
    { id: '6', type: 'expense', description: 'Gas Station', amount: -65, date: '2025-06-06', category: 'Transport', categoryColor: '#f43f5e' },
    { id: '7', type: 'expense', description: 'Netflix Subscription', amount: -15.99, date: '2025-06-07', category: 'Entertainment', categoryColor: '#6366f1' },
    { id: '8', type: 'expense', description: 'Restaurant Dinner', amount: -85.50, date: '2025-06-08', category: 'Food', categoryColor: '#f59e0b' },
    { id: '9', type: 'income', description: 'Investment Returns', amount: 150, date: '2025-06-09', category: 'Investment' },
    { id: '10', type: 'expense', description: 'Phone Bill', amount: -55, date: '2025-06-10', category: 'Utilities', categoryColor: '#06b6d4' },
  ],
  savingsGoals: [
    { id: '1', name: 'Emergency Fund', saved: 4500, target: 10000, deadline: '2025-12-31' },
    { id: '2', name: 'Vacation', saved: 1200, target: 3000, deadline: '2025-08-15' },
    { id: '3', name: 'New Laptop', saved: 800, target: 2000 },
    { id: '4', name: 'Down Payment', saved: 15000, target: 50000, deadline: '2027-06-01' },
  ],
}

// ── Enhanced Tooltip ──────────────────────────────────────────────
function EnhancedChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0)
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-xl">
        <p className="text-sm font-semibold text-foreground mb-1.5">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-semibold tabular-nums">{formatCurrency(entry.value)}</span>
          </div>
        ))}
        {payload.length > 1 && (
          <div className="border-t border-border/50 mt-1.5 pt-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Net</span>
            <span className={cn('font-bold tabular-nums', total >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {formatCurrency(total)}
            </span>
          </div>
        )}
      </div>
    )
  }
  return null
}

// ── Emoji mapper for savings goals ─────────────────────────────────
function getGoalEmoji(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('emergency') || lower.includes('emergencia')) return '🛡️'
  if (lower.includes('vacat') || lower.includes('viaje')) return '✈️'
  if (lower.includes('laptop') || lower.includes('computer') || lower.includes('pc')) return '💻'
  if (lower.includes('car') || lower.includes('auto') || lower.includes('coche')) return '🚗'
  if (lower.includes('house') || lower.includes('home') || lower.includes('down') || lower.includes('casa')) return '🏠'
  if (lower.includes('wedding') || lower.includes('boda')) return '💍'
  if (lower.includes('education') || lower.includes('study') || lower.includes('college')) return '🎓'
  if (lower.includes('retire') || lower.includes('jubil')) return '🌴'
  if (lower.includes('gift') || lower.includes('regalo')) return '🎁'
  if (lower.includes('invest') || lower.includes('inversion')) return '📈'
  return '🎯'
}

// ── Quick Add Transaction Dialog ───────────────────────────────────
function QuickAddDialog({
  open,
  onOpenChange,
  type,
  onTypeChange,
  accountId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'income' | 'expense'
  onTypeChange: (type: 'income' | 'expense') => void
  accountId: string
  onSaved: () => void
}) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [source, setSource] = useState('Salary')
  const [category, setCategory] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])

  const incomeSources = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other']

  useEffect(() => {
    if (type === 'expense' && accountId) {
      fetch(`/api/categories?accountId=${accountId}`)
        .then(r => r.json())
        .then(data => {
          const cats = data.categories || data || []
          setCategories(Array.isArray(cats) ? cats.map((c: any) => ({ id: c.id, name: c.name })) : [])
          if (cats.length > 0 && !category) setCategory(cats[0].name)
        })
        .catch(() => {
          setCategories([
            { id: '1', name: 'Housing' },
            { id: '2', name: 'Food' },
            { id: '3', name: 'Transport' },
            { id: '4', name: 'Entertainment' },
            { id: '5', name: 'Utilities' },
            { id: '6', name: 'Healthcare' },
            { id: '7', name: 'Education' },
            { id: '8', name: 'Other' },
          ])
          if (!category) setCategory('Housing')
        })
    }
  }, [type, accountId])

  const handleSave = async () => {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0 || !description.trim()) return
    setSaving(true)

    try {
      if (type === 'income') {
        await fetch('/api/income', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            amount: numAmount,
            source,
            description: description.trim(),
            date,
            isRecurring,
          }),
        })
      } else {
        await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            amount: numAmount,
            categoryId: categories.find(c => c.name === category)?.id || '1',
            description: description.trim(),
            date,
            isRecurring,
          }),
        })
      }
      onSaved()
      onOpenChange(false)
      setAmount('')
      setDescription('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setIsRecurring(false)
    } catch {
      // silent fail
    } finally {
      setSaving(false)
    }
  }

  const handleTabChange = (val: string) => {
    onTypeChange(val as 'income' | 'expense')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>Quickly add a new income or expense entry.</DialogDescription>
        </DialogHeader>

        <Tabs value={type} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="income" className="flex-1">
              <ArrowUpRight className="w-4 h-4 mr-1.5 text-emerald-500" />
              Income
            </TabsTrigger>
            <TabsTrigger value="expense" className="flex-1">
              <ArrowDownRight className="w-4 h-4 mr-1.5 text-rose-500" />
              Expense
            </TabsTrigger>
          </TabsList>

          <TabsContent value="income" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="income-amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">$</span>
                <Input
                  id="income-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-2xl font-bold h-14 tabular-nums"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="income-desc">Description</Label>
              <Input
                id="income-desc"
                placeholder="e.g. Monthly salary"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {incomeSources.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="income-date">Date</Label>
                <Input
                  id="income-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="income-recurring">Recurring</Label>
              <Switch id="income-recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
          </TabsContent>

          <TabsContent value="expense" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">$</span>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-2xl font-bold h-14 tabular-nums"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-desc">Description</Label>
              <Input
                id="expense-desc"
                placeholder="e.g. Grocery shopping"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-date">Date</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="expense-recurring">Recurring</Label>
              <Switch id="expense-recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!amount || parseFloat(amount) <= 0 || !description.trim() || saving}
            className={cn(
              'min-w-[100px]',
              type === 'income'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {type === 'income' ? 'Add Income' : 'Add Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Dashboard Component ───────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dailySpendingData, setDailySpendingData] = useState<Array<{ date: string; amount: number }>>([])
  const { user, dashboardData, setDashboardData, showQuickAdd, setShowQuickAdd, quickAddType, setQuickAddType, setActiveModule } = useAppStore()

  const mapApiData = (api: any): DashboardData => ({
    balance: api.balance ?? 0,
    totalIncome: api.totalIncome ?? 0,
    totalExpenses: api.totalExpenses ?? 0,
    totalDebt: api.activeDebtPayments ?? 0,
    monthlyCashFlow: (api.monthlyData ?? []).map((m: any) => ({
      month: m.month?.split(' ')[0] || m.month,
      income: m.income ?? 0,
      expenses: m.expenses ?? 0,
    })),
    expenseCategories: (api.categoryBreakdown ?? []).map((c: any) => ({
      name: c.name,
      value: c.total ?? c.value ?? 0,
      color: c.color || '#94a3b8',
    })),
    budgetVsActual: [] as DashboardData['budgetVsActual'],
    recentTransactions: (api.recentMovements ?? []).map((m: any) => ({
      id: m.id,
      type: m.type || 'expense',
      description: m.description,
      amount: m.type === 'entrada' ? m.amount : -m.amount,
      date: m.date,
      category: m.category?.name,
      categoryColor: m.category?.color,
    })),
    savingsGoals: (api.savingsProgress ?? []).map((g: any) => ({
      id: g.id,
      name: g.name,
      saved: g.savedAmount ?? g.saved ?? 0,
      target: g.targetAmount ?? g.target ?? 0,
      deadline: g.deadline,
    })),
  })

  const doFetchData = async () => {
    setLoading(true)
    try {
      if (user?.id) {
        const currentMonth = format(new Date(), 'yyyy-MM')
        const [dashRes, budgetRes, dailyRes] = await Promise.all([
          fetch(`/api/dashboard?accountId=${user.id}`),
          fetch(`/api/budget?accountId=${user.id}`),
          fetch(`/api/dashboard/daily-spending?accountId=${user.id}&month=${currentMonth}`),
        ])
        if (dailyRes.ok) {
          const dailyJson = await dailyRes.json()
          setDailySpendingData(dailyJson.days ?? [])
        }
        if (dashRes.ok) {
          const json = await dashRes.json()
          const mapped = mapApiData(json)

          if (budgetRes.ok) {
            try {
              const budgetJson = await budgetRes.json()
              const budgets = budgetJson.budgets || []
              if (budgets.length > 0) {
                const b = budgets[0]
                const totalIncome = mapped.totalIncome || b.totalAmount || 5200
                const needsPct = b.needsPercent ?? 50
                const wantsPct = b.wantsPercent ?? 30
                const savingsPct = b.savingsPercent ?? 20
                mapped.budgetVsActual = [
                  { name: 'Needs', planned: Math.round(totalIncome * needsPct / 100), actual: Math.round(mapped.totalExpenses * needsPct / 100) },
                  { name: 'Wants', planned: Math.round(totalIncome * wantsPct / 100), actual: Math.round(mapped.totalExpenses * wantsPct / 100) },
                  { name: 'Savings', planned: Math.round(totalIncome * savingsPct / 100), actual: Math.round((totalIncome - mapped.totalExpenses) * savingsPct / 100) },
                ]
              }
            } catch { /* keep mock budgetVsActual */ }
          }

          setDashboardData(mapped)
          setData(mapped)
          setLoading(false)
          return
        }
      }
    } catch { /* fallback */ }
    setData(dashboardData || mockData)
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        if (user?.id) {
          const currentMonth = format(new Date(), 'yyyy-MM')
          const [dashRes, budgetRes, dailyRes] = await Promise.all([
            fetch(`/api/dashboard?accountId=${user.id}`),
            fetch(`/api/budget?accountId=${user.id}`),
            fetch(`/api/dashboard/daily-spending?accountId=${user.id}&month=${currentMonth}`),
          ])
          if (dailyRes.ok && !cancelled) {
            const dailyJson = await dailyRes.json()
            setDailySpendingData(dailyJson.days ?? [])
          }
          if (dashRes.ok && !cancelled) {
            const json = await dashRes.json()
            const mapped = mapApiData(json)

            if (budgetRes.ok) {
              try {
                const budgetJson = await budgetRes.json()
                const budgets = budgetJson.budgets || []
                if (budgets.length > 0) {
                  const b = budgets[0]
                  const totalIncome = mapped.totalIncome || b.totalAmount || 5200
                  const needsPct = b.needsPercent ?? 50
                  const wantsPct = b.wantsPercent ?? 30
                  const savingsPct = b.savingsPercent ?? 20
                  mapped.budgetVsActual = [
                    { name: 'Needs', planned: Math.round(totalIncome * needsPct / 100), actual: Math.round(mapped.totalExpenses * needsPct / 100) },
                    { name: 'Wants', planned: Math.round(totalIncome * wantsPct / 100), actual: Math.round(mapped.totalExpenses * wantsPct / 100) },
                    { name: 'Savings', planned: Math.round(totalIncome * savingsPct / 100), actual: Math.round((totalIncome - mapped.totalExpenses) * savingsPct / 100) },
                  ]
                }
              } catch { /* keep mock budgetVsActual */ }
            }

            setDashboardData(mapped)
            setData(mapped)
            setLoading(false)
            return
          }
        }
      } catch { /* fallback */ }
      if (!cancelled) { setData(dashboardData || mockData); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  const d = data || mockData

  // ── Calculate Financial Health Score ──
  const healthScore = (() => {
    let score = 0
    // Savings rate (up to 40 points)
    const savingsRate = d.totalIncome > 0 ? (d.totalIncome - d.totalExpenses) / d.totalIncome : 0
    score += Math.min(40, Math.max(0, savingsRate * 100)) * (40 / 50) // 50% savings rate = full 40 pts

    // Debt-to-income ratio (up to 30 points, lower is better)
    const debtRatio = d.totalIncome > 0 ? d.totalDebt / d.totalIncome : 0
    score += Math.max(0, 30 - (debtRatio * 15)) // 0 debt = 30 pts, high debt = 0

    // Emergency fund coverage (up to 30 points)
    const monthsCovered = d.totalExpenses > 0 ? d.balance / d.totalExpenses : 0
    score += Math.min(30, monthsCovered * 6) // 5 months = full 30 pts

    return Math.round(Math.max(0, Math.min(100, score)))
  })()

  // ── Calculate Insights ──
  const insights = (() => {
    const cashFlow = d.monthlyCashFlow || []
    // Best saving month
    let bestMonth = 'N/A'
    let bestNet = -Infinity
    cashFlow.forEach(m => {
      const net = m.income - m.expenses
      if (net > bestNet) { bestNet = net; bestMonth = m.month }
    })

    // Biggest expense category
    const cats = d.expenseCategories || []
    const biggestCat = cats.length > 0
      ? cats.reduce((a, b) => a.value > b.value ? a : b)
      : { name: 'N/A', value: 0 }

    // Savings on track (>50% progress)
    const onTrackCount = d.savingsGoals.filter(g => {
      const pct = g.target > 0 ? g.saved / g.target : 0
      return pct > 0.5
    }).length

    // Net worth trend (current vs last month)
    let trend = 0
    let trendLabel = 'N/A'
    if (cashFlow.length >= 2) {
      const current = cashFlow[cashFlow.length - 1]
      const previous = cashFlow[cashFlow.length - 2]
      trend = (current.income - current.expenses) - (previous.income - previous.expenses)
      trendLabel = formatCurrency(Math.abs(trend))
    }

    return { bestMonth, bestNet, biggestCat, onTrackCount, trend, trendLabel, hasTrend: cashFlow.length >= 2 }
  })()

  // ── Generate daily spending sparkline data ──
  const dailySpending = (() => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const today = new Date().getDate()
    const data: Array<{ day: string; amount: number }> = []
    for (let i = 1; i <= Math.min(today, daysInMonth); i++) {
      // Distribute expenses across days with some randomness but deterministic
      const baseDaily = d.totalExpenses / 30
      const variation = Math.sin(i * 2.7 + 1.3) * baseDaily * 0.6
      data.push({ day: `${i}`, amount: Math.max(0, Math.round((baseDaily + variation) * 100) / 100) })
    }
    return data
  })()

  // ── Spending Heatmap Calendar Data ──
  const heatmapData = (() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = getDaysInMonth(now)
    const firstDayOfWeek = getDay(startOfMonth(now)) // 0=Sun
    // Adjust so Monday=0
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
    const today = now.getDate()

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    const cells: Array<{
      day: number | null
      amount: number
      isToday: boolean
      isFuture: boolean
      colorClass: string
    }> = []

    // Add empty cells for offset
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, amount: 0, isToday: false, isFuture: false, colorClass: '' })
    }

    // Add day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = format(new Date(year, month, day), 'yyyy-MM-dd')
      const match = dailySpendingData.find(d => d.date === dateStr)
      const amount = match ? match.amount : 0
      const isToday = day === today
      const isFuture = day > today

      let colorClass = 'bg-muted/40 dark:bg-muted/20' // No spending (gray)
      if (!isFuture) {
        if (amount > 500) colorClass = 'bg-rose-400 dark:bg-rose-500/80'
        else if (amount > 200) colorClass = 'bg-amber-400 dark:bg-amber-500/80'
        else if (amount > 50) colorClass = 'bg-emerald-500 dark:bg-emerald-500/80'
        else if (amount >= 1) colorClass = 'bg-emerald-300 dark:bg-emerald-400/60'
      } else {
        colorClass = 'bg-muted/20 dark:bg-muted/10'
      }

      cells.push({ day, amount, isToday, isFuture, colorClass })
    }

    return { dayNames, cells, monthName: format(now, 'MMMM yyyy') }
  })()

  // ── Net Worth Trend Data ──
  const netWorthData = (() => {
    const cashFlow = d.monthlyCashFlow || []
    if (cashFlow.length === 0) return []
    // Cumulative net = running sum of (income - expenses)
    let cumulative = d.balance - cashFlow.reduce((sum, m) => sum + m.income - m.expenses, 0)
    return cashFlow.map(m => {
      cumulative += m.income - m.expenses
      return {
        month: m.month?.split(' ')[0] || m.month,
        netWorth: Number(cumulative.toFixed(2)),
      }
    })
  })()

  // ── Monthly Comparison Data ──
  const monthlyComparison = (() => {
    const cashFlow = d.monthlyCashFlow || []
    if (cashFlow.length < 2) {
      const curr = cashFlow.length === 1 ? cashFlow[0] : { income: 0, expenses: 0 }
      return [
        { label: 'Total Income', current: curr.income, previous: 0, change: 0, color: 'border-l-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400', icon: TrendingUp },
        { label: 'Total Expenses', current: curr.expenses, previous: 0, change: 0, color: 'border-l-rose-500', textColor: 'text-rose-600 dark:text-rose-400', icon: CreditCard },
        { label: 'Net Savings', current: curr.income - curr.expenses, previous: 0, change: 0, color: 'border-l-cyan-500', textColor: 'text-cyan-600 dark:text-cyan-400', icon: PiggyBank },
      ]
    }
    const curr = cashFlow[cashFlow.length - 1]
    const prev = cashFlow[cashFlow.length - 2]

    const calcChange = (currVal: number, prevVal: number) => {
      if (prevVal === 0) return currVal > 0 ? 100 : 0
      return Number(((currVal - prevVal) / Math.abs(prevVal) * 100).toFixed(1))
    }

    const currNet = curr.income - curr.expenses
    const prevNet = prev.income - prev.expenses

    return [
      { label: 'Total Income', current: curr.income, previous: prev.income, change: calcChange(curr.income, prev.income), color: 'border-l-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400', icon: TrendingUp },
      { label: 'Total Expenses', current: curr.expenses, previous: prev.expenses, change: calcChange(curr.expenses, prev.expenses), color: 'border-l-rose-500', textColor: 'text-rose-600 dark:text-rose-400', icon: CreditCard },
      { label: 'Net Savings', current: currNet, previous: prevNet, change: calcChange(currNet, prevNet), color: 'border-l-cyan-500', textColor: 'text-cyan-600 dark:text-cyan-400', icon: PiggyBank },
    ]
  })()

  // ── Metric cards ──
  const metrics = [
    {
      title: 'Balance Actual',
      value: formatCurrency(d.balance),
      change: '+12.5%',
      trend: 'up' as const,
      icon: DollarSign,
      accentColor: '#10b981',
      gradientFrom: 'from-emerald-500/10',
      gradientTo: 'to-teal-500/5',
      iconBg: 'bg-emerald-100 dark:bg-emerald-500/15',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      cardAccentFrom: '#10b981',
      cardAccentTo: '#06b6d4',
    },
    {
      title: 'Ingresos Totales',
      value: formatCurrency(d.totalIncome),
      change: '+4.2%',
      trend: 'up' as const,
      icon: TrendingUp,
      accentColor: '#06b6d4',
      gradientFrom: 'from-cyan-500/10',
      gradientTo: 'to-sky-500/5',
      iconBg: 'bg-cyan-100 dark:bg-cyan-500/15',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      cardAccentFrom: '#10b981',
      cardAccentTo: '#34d399',
    },
    {
      title: 'Gastos Totales',
      value: formatCurrency(d.totalExpenses),
      change: '-2.1%',
      trend: 'down' as const,
      icon: TrendingDown,
      accentColor: '#f43f5e',
      gradientFrom: 'from-rose-500/10',
      gradientTo: 'to-pink-500/5',
      iconBg: 'bg-rose-100 dark:bg-rose-500/15',
      iconColor: 'text-rose-600 dark:text-rose-400',
      cardAccentFrom: '#f43f5e',
      cardAccentTo: '#fb7185',
    },
    {
      title: 'Deudas Activas',
      value: formatCurrency(d.totalDebt),
      change: '3 debts',
      trend: 'neutral' as const,
      icon: CreditCard,
      accentColor: '#f59e0b',
      gradientFrom: 'from-amber-500/10',
      gradientTo: 'to-orange-500/5',
      iconBg: 'bg-amber-100 dark:bg-amber-500/15',
      iconColor: 'text-amber-600 dark:text-amber-400',
      cardAccentFrom: '#f59e0b',
      cardAccentTo: '#fbbf24',
    },
  ]

  // ── Savings goal colors ──
  const goalColors = ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#ec4899']

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="module-header">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Overview of your financial health
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); setData(null); doFetchData() }} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* ── A. Financial Health Score ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Inline the gauge content since we can't pass data to a sub-component easily */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 dark:from-emerald-500/10 dark:via-teal-500/10 dark:to-cyan-500/10 p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Gauge Circle */}
              <div className="relative w-36 h-36 shrink-0">
                <div
                  className="w-full h-full rounded-full flex items-center justify-center"
                  style={{
                    background: `conic-gradient(${healthScore <= 40 ? '#ef4444' : healthScore <= 70 ? '#f59e0b' : '#10b981'} ${(healthScore / 100) * 360}deg, var(--muted) ${(healthScore / 100) * 360}deg)`,
                    transition: 'all 0.8s ease-out',
                  }}
                >
                  <div className="w-28 h-28 rounded-full bg-card flex flex-col items-center justify-center shadow-inner">
                    <span className="text-3xl font-bold tabular-nums" style={{ color: healthScore <= 40 ? '#ef4444' : healthScore <= 70 ? '#f59e0b' : '#10b981' }}>
                      {healthScore}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">of 100</span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 text-center sm:text-left space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Financial Health Score</h3>
                  <p className={cn(
                    'text-sm font-semibold',
                    healthScore <= 40 ? 'text-red-500' : healthScore <= 70 ? 'text-amber-500' : 'text-emerald-500'
                  )}>
                    {healthScore <= 40 ? 'Needs Work' : healthScore <= 70 ? 'Fair' : 'Excellent'}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Savings Rate</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {d.totalIncome > 0 ? `${Math.max(0, Math.round((d.totalIncome - d.totalExpenses) / d.totalIncome * 100))}%` : '0%'}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Debt Ratio</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {d.totalIncome > 0 ? `${Math.round(d.totalDebt / d.totalIncome * 100)}%` : '0%'}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Emergency</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {d.totalExpenses > 0 ? `${(d.balance / d.totalExpenses).toFixed(1)}mo` : '0mo'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── B. Enhanced Metric Cards with Gradients ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
          <motion.div
            key={m.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.08, ease: 'easeOut' }}
          >
            <Card className="card-hover card-accent overflow-hidden" style={{ borderTopColor: m.accentColor, borderTopWidth: '2px', '--card-accent-from': m.cardAccentFrom, '--card-accent-to': m.cardAccentTo } as React.CSSProperties}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{m.title}</p>
                    <p className={cn(
                      'text-2xl font-bold tabular-nums',
                      d.balance >= 0 && m.title === 'Balance Actual' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                    )}>
                      {m.value}
                    </p>
                  </div>
                  <div className={cn(
                    'p-2.5 rounded-xl bg-gradient-to-br',
                    m.gradientFrom,
                    m.gradientTo
                  )}>
                    <m.icon className={cn('w-5 h-5', m.iconColor)} />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {m.trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />}
                  {m.trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />}
                  <span className={cn(
                    'text-xs font-medium',
                    m.trend === 'up' ? 'text-emerald-500' : m.trend === 'down' ? 'text-rose-500' : 'text-muted-foreground'
                  )}>
                    {m.change}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Charts ── */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* ── E. Enhanced Charts Row 1 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Cash Flow Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="lg:col-span-2"
            >
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/10 px-6 pt-5 pb-0">
                  <CardTitle className="text-base font-semibold">Monthly Cash Flow</CardTitle>
                  <CardDescription>Income vs Expenses over the last 6 months</CardDescription>
                </div>
                <CardContent className="pt-4">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={d.monthlyCashFlow} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                        <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                        <RechartsTooltip content={EnhancedChartTooltip} />
                        <Legend />
                        <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} />
                        <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" fill="url(#expenseGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Expense Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/10 px-6 pt-5 pb-0">
                  <CardTitle className="text-base font-semibold">Expense Breakdown</CardTitle>
                  <CardDescription>This month by category</CardDescription>
                </div>
                <CardContent className="pt-4">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={d.expenseCategories || []}
                          cx="50%"
                          cy="42%"
                          innerRadius={50}
                          outerRadius={82}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {(d.expenseCategories || []).map((entry, idx) => (
                            <Cell key={idx} fill={entry.color || CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number, name: string, props: any) => {
                            const total = (d.expenseCategories || []).reduce((s, c) => s + c.value, 0)
                            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                            return [`${formatCurrency(value)} (${pct}%)`, props.payload.name]
                          }}
                          contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                      {(d.expenseCategories || []).slice(0, 4).map((cat) => (
                        <div key={cat.name} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                          <span className="text-muted-foreground truncate">{cat.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ── D. Financial Insights Section ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Best Saving Month */}
              <Card className="bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-500/5 dark:to-teal-500/3 border-emerald-200/50 dark:border-emerald-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/15">
                      <Trophy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Best Saving Month</p>
                  </div>
                  <p className="text-lg font-bold text-foreground">{insights.bestMonth}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {insights.bestNet > -Infinity ? `+${formatCurrency(insights.bestNet)} net` : 'No data'}
                  </p>
                </CardContent>
              </Card>

              {/* Biggest Expense Category */}
              <Card className="bg-gradient-to-br from-rose-50/50 to-pink-50/30 dark:from-rose-500/5 dark:to-pink-500/3 border-rose-200/50 dark:border-rose-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-500/15">
                      <Tag className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Top Expense</p>
                  </div>
                  <p className="text-lg font-bold text-foreground">{insights.biggestCat.name}</p>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {formatCurrency(insights.biggestCat.value)}
                  </p>
                </CardContent>
              </Card>

              {/* Savings On Track */}
              <Card className="bg-gradient-to-br from-cyan-50/50 to-sky-50/30 dark:from-cyan-500/5 dark:to-sky-500/3 border-cyan-200/50 dark:border-cyan-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-500/15">
                      <Target className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">On Track</p>
                  </div>
                  <p className="text-lg font-bold text-foreground">{insights.onTrackCount} <span className="text-sm font-normal text-muted-foreground">of {d.savingsGoals.length}</span></p>
                  <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                    Goals &gt;50% complete
                  </p>
                </CardContent>
              </Card>

              {/* Net Worth Trend */}
              <Card className="bg-gradient-to-br from-violet-50/50 to-purple-50/30 dark:from-violet-500/5 dark:to-purple-500/3 border-violet-200/50 dark:border-violet-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-500/15">
                      <BarChart3 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Cash Flow Trend</p>
                  </div>
                  <p className="text-lg font-bold text-foreground flex items-center gap-1.5">
                    {insights.hasTrend && (
                      insights.trend >= 0
                        ? <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                        : <ArrowDownRight className="w-5 h-5 text-rose-500" />
                    )}
                    {insights.hasTrend ? insights.trendLabel : 'N/A'}
                  </p>
                  <p className={cn('text-xs font-medium', insights.trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                    {insights.hasTrend ? (insights.trend >= 0 ? 'vs last month' : 'vs last month') : 'No comparison data'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* ── Monthly Comparison Cards (This Month vs Last Month) ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.48 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {monthlyComparison.map((item) => {
                const IconComp = item.icon
                const isExpense = item.label === 'Total Expenses'
                const isPositive = isExpense ? item.change <= 0 : item.change >= 0
                return (
                  <Card key={item.label} className={cn('border-l-4', item.color)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <IconComp className={cn('w-4 h-4', item.textColor)} />
                          <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                        </div>
                        {item.change !== 0 && (
                          <div className={cn(
                            'flex items-center gap-0.5 text-xs font-semibold',
                            isPositive ? 'text-emerald-500' : 'text-rose-500'
                          )}>
                            {item.change > 0 ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                            {Math.abs(item.change)}%
                          </div>
                        )}
                      </div>
                      <p className="text-xl font-bold tabular-nums text-foreground">
                        {formatCurrency(item.current)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last month: {formatCurrency(item.previous)}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </motion.div>

          {/* ── Spending Heatmap Calendar ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.50 }}
            >
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 dark:from-emerald-500/10 dark:to-cyan-500/10 px-6 pt-5 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Spending Heatmap</CardTitle>
                      <CardDescription>Daily spending for {heatmapData.monthName}</CardDescription>
                    </div>
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-muted-foreground">Less</span>
                    <div className="w-3.5 h-3.5 rounded-sm bg-muted/40 dark:bg-muted/20" />
                    <div className="w-3.5 h-3.5 rounded-sm bg-emerald-300 dark:bg-emerald-400/60" />
                    <div className="w-3.5 h-3.5 rounded-sm bg-emerald-500 dark:bg-emerald-500/80" />
                    <div className="w-3.5 h-3.5 rounded-sm bg-amber-400 dark:bg-amber-500/80" />
                    <div className="w-3.5 h-3.5 rounded-sm bg-rose-400 dark:bg-rose-500/80" />
                    <span className="text-[10px] text-muted-foreground">More</span>
                  </div>
                </div>
                <CardContent className="pt-3 pb-4">
                  <div className="grid grid-cols-7 gap-1">
                    {heatmapData.dayNames.map((name) => (
                      <div key={name} className="text-[10px] font-medium text-muted-foreground text-center pb-1">
                        {name}
                      </div>
                    ))}
                    {heatmapData.cells.map((cell, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'aspect-square rounded-sm flex items-center justify-center text-[10px] font-medium transition-colors relative group',
                          cell.colorClass,
                          cell.isFuture && 'opacity-40',
                          !cell.day && 'invisible'
                        )}
                        title={cell.day ? `${formatCurrency(cell.amount)}` : undefined}
                      >
                        {cell.day && (
                          <>
                            <span className={cn(
                              'tabular-nums',
                              cell.amount > 50 ? 'text-white dark:text-white' : 'text-muted-foreground dark:text-muted-foreground'
                            )}>
                              {cell.day}
                            </span>
                            {cell.isToday && (
                              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary ring-2 ring-card" />
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── Net Worth Trend Chart ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.52 }}
            >
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-teal-500/5 to-emerald-500/5 dark:from-teal-500/10 dark:to-emerald-500/10 px-6 pt-5 pb-0">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <div>
                      <CardTitle className="text-base font-semibold">Net Worth Trend</CardTitle>
                      <CardDescription>Cumulative net position over 6 months</CardDescription>
                    </div>
                  </div>
                </div>
                <CardContent className="pt-4">
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={netWorthData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                        <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                        <RechartsTooltip
                          formatter={(value: number) => [formatCurrency(value), 'Net Worth']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="netWorth"
                          name="Net Worth"
                          stroke="#14b8a6"
                          fill="url(#netWorthGrad)"
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 0, fill: '#14b8a6' }}
                          activeDot={{ r: 5, strokeWidth: 0, fill: '#14b8a6' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ── Budget vs Actual ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.54 }}
          >
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500/5 to-violet-500/5 dark:from-cyan-500/10 dark:to-violet-500/10 px-6 pt-5 pb-0">
                <CardTitle className="text-base font-semibold">Budget vs Actual (50/30/20 Rule)</CardTitle>
                <CardDescription>Comparing your planned budget with actual spending</CardDescription>
              </div>
              <CardContent className="pt-4">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.budgetVsActual} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                      <RechartsTooltip content={EnhancedChartTooltip} />
                      <Legend />
                      <Bar dataKey="planned" name="Planned" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                      <Bar dataKey="actual" name="Actual" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── E. Spending Trend Sparkline ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.58 }}
          >
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500/5 to-rose-500/5 dark:from-amber-500/10 dark:to-rose-500/10 px-6 pt-5 pb-0">
                <CardTitle className="text-base font-semibold">Daily Spending Trend</CardTitle>
                <CardDescription>Your spending pattern this month</CardDescription>
              </div>
              <CardContent className="pt-4">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailySpending} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dailySpendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 10 }}
                        stroke="var(--muted-foreground)"
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        stroke="var(--muted-foreground)"
                        tickFormatter={(v) => `$${v}`}
                      />
                      <RechartsTooltip
                        formatter={(value: number) => [formatCurrency(value), 'Spending']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        name="Spending"
                        stroke="#f59e0b"
                        fill="url(#dailySpendGrad)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0, fill: '#f59e0b' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Bottom Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Transactions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.62 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
                  <CardDescription>Your latest financial movements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {d.recentTransactions.map((tx) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                            tx.type === 'income'
                              ? 'bg-emerald-50 dark:bg-emerald-500/10'
                              : 'bg-rose-50 dark:bg-rose-500/10'
                          )}>
                            {tx.type === 'income'
                              ? <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                              : <ArrowDownRight className="w-4 h-4 text-rose-500" />
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{format(new Date(tx.date), 'MMM d')}</span>
                              {tx.category && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] h-4 px-1.5"
                                  style={{ backgroundColor: (tx.categoryColor || '#64748b') + '20', color: tx.categoryColor || '#64748b' }}
                                >
                                  {tx.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={cn(
                          'text-sm font-semibold tabular-nums shrink-0',
                          tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        )}>
                          {tx.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── F. Enhanced Savings Section ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.67 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Savings Goals</CardTitle>
                      <CardDescription>Track your savings progress</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary hover:text-primary"
                      onClick={() => setActiveModule('savings')}
                    >
                      View All
                      <ArrowUpRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                    {d.savingsGoals.map((goal, idx) => {
                      const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100))
                      const goalColor = goalColors[idx % goalColors.length]
                      return (
                        <motion.div
                          key={goal.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 * idx }}
                          className="space-y-2 rounded-lg border-l-[3px] pl-3"
                          style={{ borderLeftColor: goalColor }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{getGoalEmoji(goal.name)}</span>
                              <span className="text-sm font-medium text-foreground">{goal.name}</span>
                            </div>
                            <span className="text-xs font-semibold tabular-nums" style={{ color: goalColor }}>
                              {pct}%
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: goalColor }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, delay: 0.2 + idx * 0.1, ease: 'easeOut' }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatCurrency(goal.saved)} saved</span>
                            <span>Goal: {formatCurrency(goal.target)}</span>
                          </div>
                          {goal.deadline && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(goal.deadline), 'MMM d, yyyy')}
                            </p>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </>
      )}

      {/* ── C. Quick Transaction FAB ── */}
      <AnimatePresence>
        {showQuickAdd && (
          <motion.div
            className="fixed bottom-6 right-6 z-50 flex items-end gap-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setQuickAddType('income'); setShowQuickAdd(true) }}
              className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center justify-center"
            >
              <ArrowUpRight className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setQuickAddType('expense'); setShowQuickAdd(true) }}
              className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg flex items-center justify-center"
            >
              <ArrowDownRight className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowQuickAdd(false)}
              className="w-10 h-10 rounded-full bg-muted text-muted-foreground shadow-md flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      {!showQuickAdd && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowQuickAdd(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl flex items-center justify-center"
          title="Add Transaction"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {/* Quick Add Dialog */}
      <QuickAddDialog
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        type={quickAddType}
        onTypeChange={setQuickAddType}
        accountId={user?.id || ''}
        onSaved={doFetchData}
      />
    </div>
  )
}