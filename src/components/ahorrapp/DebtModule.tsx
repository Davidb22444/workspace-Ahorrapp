'use client'

import { useState, useEffect } from 'react'

import { Plus, CreditCard, Trash2, DollarSign, Calendar, Percent, ChevronDown, ChevronUp, History, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AmountInput } from '@/components/ui/amount-input'
import { Loading } from '@/components/ui/loading'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { useFormatCurrency } from '@/lib/format-currency'

interface Payment {
  id: string
  amount: number
  date: string
  note?: string
}

interface Debt {
  id: string
  name: string
  totalAmount: number
  paidAmount: number
  interestRate: number
  type: string
  installments: number
  dueDate?: string
  nextPayment?: string
  status: 'pending' | 'paid' | 'overdue'
  payments?: Payment[]
}

const DEBT_TYPES = ['installment', 'revolving', 'mortgage', 'student', 'other']

function getStatusInfo(status: string) {
  switch (status) {
    case 'paid':
      return {
        dotColor: 'bg-emerald-500',
        badgeClass: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        label: 'Pagado',
        dotGlow: 'shadow-emerald-500/40',
      }
    case 'overdue':
      return {
        dotColor: 'bg-rose-500',
        badgeClass: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        label: 'Vencido',
        dotGlow: 'shadow-rose-500/40',
      }
    default:
      return {
        dotColor: 'bg-amber-500',
        badgeClass: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        label: 'En Progreso',
        dotGlow: 'shadow-amber-500/40',
      }
  }
}

export default function DebtModule() {
  const formatCurrency = useFormatCurrency()
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAppStore()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [debtForm, setDebtForm] = useState({
    name: '', totalAmount: '', interestRate: '', type: 'installment', installments: '', dueDate: '',
  })

  const [paymentForm, setPaymentForm] = useState({ amount: '', note: '' })

  useEffect(() => {
    let cancelled = false
    const doFetch = async () => {
      try {
        const res = await fetch(`/api/debts?accountId=${user?.id}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setDebts(data.debts || data || [])
          setLoading(false)
          return
        }
      } catch { /* fallback */ }
      if (!cancelled) { setDebts([]); setLoading(false) }
    }
    doFetch()
    return () => { cancelled = true }
  }, [user?.id])

  const handleAddDebt = async () => {
    if (!debtForm.name || !debtForm.totalAmount) { toast.error('Por favor completa nombre y monto total'); return }
    const payload = {
      ...debtForm,
      totalAmount: parseFloat(debtForm.totalAmount),
      interestRate: parseFloat(debtForm.interestRate) || 0,
      installments: parseInt(debtForm.installments) || 0,
      paidAmount: 0,
      status: 'pending' as const,
    }
    try {
      const res = await fetch('/api/debts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, accountId: user?.id }) })
      if (res.ok) {
        setDebts((prev) => [...prev, { ...payload, id: Date.now().toString(), payments: [] }])
        toast.success('Deuda agregada')
        setAddDialogOpen(false)
        setDebtForm({ name: '', totalAmount: '', interestRate: '', type: 'installment', installments: '', dueDate: '' })
        return
      } else {
        toast.error('Error al guardar en el servidor')
        return
      }
    } catch { /* network error - use local fallback */ }
    setDebts((prev) => [...prev, { ...payload, id: Date.now().toString(), payments: [] }])
    toast.warning('Guardado localmente (sin conexión)')
    setAddDialogOpen(false)
    setDebtForm({ name: '', totalAmount: '', interestRate: '', type: 'installment', installments: '', dueDate: '' })
  }

  const handleRecordPayment = async () => {
    if (!paymentForm.amount || !selectedDebt) { toast.error('Por favor ingresa un monto'); return }
    const amount = parseFloat(paymentForm.amount)
    const payment: Payment = { id: Date.now().toString(), amount, date: format(new Date(), 'yyyy-MM-dd'), note: paymentForm.note || undefined }

    try {
      const res = await fetch(`/api/debts/${selectedDebt.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payment, accountId: user?.id }),
      })
      if (res.ok) {
        const newPaid = selectedDebt.paidAmount + amount
        setDebts((prev) => prev.map((d) =>
          d.id === selectedDebt.id
            ? { ...d, paidAmount: newPaid, status: newPaid >= d.totalAmount ? 'paid' as const : 'pending' as const, payments: [payment, ...(d.payments || [])] }
            : d
        ))
        toast.success(`Pago de ${formatCurrency(amount)} registrado`)
        setPaymentDialogOpen(false)
        setPaymentForm({ amount: '', note: '' })
        return
      } else {
        toast.error('Error al guardar en el servidor')
        return
      }
    } catch { /* network error - use local fallback */ }
    const newPaid = selectedDebt.paidAmount + amount
    setDebts((prev) => prev.map((d) =>
      d.id === selectedDebt.id
        ? { ...d, paidAmount: newPaid, status: newPaid >= d.totalAmount ? 'paid' as const : 'pending' as const, payments: [payment, ...(d.payments || [])] }
        : d
    ))
    toast.warning(`Pago guardado localmente (sin conexión)`)
    setPaymentDialogOpen(false)
    setPaymentForm({ amount: '', note: '' })
  }

  const handleDelete = async (id: string) => {
    try { const res = await fetch(`/api/debts/${id}?accountId=${user?.id}`, { method: 'DELETE' }); if (!res.ok) { toast.error('Error al eliminar en el servidor'); return } } catch { /* network error */ }
    setDebts((prev) => prev.filter((d) => d.id !== id))
    toast.success('Deuda eliminada')
  }

  const totalOwed = debts.reduce((sum, d) => sum + d.totalAmount, 0)
  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0)

  // Calculate last month's payments
  const lastMonth = new Date()
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  const monthlyPayments = debts.reduce((sum, d) => {
    const lastMonthPayments = (d.payments || []).filter((p) => {
      const pDate = new Date(p.date)
      return pDate.getMonth() === lastMonth.getMonth() && pDate.getFullYear() === lastMonth.getFullYear()
    })
    return sum + lastMonthPayments.reduce((s, p) => s + p.amount, 0)
  }, 0)

  const activeDebts = debts.filter((d) => d.status !== 'paid')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 module-header">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gradient">Deudas</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Rastrea y gestiona tus deudas</p>
          </div>
          <span className="text-6xl hidden sm:inline-block">💳</span>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Agregar Deuda
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="stat-card card-hover card-accent" style={{ '--card-accent-from': '#f59e0b', '--card-accent-to': '#fbbf24' } as React.CSSProperties}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10">
              <CreditCard className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Devido</p>
              <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{formatCurrency(totalOwed)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card card-hover card-accent" style={{ '--card-accent-from': '#10b981', '--card-accent-to': '#34d399' } as React.CSSProperties}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Pagado</p>
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPaid)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card card-hover card-accent" style={{ '--card-accent-from': '#06b6d4', '--card-accent-to': '#22d3ee' } as React.CSSProperties}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-500/10">
              <Clock className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pagos Mensuales</p>
              <p className="text-2xl font-bold tabular-nums text-cyan-600 dark:text-cyan-400">{formatCurrency(monthlyPayments)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debt Cards */}
      {loading ? (
        <Loading />
      ) : debts.length === 0 ? (
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
            <span className="text-6xl mb-2 inline-block">📭</span>
          </motion.div>
          <p className="text-lg font-medium">Sin deudas registradas</p>
          <p className="text-sm mt-1">Agrega tu primera deuda para comenzar a rastrear</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {debts.map((debt, idx) => {
            const pct = Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100))
            const isExpanded = expandedId === debt.id
            const remaining = debt.totalAmount - debt.paidAmount
            const statusInfo = getStatusInfo(debt.status)

            return (
              <motion.div key={debt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card className="card-hover overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                            <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ${statusInfo.dotColor} shadow-lg ${statusInfo.dotGlow}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{debt.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className={statusInfo.badgeClass}>
                              {statusInfo.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground capitalize">{debt.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {debt.status !== 'paid' && (
                            <p className="text-lg font-bold tabular-nums text-foreground">
                              {formatCurrency(remaining)}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Percent className="w-3 h-3" /> {debt.interestRate}%
                            </span>
                            {debt.nextPayment && debt.status !== 'paid' && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {format(new Date(debt.nextPayment), 'MMM d', { locale: es })}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setExpandedId(isExpanded ? null : debt.id)}>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {debt.status === 'paid' ? (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Completamente Pagado
                            </span>
                          ) : (
                            <>Pagado: {formatCurrency(debt.paidAmount)} de {formatCurrency(debt.totalAmount)}</>
                          )}
                        </span>
                        <span className="font-semibold tabular-nums">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-2.5" />
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-border"
                        >
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground h-8"
                              onClick={() => { setSelectedDebt(debt); setPaymentDialogOpen(true) }}
                              disabled={debt.status === 'paid'}
                            >
                              <DollarSign className="w-3.5 h-3.5 mr-1" /> Registrar Pago
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(debt.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          {debt.payments && debt.payments.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <History className="w-3 h-3" /> Línea de Tiempo de Pagos
                              </p>
                              <div className="max-h-48 overflow-y-auto pl-4 relative">
                                <div className="absolute left-[7px] top-2 bottom-2 w-px border-l-2 border-dashed border-border" />
                                <div className="space-y-3">
                                  {debt.payments.slice(0, 8).map((p, pIdx) => (
                                    <motion.div
                                      key={p.id}
                                      initial={{ opacity: 0, x: -8 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: pIdx * 0.05 }}
                                      className="relative flex items-start gap-3"
                                    >
                                      <div className="absolute -left-[13px] top-2 w-3 h-3 rounded-full border-2 border-background bg-emerald-500" />
                                      <div className="flex-1 min-w-0 flex items-center justify-between">
                                        <div className="min-w-0">
                                          <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(p.amount)}
                                          </span>
                                          {p.note && (
                                            <span className="text-xs text-muted-foreground ml-1.5">- {p.note}</span>
                                          )}
                                        </div>
                                        <span className="text-[11px] text-muted-foreground shrink-0">
                                          {format(new Date(p.date), 'MMM d, yyyy', { locale: es })}
                                        </span>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add Debt Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) setAddDialogOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Deuda</DialogTitle>
            <DialogDescription>Registra una nueva deuda para rastrear.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre de la Deuda</Label>
              <Input placeholder="ej., Préstamo de Auto" value={debtForm.name} onChange={(e) => setDebtForm({ ...debtForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto Total ($)</Label>
                <AmountInput placeholder="0.00" value={debtForm.totalAmount} onChange={(val) => setDebtForm({ ...debtForm, totalAmount: val })} />
              </div>
              <div className="space-y-2">
                <Label>Tasa de Interés (%)</Label>
                <Input type="number" step="0.1" min="0" placeholder="0.0" value={debtForm.interestRate} onChange={(e) => setDebtForm({ ...debtForm, interestRate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={debtForm.type} onValueChange={(v) => setDebtForm({ ...debtForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEBT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cuotas (0 si es revolving)</Label>
                <Input type="number" min="0" placeholder="0" value={debtForm.installments} onChange={(e) => setDebtForm({ ...debtForm, installments: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha de Vencimiento (opcional)</Label>
              <Input type="date" value={debtForm.dueDate} onChange={(e) => setDebtForm({ ...debtForm, dueDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddDebt} className="bg-primary hover:bg-primary/90 text-primary-foreground">Agregar Deuda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => { if (!open) { setPaymentDialogOpen(false); setPaymentForm({ amount: '', note: '' }) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago - {selectedDebt?.name}</DialogTitle>
            <DialogDescription>Registra un pago hacia esta deuda.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Restante</p>
              <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {formatCurrency((selectedDebt?.totalAmount || 0) - (selectedDebt?.paidAmount || 0))}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Monto del Pago ($)</Label>
              <AmountInput placeholder="0.00" value={paymentForm.amount} onChange={(val) => setPaymentForm({ ...paymentForm, amount: val })} />
            </div>
            <div className="space-y-2">
              <Label>Nota (opcional)</Label>
              <Input placeholder="ej., Pago mensual" value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPaymentDialogOpen(false); setPaymentForm({ amount: '', note: '' }) }}>Cancelar</Button>
            <Button onClick={handleRecordPayment} className="bg-primary hover:bg-primary/90 text-primary-foreground">Registrar Pago</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}