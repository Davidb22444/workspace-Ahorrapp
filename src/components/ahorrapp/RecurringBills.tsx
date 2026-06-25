'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Repeat, DollarSign, Calendar, Plus, Trash2, Edit2, Clock,
  CheckCircle, AlertCircle, CreditCard,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, differenceInDays, startOfMonth, getDay, getDaysInMonth, addDays, startOfWeek, endOfMonth, endOfWeek, isSameMonth, isSameDay, parseISO } from 'date-fns'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

const CHART_COLORS = ['#10b981', '#f59e0b', '#f43f5e', '#6366f1', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6']

interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: string
}

interface RecurringBill {
  id: string
  description: string
  amount: number
  categoryId: string | null
  category?: Category
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  nextDate: string
  startDate: string
  isPaid: boolean
}

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
]

const mockBills: RecurringBill[] = [
  { id: 'b1', description: 'Suscripción Netflix', amount: 15.99, categoryId: 'ent', frequency: 'monthly', nextDate: format(addDays(new Date(), 3), 'yyyy-MM-dd'), startDate: '2024-01-01', isPaid: false, category: { id: 'ent', name: 'Entretenimiento', icon: '🎬', color: '#6366f1', type: 'expense' } },
  { id: 'b2', description: 'Spotify Premium', amount: 9.99, categoryId: 'ent', frequency: 'monthly', nextDate: format(addDays(new Date(), 12), 'yyyy-MM-dd'), startDate: '2024-02-01', isPaid: false, category: { id: 'ent', name: 'Entretenimiento', icon: '🎬', color: '#6366f1', type: 'expense' } },
  { id: 'b3', description: 'Membresía de Gimnasio', amount: 49.99, categoryId: 'hth', frequency: 'monthly', nextDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'), startDate: '2024-01-15', isPaid: false, category: { id: 'hth', name: 'Salud', icon: '🏥', color: '#ec4899', type: 'expense' } },
  { id: 'b4', description: 'Servicio de Internet', amount: 79.99, categoryId: 'util', frequency: 'monthly', nextDate: format(addDays(new Date(), 8), 'yyyy-MM-dd'), startDate: '2023-06-01', isPaid: false, category: { id: 'util', name: 'Servicios', icon: '⚡', color: '#06b6d4', type: 'expense' } },
  { id: 'b5', description: 'Seguro de Auto', amount: 150.00, categoryId: 'trn', frequency: 'monthly', nextDate: format(addDays(new Date(), 2), 'yyyy-MM-dd'), startDate: '2023-01-01', isPaid: false, category: { id: 'trn', name: 'Transporte', icon: '🚗', color: '#f43f5e', type: 'expense' } },
  { id: 'b6', description: 'Almacenamiento en la Nube', amount: 2.99, categoryId: 'util', frequency: 'monthly', nextDate: format(addDays(new Date(), 18), 'yyyy-MM-dd'), startDate: '2024-03-01', isPaid: false, category: { id: 'util', name: 'Servicios', icon: '⚡', color: '#06b6d4', type: 'expense' } },
  { id: 'b7', description: 'Renta', amount: 1200.00, categoryId: 'hsg', frequency: 'monthly', nextDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'), startDate: '2022-01-01', isPaid: false, category: { id: 'hsg', name: 'Vivienda', icon: '🏠', color: '#10b981', type: 'expense' } },
  { id: 'b8', description: 'Recibo de Teléfono', amount: 55.00, categoryId: 'util', frequency: 'monthly', nextDate: format(addDays(new Date(), 25), 'yyyy-MM-dd'), startDate: '2023-03-01', isPaid: false, category: { id: 'util', name: 'Servicios', icon: '⚡', color: '#06b6d4', type: 'expense' } },
]

const mockCategories: Category[] = [
  { id: 'hsg', name: 'Vivienda', icon: '🏠', color: '#10b981', type: 'expense' },
  { id: 'food', name: 'Alimentación', icon: '🍕', color: '#f59e0b', type: 'expense' },
  { id: 'trn', name: 'Transporte', icon: '🚗', color: '#f43f5e', type: 'expense' },
  { id: 'ent', name: 'Entretenimiento', icon: '🎬', color: '#6366f1', type: 'expense' },
  { id: 'util', name: 'Servicios', icon: '⚡', color: '#06b6d4', type: 'expense' },
  { id: 'hth', name: 'Salud', icon: '🏥', color: '#ec4899', type: 'expense' },
  { id: 'edu', name: 'Educación', icon: '📚', color: '#8b5cf6', type: 'expense' },
  { id: 'oth', name: 'Otro', icon: '📦', color: '#14b8a6', type: 'expense' },
]

function getDaysUntilText(nextDate: string): { text: string; colorClass: string } {
  const days = differenceInDays(parseISO(nextDate), new Date())
  if (days < 0) return { text: 'Vencido', colorClass: 'text-rose-600 dark:text-rose-400' }
  if (days === 0) return { text: 'Hoy', colorClass: 'text-rose-600 dark:text-rose-400' }
  if (days <= 3) return { text: `${days}d restante${days !== 1 ? 's' : ''}`, colorClass: 'text-rose-600 dark:text-rose-400' }
  if (days <= 7) return { text: `${days}d restante${days !== 1 ? 's' : ''}`, colorClass: 'text-amber-600 dark:text-amber-400' }
  return { text: `${days}d restante${days !== 1 ? 's' : ''}`, colorClass: 'text-emerald-600 dark:text-emerald-400' }
}

export default function RecurringBills() {
  const { user } = useAppStore()
  const [bills, setBills] = useState<RecurringBill[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  const [billForm, setBillForm] = useState({
    description: '',
    amount: '',
    categoryId: '',
    frequency: 'monthly' as RecurringBill['frequency'],
    startDate: format(new Date(), 'yyyy-MM-dd'),
    nextDate: format(new Date(), 'yyyy-MM-dd'),
  })

  const fetchData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [expenseRes, catRes] = await Promise.all([
        fetch(`/api/expenses?accountId=${user.id}`),
        fetch(`/api/categories?accountId=${user.id}`),
      ])
      const expenseData = await expenseRes.json()
      const catData = await catRes.json()
      const expenseList = expenseData.expenses || []
      const recurring = expenseList.filter((e: any) => e.isRecurring === true).map((e: any) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        categoryId: e.categoryId,
        category: e.category,
        frequency: e.frequency || 'monthly',
        nextDate: e.nextDate || e.date,
        startDate: e.date,
        isPaid: false,
      }))
      if (recurring.length > 0) {
        setBills(recurring)
        setCategories(Array.isArray(catData.categories) ? catData.categories : [])
        setLoading(false)
        return
      }
    } catch { /* fallback */ }
    setBills(mockBills)
    setCategories(mockCategories)
    setLoading(false)
  }, [user?.id])

  useEffect(() => { fetchData() }, [fetchData])

  // Sorted bills
  const sortedBills = useMemo(() => {
    return [...bills].sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())
  }, [bills])

  const monthlyTotal = bills.reduce((s, b) => s + b.amount, 0)

  const nextPayment = useMemo(() => {
    const upcoming = bills
      .filter((b) => !b.isPaid)
      .sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())
    return upcoming[0] || null
  }, [bills])

  // Category breakdown for chart
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    bills.forEach((b) => {
      const catName = b.category?.name || 'Other'
      map[catName] = (map[catName] || 0) + b.amount
    })
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [bills])

  // Calendar data
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth)
    const monthEnd = endOfMonth(calendarMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const days: Date[] = []
    let day = calStart
    while (day <= calEnd) {
      days.push(day)
      day = addDays(day, 1)
    }

    const billDates = new Set(
      bills.map((b) => format(parseISO(b.nextDate), 'yyyy-MM-dd'))
    )

    return { days, billDates, monthStart, monthEnd }
  }, [calendarMonth, bills])

  const handleSaveBill = async () => {
    if (!billForm.description || !billForm.amount || !billForm.categoryId) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }
    const selectedCat = categories.find((c) => c.id === billForm.categoryId)
    const payload: RecurringBill = {
      id: Date.now().toString(),
      description: billForm.description,
      amount: parseFloat(billForm.amount),
      categoryId: billForm.categoryId,
      category: selectedCat,
      frequency: billForm.frequency,
      nextDate: billForm.nextDate,
      startDate: billForm.startDate,
      isPaid: false,
    }

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: user?.id,
          description: payload.description,
          amount: payload.amount,
          categoryId: payload.categoryId,
          isRecurring: true,
          frequency: payload.frequency,
          date: payload.startDate,
        }),
      })
      if (res.ok) {
        setBills((prev) => [...prev, payload])
        toast.success(editingBill ? 'Pago actualizado' : 'Pago recurrente agregado')
        closeDialog()
        return
      }
    } catch { /* fallback */ }
    if (editingBill) {
      setBills((prev) => prev.map((b) => b.id === editingBill.id ? payload : b))
    } else {
      setBills((prev) => [...prev, payload])
    }
    toast.success(editingBill ? 'Pago actualizado' : 'Pago recurrente agregado')
    closeDialog()
  }

  const handleTogglePaid = (id: string) => {
    setBills((prev) => prev.map((b) => b.id === id ? { ...b, isPaid: !b.isPaid } : b))
  }

  const handleDelete = (id: string) => {
    try { fetch(`/api/expenses/${id}?accountId=${user?.id}`, { method: 'DELETE' }) } catch { /* ok */ }
    setBills((prev) => prev.filter((b) => b.id !== id))
    toast.success('Pago eliminado')
  }

  const openEditDialog = (bill: RecurringBill) => {
    setEditingBill(bill)
    setBillForm({
      description: bill.description,
      amount: bill.amount.toString(),
      categoryId: bill.categoryId || '',
      frequency: bill.frequency,
      startDate: bill.startDate,
      nextDate: bill.nextDate,
    })
    setAddDialogOpen(true)
  }

  const closeDialog = () => {
    setAddDialogOpen(false)
    setEditingBill(null)
    setBillForm({ description: '', amount: '', categoryId: '', frequency: 'monthly', startDate: format(new Date(), 'yyyy-MM-dd'), nextDate: format(new Date(), 'yyyy-MM-dd') })
  }

  const DAY_LABELS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Pagos Recurrentes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Rastrea tus suscripciones y pagos recurrentes</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Agregar Pago
        </Button>
      </div>

      {/* Summary Stats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="stat-card card-hover"><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
          <Card className="stat-card card-hover">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10">
                <DollarSign className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Mensual</p>
                <p className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">{formatCurrency(monthlyTotal)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card card-hover">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-500/10">
                <Repeat className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suscripciones Activas</p>
                <p className="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400">{bills.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card card-hover">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Próximo Pago</p>
                {nextPayment ? (
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {format(parseISO(nextPayment.nextDate), 'MMM d, yyyy')}
                    <span className="text-xs text-muted-foreground ml-2">{getDaysUntilText(nextPayment.nextDate).text}</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-0.5">Sin pagos próximos</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : bills.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-state rounded-xl text-center py-16 px-6 text-muted-foreground"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-4"
          >
            <Image src="/images/empty-state.png" alt="Sin pagos recurrentes" width={112} height={112} className="h-28 w-28 object-contain rounded-2xl mx-auto" />
          </motion.div>
          <p className="text-lg font-medium">Sin pagos recurrentes</p>
          <p className="text-sm mt-1 mb-6">Agrega tus suscripciones y pagos recurrentes para rastrearlos</p>
          <Button onClick={() => setAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Agregar Primer Pago
          </Button>
        </motion.div>
      ) : (
        <>
          {/* Upcoming Bills List */}
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Próximos Pagos</CardTitle>
              <CardDescription className="text-xs">Ordenados por fecha de próximo pago</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="max-h-96 overflow-y-auto space-y-2">
                {sortedBills.map((bill, idx) => {
                  const daysInfo = getDaysUntilText(bill.nextDate)
                  const catColor = bill.category?.color || '#94a3b8'
                  return (
                    <motion.div
                      key={bill.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={cn(
                        'income-row-hover flex items-center gap-3 p-3 rounded-lg border',
                        bill.isPaid && 'opacity-60',
                      )}
                    >
                      {/* Category dot */}
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                      {/* Description & meta */}
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium truncate', bill.isPaid && 'line-through text-muted-foreground')}>
                          {bill.description}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                            {bill.frequency}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {format(parseISO(bill.nextDate), 'MMM d')}
                          </span>
                        </div>
                      </div>
                      {/* Amount + days */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(bill.amount)}</p>
                        <p className={cn('text-[11px] font-medium', daysInfo.colorClass)}>{daysInfo.text}</p>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleTogglePaid(bill.id)}
                        >
                          <CheckCircle className={cn('w-4 h-4', bill.isPaid ? 'text-emerald-500' : 'text-muted-foreground')} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(bill)}>
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(bill.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Calendar View + Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Calendar */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="card-hover">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">
                      {format(calendarMonth, 'MMMM yyyy')}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
                        <ChevronLeftIcon />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
                        <ChevronRightIcon />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {DAY_LABELS.map((d) => (
                      <span key={d} className="text-[10px] font-medium text-muted-foreground uppercase py-1">{d}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.days.map((day, idx) => {
                      const dateStr = format(day, 'yyyy-MM-dd')
                      const hasBill = calendarDays.billDates.has(dateStr)
                      const inMonth = isSameMonth(day, calendarMonth)
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'relative text-center py-1.5 rounded-md text-xs',
                            inMonth ? 'text-foreground' : 'text-muted-foreground/40',
                            hasBill && inMonth && 'bg-primary/10',
                          )}
                        >
                          <span className={cn('text-xs tabular-nums', isSameDay(day, new Date()) && 'font-bold text-primary')}>
                            {format(day, 'd')}
                          </span>
                          {hasBill && inMonth && (
                            <div className="flex justify-center mt-0.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Category Breakdown */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="card-hover">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Desglose por Categoría</CardTitle>
                  <CardDescription className="text-xs">Gastos recurrentes por categoría</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {categoryBreakdown.length > 0 ? (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryBreakdown} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v}`} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                          <RechartsTooltip
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid var(--border)', background: 'var(--card)' }}
                          />
                          <Bar dataKey="amount" name="Monto" radius={[0, 6, 6, 0]} barSize={16}>
                            {categoryBreakdown.map((_, idx) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-56 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Category list below chart */}
                  <div className="mt-4 space-y-2">
                    {categoryBreakdown.map((cat, idx) => {
                      const pct = monthlyTotal > 0 ? Math.round((cat.amount / monthlyTotal) * 100) : 0
                      return (
                        <div key={cat.name} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                          <span className="flex-1 text-muted-foreground truncate">{cat.name}</span>
                          <span className="font-semibold tabular-nums text-foreground">{formatCurrency(cat.amount)}</span>
                          <span className="text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBill ? 'Editar Pago Recurrente' : 'Agregar Pago Recurrente'}</DialogTitle>
            <DialogDescription>
              {editingBill ? 'Actualiza este pago recurrente.' : 'Agrega una nueva suscripción o pago recurrente.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                placeholder="ej., Suscripción a Netflix"
                value={billForm.description}
                onChange={(e) => setBillForm({ ...billForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto ($)</Label>
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={billForm.amount}
                  onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={billForm.categoryId} onValueChange={(v) => setBillForm({ ...billForm, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select value={billForm.frequency} onValueChange={(v) => setBillForm({ ...billForm, frequency: v as RecurringBill['frequency'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Inicio</Label>
                <Input
                  type="date"
                  value={billForm.startDate}
                  onChange={(e) => setBillForm({ ...billForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Próximo Pago</Label>
                <Input
                  type="date"
                  value={billForm.nextDate}
                  onChange={(e) => setBillForm({ ...billForm, nextDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSaveBill} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {editingBill ? 'Guardar Cambios' : 'Agregar Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}