'use client'

import { useState, useEffect } from 'react'

import { Plus, PiggyBank, Trash2, Calendar, DollarSign, History, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AmountInput } from '@/components/ui/amount-input'
import { Loading } from '@/components/ui/loading'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { useFormatCurrency } from '@/lib/format-currency'

interface Contribution {
  id: string
  amount: number
  date: string
  note?: string
}

interface SavingsGoal {
  id: string
  name: string
  icon: string
  saved: number
  target: number
  deadline?: string
  color?: string
  contributions?: Contribution[]
}

const GOAL_COLORS = ['#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#f43f5e', '#6366f1', '#14b8a6', '#ec4899']

function getGoalEmoji(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('travel') || lower.includes('vacation') || lower.includes('trip')) return '✈️'
  if (lower.includes('emergency') || lower.includes('fund')) return '🛡️'
  if (lower.includes('laptop') || lower.includes('computer') || lower.includes('mac')) return '💻'
  if (lower.includes('house') || lower.includes('home') || lower.includes('mortgage')) return '🏠'
  if (lower.includes('car') || lower.includes('vehicle') || lower.includes('auto')) return '🚗'
  if (lower.includes('wedding') || lower.includes('marriage')) return '💍'
  if (lower.includes('education') || lower.includes('college') || lower.includes('university') || lower.includes('school')) return '🎓'
  return '💰'
}

const ICON_OPTIONS = ['🛡️', '✈️', '💻', '🏠', '🚗', '🎓', '💍', '💰', '🎁', '📱', '🎮', '🐕']

export default function SavingsModule() {
  const formatCurrency = useFormatCurrency()
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAppStore()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [contributeDialogOpen, setContributeDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null)
  const [showDetail, setShowDetail] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const [goalForm, setGoalForm] = useState({
    name: '',
    icon: '💰',
    target: '',
    deadline: '',
  })

  const [contributeForm, setContributeForm] = useState({
    amount: '',
    note: '',
  })

  useEffect(() => {
    let cancelled = false
    const doFetch = async () => {
      try {
        const res = await fetch(`/api/savings?accountId=${user?.id}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          const goalsData = (data.savingsGoals || []).map((g: any, idx: number) => ({
            id: g.id,
            name: g.name,
            icon: g.icon || '💰',
            color: g.color || GOAL_COLORS[idx % GOAL_COLORS.length],
            saved: Number(g.savedAmount ?? g.saved ?? 0),
            target: Number(g.targetAmount ?? g.target ?? 0),
            deadline: g.deadline || undefined,
            contributions: g.contributions || [],
          }))
          setGoals(goalsData)
          setLoading(false)
          return
        }
      } catch { /* fallback */ }
      if (!cancelled) {
        setGoals([])
        setLoading(false)
      }
    }
    doFetch()
    return () => { cancelled = true }
  }, [user?.id])

  const handleAddGoal = async () => {
    if (!goalForm.name || !goalForm.target) { toast.error('Por favor completa nombre y meta'); return }
    const payload = { ...goalForm, target: parseFloat(goalForm.target), saved: 0, icon: goalForm.icon || getGoalEmoji(goalForm.name) }
    try {
      const res = await fetch('/api/savings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: payload.name, targetAmount: payload.target, icon: payload.icon, deadline: payload.deadline || undefined, accountId: user?.id }) })
      if (res.ok) {
        const body = await res.json()
        const g = body.savingsGoal
        const newGoal: SavingsGoal = {
          id: g.id,
          name: g.name,
          icon: g.icon || payload.icon,
          color: g.color || GOAL_COLORS[goals.length % GOAL_COLORS.length],
          saved: Number(g.savedAmount || 0),
          target: Number(g.targetAmount || payload.target),
          deadline: g.deadline || undefined,
          contributions: [],
        }
        setGoals((prev) => [...prev, newGoal])
        toast.success('Meta de ahorro creada')
        setAddDialogOpen(false)
        setGoalForm({ name: '', icon: '💰', target: '', deadline: '' })
        return
      } else {
        toast.error('Error al guardar en el servidor')
        return
      }
    } catch { /* network error - use local fallback */ }
    setGoals((prev) => [...prev, { ...payload, id: `local_${Date.now()}`, contributions: [], color: GOAL_COLORS[goals.length % GOAL_COLORS.length] }])
    toast.warning('Guardado localmente (sin conexión)')
    setAddDialogOpen(false)
    setGoalForm({ name: '', icon: '💰', target: '', deadline: '' })
  }

  const handleContribute = async () => {
    if (!contributeForm.amount || !selectedGoal) { toast.error('Por favor ingresa un monto'); return }
    const amount = parseFloat(contributeForm.amount)
    const contribution: Contribution = { id: Date.now().toString(), amount, date: format(new Date(), 'yyyy-MM-dd'), note: contributeForm.note || undefined }

    try {
      const res = await fetch(`/api/savings/${selectedGoal.id}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contribution, accountId: user?.id }),
      })
      if (res.ok) {
        setGoals((prev) => prev.map((g) =>
          g.id === selectedGoal.id
            ? { ...g, saved: g.saved + amount, contributions: [contribution, ...(g.contributions || [])] }
            : g
        ))
        toast.success(`Contribución de ${formatCurrency(amount)} a ${selectedGoal.name}`)
        setContributeDialogOpen(false)
        setContributeForm({ amount: '', note: '' })
        return
      } else {
        toast.error('Error al guardar en el servidor')
        return
      }
    } catch { /* network error - use local fallback */ }
    setGoals((prev) => prev.map((g) =>
      g.id === selectedGoal.id
        ? { ...g, saved: g.saved + amount, contributions: [contribution, ...(g.contributions || [])] }
        : g
    ))
    toast.warning(`Contribución guardada localmente (sin conexión)`)
    setContributeDialogOpen(false)
    setContributeForm({ amount: '', note: '' })
  }

  const openQuickContribute = (e: React.MouseEvent, goal: SavingsGoal) => {
    e.stopPropagation()
    setSelectedGoal(goal)
    setContributeDialogOpen(true)
  }

  const handleDeleteGoal = async (id: string) => {
    try { const res = await fetch(`/api/savings/${id}?accountId=${user?.id}`, { method: 'DELETE' }); if (!res.ok) { toast.error('Error al eliminar en el servidor'); return } } catch { /* network error */ }
    setGoals((prev) => prev.filter((g) => g.id !== id))
    toast.success('Meta eliminada')
  }

  const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0)
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0)

  const displayedGoals = showAll ? goals : goals.slice(0, 4)
  const hasMore = goals.length > 4

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 module-header">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gradient">Ahorros</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Sigue tus metas de ahorro</p>
          </div>
          <span className="text-6xl hidden sm:inline-block">💰</span>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Agregar Meta
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="stat-card card-hover card-accent" style={{ '--card-accent-from': '#10b981', '--card-accent-to': '#06b6d4' } as React.CSSProperties}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <PiggyBank className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Ahorrado</p>
              <p className="text-2xl font-bold tabular-nums text-gradient">{formatCurrency(totalSaved)}</p>
              <p className="text-xs text-muted-foreground">de {formatCurrency(totalTarget)} en metas totales</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card card-hover card-accent" style={{ '--card-accent-from': '#10b981', '--card-accent-to': '#34d399' } as React.CSSProperties}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Progreso General</span>
              <span className="text-sm font-bold tabular-nums text-primary">
                {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%
              </span>
            </div>
            <Progress value={totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0} className="h-3" />
          </CardContent>
        </Card>
      </div>

      {/* Goals Grid */}
      {loading ? (
        <Loading />
      ) : goals.length === 0 ? (
        <div className="relative py-20 text-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-8 right-1/4 w-36 h-36 rounded-full bg-emerald-100/50 dark:bg-emerald-500/5" />
            <div className="absolute bottom-8 left-1/3 w-28 h-28 rounded-full bg-emerald-100/30 dark:bg-emerald-500/5" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 rounded-full bg-emerald-100/20 dark:bg-emerald-500/3" />
          </div>
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-4"
            >
              <span className="text-6xl mb-2 inline-block">📭</span>
            </motion.div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Sin metas de ahorro aún</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              Establece tu primera meta de ahorro para comenzar a construir un mejor futuro financiero. ¡Cada centavo cuenta!
            </p>
            <Button onClick={() => setAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" /> Crear Tu Primera Meta
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedGoals.map((goal, idx) => {
              const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100))
              const isDetailOpen = showDetail === goal.id
              const goalColor = goal.color || GOAL_COLORS[idx % GOAL_COLORS.length]
              const goalEmoji = getGoalEmoji(goal.name)

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -2 }}
                >
                  <Card
                    className="card-hover cursor-pointer overflow-hidden"
                    style={{ borderTop: `3px solid ${goalColor}` }}
                    onClick={() => setShowDetail(isDetailOpen ? null : goal.id)}
                  >
                    <CardContent className="p-5 bg-gradient-to-br from-card to-muted/30">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{goalEmoji}</span>
                          <div>
                            <h3 className="font-semibold text-foreground text-sm">{goal.name}</h3>
                            {goal.deadline && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(goal.deadline), 'MMM d, yyyy', { locale: es })}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={pct >= 100 ? 'default' : 'secondary'} className={pct >= 100 ? 'bg-primary text-primary-foreground' : ''}>
                          {pct}%
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Ahorrado</span>
                          <span className="font-semibold tabular-nums text-foreground">{formatCurrency(goal.saved)}</span>
                        </div>
                        <div className="relative group/prog">
                          <Progress value={pct} className="h-2.5" />
                          <div className="progress-shimmer absolute inset-0 rounded-full pointer-events-none" />
                          <button
                            onClick={(e) => openQuickContribute(e, goal)}
                            className="absolute -right-1 -top-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover/prog:opacity-100 transition-opacity shadow-md hover:scale-110"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{formatCurrency(goal.target)} meta</span>
                          <span>{formatCurrency(Math.max(0, goal.target - goal.saved))} restante</span>
                        </div>
                      </div>

                      {isDetailOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 pt-4 border-t border-border"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex gap-2 mb-3">
                            <Button
                              size="sm"
                              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-8"
                              onClick={() => { setSelectedGoal(goal); setContributeDialogOpen(true) }}
                            >
                              <DollarSign className="w-3.5 h-3.5 mr-1" /> Contribuir
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteGoal(goal.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          {goal.contributions && goal.contributions.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <History className="w-3 h-3" /> Línea de Tiempo de Contribuciones
                              </p>
                              <div className="max-h-48 overflow-y-auto pl-4 relative">
                                <div className="absolute left-[7px] top-2 bottom-2 w-px border-l-2 border-dashed border-border" />
                                <div className="space-y-3">
                                  {goal.contributions.slice(0, 8).map((c, cIdx) => (
                                    <motion.div
                                      key={c.id}
                                      initial={{ opacity: 0, x: -8 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: cIdx * 0.05 }}
                                      className="relative flex items-start gap-3"
                                    >
                                      <div
                                        className="absolute -left-[13px] top-1.5 w-3 h-3 rounded-full border-2 border-background"
                                        style={{ background: goalColor }}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-semibold tabular-nums text-foreground">
                                            {formatCurrency(c.amount)}
                                          </span>
                                          <span className="text-[11px] text-muted-foreground shrink-0">
                                            {format(new Date(c.date), 'MMM d, yyyy', { locale: es })}
                                          </span>
                                        </div>
                                        {c.note && (
                                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.note}</p>
                                        )}
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {hasMore && !showAll && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center pt-2"
            >
              <button
                onClick={() => setShowAll(true)}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Ver todo en Ahorros
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {showAll && hasMore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center pt-2"
            >
              <button
                onClick={() => setShowAll(false)}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                Ver menos
              </button>
            </motion.div>
          )}
        </>
      )}

      {/* Add Goal Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) setAddDialogOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Meta de Ahorro</DialogTitle>
            <DialogDescription>Establece un nuevo objetivo financiero para ahorrar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Ícono</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setGoalForm({ ...goalForm, icon })}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${goalForm.icon === icon ? 'bg-primary/20 ring-2 ring-primary' : 'bg-muted hover:bg-accent'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nombre de la Meta</Label>
              <Input placeholder="ej., Fondo de Emergencia" value={goalForm.name} onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto Objetivo ($)</Label>
                <AmountInput placeholder="0.00" value={goalForm.target} onChange={(val) => setGoalForm({ ...goalForm, target: val })} />
              </div>
              <div className="space-y-2">
                <Label>Fecha Límite (opcional)</Label>
                <Input type="date" value={goalForm.deadline} onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddGoal} className="bg-primary hover:bg-primary/90 text-primary-foreground">Crear Meta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contribute Dialog */}
      <Dialog open={contributeDialogOpen} onOpenChange={(open) => { if (!open) { setContributeDialogOpen(false); setContributeForm({ amount: '', note: '' }) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contribuir a {selectedGoal?.name}</DialogTitle>
            <DialogDescription>Agrega dinero a tu meta de ahorro.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Progreso Actual</p>
              <p className="text-lg font-bold tabular-nums text-gradient">{formatCurrency(selectedGoal?.saved || 0)}</p>
              <p className="text-xs text-muted-foreground">de {formatCurrency(selectedGoal?.target || 0)}</p>
            </div>
            <div className="space-y-2">
              <Label>Monto ($)</Label>
              <AmountInput placeholder="0.00" value={contributeForm.amount} onChange={(val) => setContributeForm({ ...contributeForm, amount: val })} />
            </div>
            <div className="space-y-2">
              <Label>Nota (opcional)</Label>
              <Input placeholder="ej., Contribución mensual" value={contributeForm.note} onChange={(e) => setContributeForm({ ...contributeForm, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setContributeDialogOpen(false); setContributeForm({ amount: '', note: '' }) }}>Cancelar</Button>
            <Button onClick={handleContribute} className="bg-primary hover:bg-primary/90 text-primary-foreground">Agregar Contribución</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}