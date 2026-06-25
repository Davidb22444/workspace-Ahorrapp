'use client'

import { useState, useEffect } from 'react'
import { Plus, ShoppingCart, Trash2, Edit2, Filter, ArrowDownRight, Search, AlertTriangle, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { format } from 'date-fns'

const CATEGORIES = [
  { id: 'housing', name: 'Housing', color: '#10b981' },
  { id: 'food', name: 'Food', color: '#f59e0b' },
  { id: 'transport', name: 'Transport', color: '#f43f5e' },
  { id: 'entertainment', name: 'Entertainment', color: '#6366f1' },
  { id: 'utilities', name: 'Utilities', color: '#06b6d4' },
  { id: 'health', name: 'Health', color: '#ec4899' },
  { id: 'education', name: 'Education', color: '#8b5cf6' },
  { id: 'clothing', name: 'Clothing', color: '#14b8a6' },
  { id: 'other', name: 'Other', color: '#64748b' },
]

interface ApiCategory {
  id: string
  name: string
  icon?: string
  color: string
}

interface Expense {
  id: string
  amount: number
  description: string
  date: string
  category: string
  categoryColor?: string
  dependentId?: string
  isRecurring: boolean
  isUnexpected: boolean
}

function mapApiExpense(raw: Record<string, unknown>): Expense {
  const cat = raw.category as ApiCategory | null | undefined
  return {
    id: raw.id as string,
    amount: raw.amount as number,
    description: raw.description as string,
    date: raw.date ? new Date(raw.date as string).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    category: cat?.name?.toLowerCase() || (raw.categoryId as string) || 'other',
    categoryColor: cat?.color || '#64748b',
    dependentId: (raw.dependentId as string) || undefined,
    isRecurring: (raw.isRecurring as boolean) || false,
    isUnexpected: (raw.isUnexpected as boolean) || (raw.resolved !== undefined),
  }
}

const mockExpenses: Expense[] = [
  { id: '1', amount: 1200, description: 'Rent Payment', date: '2025-06-02', category: 'housing', categoryColor: '#10b981', isRecurring: true, isUnexpected: false },
  { id: '2', amount: 156.80, description: 'Grocery Store', date: '2025-06-03', category: 'food', categoryColor: '#f59e0b', isRecurring: false, isUnexpected: false },
  { id: '3', amount: 120, description: 'Electric Bill', date: '2025-06-04', category: 'utilities', categoryColor: '#06b6d4', isRecurring: true, isUnexpected: false },
  { id: '4', amount: 65, description: 'Gas Station', date: '2025-06-06', category: 'transport', categoryColor: '#f43f5e', isRecurring: false, isUnexpected: false },
  { id: '5', amount: 15.99, description: 'Netflix Subscription', date: '2025-06-07', category: 'entertainment', categoryColor: '#6366f1', isRecurring: true, isUnexpected: false },
  { id: '6', amount: 85.50, description: 'Restaurant Dinner', date: '2025-06-08', category: 'food', categoryColor: '#f59e0b', isRecurring: false, isUnexpected: false },
  { id: '7', amount: 55, description: 'Phone Bill', date: '2025-06-10', category: 'utilities', categoryColor: '#06b6d4', isRecurring: true, isUnexpected: false },
  { id: '8', amount: 45, description: 'Gym Membership', date: '2025-06-01', category: 'health', categoryColor: '#ec4899', isRecurring: true, isUnexpected: false },
]

const mockUnexpected: Expense[] = [
  { id: 'u1', amount: 350, description: 'Car Repair', date: '2025-06-12', category: 'transport', categoryColor: '#f43f5e', isRecurring: false, isUnexpected: true },
  { id: 'u2', amount: 120, description: 'Emergency Dental Visit', date: '2025-05-28', category: 'health', categoryColor: '#ec4899', isRecurring: false, isUnexpected: true },
  { id: 'u3', amount: 200, description: 'Home Plumbing Fix', date: '2025-05-15', category: 'housing', categoryColor: '#10b981', isRecurring: false, isUnexpected: true },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export default function ExpenseModule() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [unexpected, setUnexpected] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isUnexpectedMode, setIsUnexpectedMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState('all')
  const [search, setSearch] = useState('')
  const { user, setActiveModule, setSidebarOpen } = useAppStore()

  const [form, setForm] = useState({
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'food',
    dependentId: '',
    isRecurring: false,
  })

  useEffect(() => {
    let cancelled = false
    const doFetch = async () => {
      let gotExpenses = false
      let gotUnexpected = false
      try {
        const [expRes, unexpRes] = await Promise.all([
          fetch(`/api/expenses?accountId=${user?.id}`),
          fetch(`/api/unexpected?accountId=${user?.id}`),
        ])
        if (expRes.ok && !cancelled) {
          const data = await expRes.json()
          const rawList = Array.isArray(data.expenses) ? data.expenses : Array.isArray(data) ? data : []
          setExpenses(rawList.map(mapApiExpense))
          gotExpenses = true
        }
        if (unexpRes.ok && !cancelled) {
          const data = await unexpRes.json()
          const rawList = Array.isArray(data.unexpecteds) ? data.unexpecteds : Array.isArray(data.expenses) ? data.expenses : Array.isArray(data) ? data : []
          setUnexpected(rawList.map(mapApiExpense))
          gotUnexpected = true
        }
      } catch { /* fallback */ }
      if (!cancelled) {
        if (!gotExpenses) setExpenses(mockExpenses)
        if (!gotUnexpected) setUnexpected(mockUnexpected)
        setLoading(false)
      }
    }
    doFetch()
    return () => { cancelled = true }
  }, [])

  const resetForm = () => {
    setForm({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), category: 'food', dependentId: '', isRecurring: false })
    setEditingId(null)
    setIsUnexpectedMode(false)
  }

  const openAdd = (isUnexp = false) => {
    resetForm()
    setIsUnexpectedMode(isUnexp)
    setDialogOpen(true)
  }

  const openEdit = (exp: Expense, isUnexp = false) => {
    setForm({
      amount: String(exp.amount),
      description: exp.description,
      date: exp.date,
      category: exp.category,
      dependentId: exp.dependentId || '',
      isRecurring: exp.isRecurring,
    })
    setEditingId(exp.id)
    setIsUnexpectedMode(isUnexp)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.amount || !form.description) { toast.error('Please fill in amount and description'); return }
    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      isUnexpected: isUnexpectedMode,
      categoryColor: CATEGORIES.find((c) => c.id === form.category)?.color || '#64748b',
    }
    try {
      const url = editingId ? `/api/expenses/${editingId}` : '/api/expenses'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, accountId: user?.id }) })
      if (res.ok) {
        const newExp = { ...payload, id: editingId || Date.now().toString() } as Expense
        if (isUnexpectedMode) {
          setUnexpected((prev) => editingId ? prev.map((e) => e.id === editingId ? newExp : e) : [newExp, ...prev])
        } else {
          setExpenses((prev) => editingId ? prev.map((e) => e.id === editingId ? newExp : e) : [newExp, ...prev])
        }
        toast.success(editingId ? 'Expense updated' : 'Expense added')
        setDialogOpen(false)
        resetForm()
        return
      }
    } catch { /* fallback */ }
    const newExp = { ...payload, id: editingId || Date.now().toString() } as Expense
    if (isUnexpectedMode) {
      setUnexpected((prev) => editingId ? prev.map((e) => e.id === editingId ? newExp : e) : [newExp, ...prev])
    } else {
      setExpenses((prev) => editingId ? prev.map((e) => e.id === editingId ? newExp : e) : [newExp, ...prev])
    }
    toast.success(editingId ? 'Expense updated' : 'Expense added')
    setDialogOpen(false)
    resetForm()
  }

  const handleDelete = async (id: string, isUnexp: boolean) => {
    try {
      const res = await fetch(`/api/expenses/${id}?accountId=${user?.id}`, { method: 'DELETE' })
      if (res.ok) {
        if (isUnexp) setUnexpected((prev) => prev.filter((e) => e.id !== id))
        else setExpenses((prev) => prev.filter((e) => e.id !== id))
        toast.success('Expense deleted')
        return
      }
    } catch { /* fallback */ }
    if (isUnexp) setUnexpected((prev) => prev.filter((e) => e.id !== id))
    else setExpenses((prev) => prev.filter((e) => e.id !== id))
    toast.success('Expense deleted')
  }

  const filterList = (list: Expense[]) =>
    list.filter((e) => {
      if (filterCategory !== 'all' && e.category !== filterCategory) return false
      if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })

  const thisMonthTotal = expenses
    .filter((e) => { const d = new Date(e.date); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
    .reduce((sum, e) => sum + e.amount, 0)
  const thisMonthUnexpected = unexpected
    .filter((e) => { const d = new Date(e.date); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
    .reduce((sum, e) => sum + e.amount, 0)

  const renderExpenseTable = (items: Expense[], isUnexp: boolean) => (
    <>
      {loading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="relative p-16 text-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-8 right-1/4 w-32 h-32 rounded-full bg-rose-100/50 dark:bg-rose-500/5" />
            <div className="absolute bottom-8 left-1/4 w-24 h-24 rounded-full bg-rose-100/30 dark:bg-rose-500/5" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-rose-100/20 dark:bg-rose-500/3" />
          </div>
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
              {isUnexp
                ? <AlertTriangle className="w-8 h-8 text-amber-500 dark:text-amber-400" />
                : <ShoppingCart className="w-8 h-8 text-rose-500 dark:text-rose-400" />}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No {isUnexp ? 'unexpected expenses' : 'expenses'} yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              {isUnexp
                ? 'Good news! No unexpected expenses recorded. Keep it that way.'
                : 'Start tracking your expenses to understand where your money goes.'}
            </p>
            <Button onClick={() => openAdd(isUnexp)} className={isUnexp ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}>
              <Plus className="w-4 h-4 mr-2" /> Log {isUnexp ? 'Unexpected Expense' : 'Your First Expense'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden sm:table-cell">Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden md:table-cell">Recurring</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((exp) => (
                <TableRow key={exp.id} className="group">
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(exp.date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="capitalize"
                      style={{
                        backgroundColor: (exp.categoryColor || '#64748b') + '20',
                        color: exp.categoryColor || '#64748b',
                      }}
                    >
                      {exp.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm font-medium max-w-[200px] truncate">{exp.description}</TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold text-rose-600 dark:text-rose-400 tabular-nums flex items-center gap-1">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      {formatCurrency(exp.amount)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {exp.isRecurring ? <Badge variant="outline" className="text-xs">Recurring</Badge> : <span className="text-xs text-muted-foreground">One-time</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(exp, isUnexp)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(exp.id, isUnexp)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gastos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track and manage your expenses</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => {
            const link = document.createElement('a')
            link.href = `/api/export?accountId=${user?.id}&type=expense`
            link.download = `ahorrapp-expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`
            link.click()
          }}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => setActiveModule('unexpected')}>
            <AlertTriangle className="w-4 h-4 mr-2" /> Manage Imprevistos
          </Button>
          <Button onClick={() => openAdd(false)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10">
              <ShoppingCart className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Expenses This Month</p>
              <p className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">{formatCurrency(thisMonthTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unexpected This Month</p>
              <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{formatCurrency(thisMonthUnexpected)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="planned">
        <TabsList>
          <TabsTrigger value="planned">Gastos Planificados ({filterList(expenses).length})</TabsTrigger>
          <TabsTrigger value="unexpected">Imprevistos ({filterList(unexpected).length})</TabsTrigger>
        </TabsList>
        <TabsContent value="planned">
          <Card>
            <CardContent className="p-0">
              {renderExpenseTable(filterList(expenses), false)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="unexpected">
          <Card>
            <CardContent className="p-0">
              {renderExpenseTable(filterList(unexpected), true)}
            </CardContent>
          </Card>
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={() => openAdd(true)}>
              <Plus className="w-4 h-4 mr-2" /> Log Unexpected Expense
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Expense' : isUnexpectedMode ? 'Log Unexpected Expense' : 'Add Expense'}</DialogTitle>
            <DialogDescription>{isUnexpectedMode ? 'Record an unexpected expense.' : 'Enter the details for this expense.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Describe this expense..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="recurring"
                checked={form.isRecurring}
                onCheckedChange={(checked) => setForm({ ...form, isRecurring: !!checked })}
                disabled={isUnexpectedMode}
              />
              <Label htmlFor="recurring" className={isUnexpectedMode ? 'opacity-50' : ''}>
                Recurring expense
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Cancel</Button>
            <Button onClick={handleSave} className="bg-rose-600 hover:bg-rose-700 text-white">
              {editingId ? 'Update' : isUnexpectedMode ? 'Log Expense' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}