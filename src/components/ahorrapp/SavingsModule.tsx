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
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { motion } from 'framer-motion'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

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

const mockGoals: SavingsGoal[] = [
  {
    id: '1', name: 'Emergency Fund', icon: '🛡️', saved: 4500, target: 10000, deadline: '2025-12-31', color: '#10b981',
    contributions: [
      { id: 'c1', amount: 500, date: '2025-06-01', note: 'Monthly contribution' },
      { id: 'c2', amount: 500, date: '2025-05-01', note: 'Monthly contribution' },
      { id: 'c3', amount: 300, date: '2025-04-15', note: 'Extra savings' },
    ],
  },
  {
    id: '2', name: 'Vacation to Europe', icon: '✈️', saved: 1200, target: 3000, deadline: '2025-08-15', color: '#06b6d4',
    contributions: [
      { id: 'c4', amount: 200, date: '2025-06-01', note: 'Saving for flights' },
      { id: 'c5', amount: 150, date: '2025-05-15', note: 'Side hustle income' },
    ],
  },
  {
    id: '3', name: 'New Laptop', icon: '💻', saved: 800, target: 2000, color: '#8b5cf6',
    contributions: [
      { id: 'c6', amount: 200, date: '2025-06-05', note: 'Monthly savings' },
    ],
  },
  {
    id: '4', name: 'House Down Payment', icon: '🏠', saved: 15000, target: 50000, deadline: '2027-06-01', color: '#f59e0b',
    contributions: [
      { id: 'c7', amount: 2000, date: '2025-06-01', note: 'Monthly contribution' },
      { id: 'c8', amount: 2000, date: '2025-05-01', note: 'Monthly contribution' },
    ],
  },
]

const ICON_OPTIONS = ['🛡️', '✈️', '💻', '🏠', '🚗', '🎓', '💍', '💰', '🎁', '📱', '🎮', '🐕']

export default function SavingsModule() {
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
          const goalsData = (data.goals || data || []).map((g: SavingsGoal, idx: number) => ({
            ...g,
            color: g.color || GOAL_COLORS[idx % GOAL_COLORS.length],
          }))
          setGoals(goalsData)
          setLoading(false)
          return
        }
      } catch { /* fallback */ }
      if (!cancelled) {
        setGoals(mockGoals)
        setLoading(false)
      }
    }
    doFetch()
    return () => { cancelled = true }
  }, [])

  const handleAddGoal = async () => {
    if (!goalForm.name || !goalForm.target) { toast.error('Please fill in name and target'); return }
    const payload = { ...goalForm, target: parseFloat(goalForm.target), saved: 0, icon: goalForm.icon || getGoalEmoji(goalForm.name) }
    try {
      const res = await fetch('/api/savings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, accountId: user?.id }) })
      if (res.ok) {
        const newGoal = { ...payload, id: Date.now().toString(), contributions: [], color: GOAL_COLORS[goals.length % GOAL_COLORS.length] }
        setGoals((prev) => [...prev, newGoal])
        toast.success('Savings goal created')
        setAddDialogOpen(false)
        setGoalForm({ name: '', icon: '💰', target: '', deadline: '' })
        return
      }
    } catch { /* fallback */ }
    setGoals((prev) => [...prev, { ...payload, id: Date.now().toString(), contributions: [], color: GOAL_COLORS[goals.length % GOAL_COLORS.length] }])
    toast.success('Savings goal created')
    setAddDialogOpen(false)
    setGoalForm({ name: '', icon: '💰', target: '', deadline: '' })
  }

  const handleContribute = async () => {
    if (!contributeForm.amount || !selectedGoal) { toast.error('Please enter an amount'); return }
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
        toast.success(`Contributed ${formatCurrency(amount)} to ${selectedGoal.name}`)
        setContributeDialogOpen(false)
        setContributeForm({ amount: '', note: '' })
        return
      }
    } catch { /* fallback */ }
    setGoals((prev) => prev.map((g) =>
      g.id === selectedGoal.id
        ? { ...g, saved: g.saved + amount, contributions: [contribution, ...(g.contributions || [])] }
        : g
    ))
    toast.success(`Contributed ${formatCurrency(amount)} to ${selectedGoal.name}`)
    setContributeDialogOpen(false)
    setContributeForm({ amount: '', note: '' })
  }

  const openQuickContribute = (e: React.MouseEvent, goal: SavingsGoal) => {
    e.stopPropagation()
    setSelectedGoal(goal)
    setContributeDialogOpen(true)
  }

  const handleDeleteGoal = async (id: string) => {
    try { await fetch(`/api/savings/${id}?accountId=${user?.id}`, { method: 'DELETE' }) } catch { /* ok */ }
    setGoals((prev) => prev.filter((g) => g.id !== id))
    toast.success('Goal deleted')
  }

  const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0)
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0)

  const displayedGoals = showAll ? goals : goals.slice(0, 4)
  const hasMore = goals.length > 4

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Ahorros</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track your savings goals</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Add Goal
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="stat-card card-hover">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <PiggyBank className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Saved</p>
              <p className="text-2xl font-bold tabular-nums text-gradient">{formatCurrency(totalSaved)}</p>
              <p className="text-xs text-muted-foreground">of {formatCurrency(totalTarget)} total goals</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Overall Progress</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="relative py-20 text-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-8 right-1/4 w-36 h-36 rounded-full bg-emerald-100/50 dark:bg-emerald-500/5" />
            <div className="absolute bottom-8 left-1/3 w-28 h-28 rounded-full bg-emerald-100/30 dark:bg-emerald-500/5" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 rounded-full bg-emerald-100/20 dark:bg-emerald-500/3" />
          </div>
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <PiggyBank className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No savings goals yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              Set your first savings goal to start building a better financial future. Every dollar counts!
            </p>
            <Button onClick={() => setAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" /> Create Your First Goal
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
                                {format(new Date(goal.deadline), 'MMM d, yyyy')}
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
                          <span className="text-muted-foreground">Saved</span>
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
                          <span>{formatCurrency(goal.target)} goal</span>
                          <span>{formatCurrency(Math.max(0, goal.target - goal.saved))} remaining</span>
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
                              <DollarSign className="w-3.5 h-3.5 mr-1" /> Contribute
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
                                <History className="w-3 h-3" /> Contribution Timeline
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
                                            {format(new Date(c.date), 'MMM d, yyyy')}
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
                View all in Ahorros
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
                Show less
              </button>
            </motion.div>
          )}
        </>
      )}

      {/* Add Goal Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) setAddDialogOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Savings Goal</DialogTitle>
            <DialogDescription>Set a new financial target to save toward.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Icon</Label>
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
              <Label>Goal Name</Label>
              <Input placeholder="e.g., Emergency Fund" value={goalForm.name} onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Amount ($)</Label>
                <Input type="number" step="0.01" min="0" placeholder="0.00" value={goalForm.target} onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Deadline (optional)</Label>
                <Input type="date" value={goalForm.deadline} onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddGoal} className="bg-primary hover:bg-primary/90 text-primary-foreground">Create Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contribute Dialog */}
      <Dialog open={contributeDialogOpen} onOpenChange={(open) => { if (!open) { setContributeDialogOpen(false); setContributeForm({ amount: '', note: '' }) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contribute to {selectedGoal?.name}</DialogTitle>
            <DialogDescription>Add money toward your savings goal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Current Progress</p>
              <p className="text-lg font-bold tabular-nums text-gradient">{formatCurrency(selectedGoal?.saved || 0)}</p>
              <p className="text-xs text-muted-foreground">of {formatCurrency(selectedGoal?.target || 0)}</p>
            </div>
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={contributeForm.amount} onChange={(e) => setContributeForm({ ...contributeForm, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input placeholder="e.g., Monthly contribution" value={contributeForm.note} onChange={(e) => setContributeForm({ ...contributeForm, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setContributeDialogOpen(false); setContributeForm({ amount: '', note: '' }) }}>Cancel</Button>
            <Button onClick={handleContribute} className="bg-primary hover:bg-primary/90 text-primary-foreground">Add Contribution</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}