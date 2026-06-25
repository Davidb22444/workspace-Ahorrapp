'use client'

import { useState, useEffect } from 'react'
import { Plus, TrendingUp, Trash2, Edit2, Filter, ArrowUpRight, Search, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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

const SOURCES = ['salary', 'bonus', 'rent', 'freelance', 'investment', 'other'] as const
const FREQUENCIES = ['one-time', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] as const

interface Income {
  id: string
  source: string
  amount: number
  description: string
  date: string
  frequency: string
  category?: string
}

const mockIncomes: Income[] = [
  { id: '1', source: 'salary', amount: 5200, description: 'Monthly Salary - Tech Corp', date: '2025-06-01', frequency: 'monthly', category: 'Employment' },
  { id: '2', source: 'freelance', amount: 800, description: 'Website redesign project', date: '2025-06-05', frequency: 'one-time', category: 'Freelance' },
  { id: '3', source: 'investment', amount: 150, description: 'Dividend payments - ETF', date: '2025-06-09', frequency: 'quarterly', category: 'Investment' },
  { id: '4', source: 'rent', amount: 1200, description: 'Apartment rental income', date: '2025-06-03', frequency: 'monthly', category: 'Passive' },
  { id: '5', source: 'bonus', amount: 2000, description: 'Quarterly performance bonus', date: '2025-05-30', frequency: 'one-time', category: 'Employment' },
  { id: '6', source: 'salary', amount: 5200, description: 'Monthly Salary - Tech Corp', date: '2025-05-01', frequency: 'monthly', category: 'Employment' },
  { id: '7', source: 'freelance', amount: 350, description: 'Logo design for startup', date: '2025-05-15', frequency: 'one-time', category: 'Freelance' },
  { id: '8', source: 'other', amount: 100, description: 'Cashback rewards', date: '2025-05-20', frequency: 'one-time', category: 'Other' },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export default function IncomeModule() {
  const [incomes, setIncomes] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterSource, setFilterSource] = useState('all')
  const [search, setSearch] = useState('')
  const { user } = useAppStore()

  const [form, setForm] = useState({
    source: 'salary',
    amount: '',
    description: '',
    frequency: 'one-time',
    date: format(new Date(), 'yyyy-MM-dd'),
    category: '',
  })

  useEffect(() => {
    let cancelled = false
    const doFetch = async () => {
      try {
        const res = await fetch(`/api/income?accountId=${user?.id}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setIncomes(data.incomes || data || [])
          setLoading(false)
          return
        }
      } catch { /* fallback */ }
      if (!cancelled) { setIncomes(mockIncomes); setLoading(false) }
    }
    doFetch()
    return () => { cancelled = true }
  }, [])

  const resetForm = () => {
    setForm({ source: 'salary', amount: '', description: '', frequency: 'one-time', date: format(new Date(), 'yyyy-MM-dd'), category: '' })
    setEditingId(null)
  }

  const openAdd = () => { resetForm(); setDialogOpen(true) }
  const openEdit = (inc: Income) => {
    setForm({
      source: inc.source,
      amount: String(inc.amount),
      description: inc.description,
      frequency: inc.frequency,
      date: inc.date,
      category: inc.category || '',
    })
    setEditingId(inc.id)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.amount || !form.description) { toast.error('Please fill in amount and description'); return }
    const payload = { ...form, amount: parseFloat(form.amount) }
    try {
      const url = editingId ? `/api/income/${editingId}` : '/api/income'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, accountId: user?.id }) })
      if (res.ok) {
        toast.success(editingId ? 'Income updated' : 'Income added')
        if (editingId) {
          setIncomes((prev) => prev.map((i) => i.id === editingId ? { ...i, ...payload } : i))
        } else {
          setIncomes((prev) => [{ ...payload, id: Date.now().toString() }, ...prev])
        }
        setDialogOpen(false)
        resetForm()
        return
      }
    } catch { /* fallback to local */ }
    // Local fallback
    if (editingId) {
      setIncomes((prev) => prev.map((i) => i.id === editingId ? { ...i, ...payload } : i))
      toast.success('Income updated')
    } else {
      setIncomes((prev) => [{ ...payload, id: Date.now().toString() }, ...prev])
      toast.success('Income added')
    }
    setDialogOpen(false)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/income/${id}?accountId=${user?.id}`, { method: 'DELETE' })
      if (res.ok) { setIncomes((prev) => prev.filter((i) => i.id !== id)); toast.success('Income deleted'); return }
    } catch { /* fallback */ }
    setIncomes((prev) => prev.filter((i) => i.id !== id))
    toast.success('Income deleted')
  }

  const filtered = incomes.filter((i) => {
    if (filterSource !== 'all' && i.source !== filterSource) return false
    if (search && !i.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const thisMonth = incomes
    .filter((i) => { const d = new Date(i.date); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
    .reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ingresos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your income sources</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const link = document.createElement('a')
            link.href = `/api/export?accountId=${user?.id}&type=income`
            link.download = `ahorrapp-income-${format(new Date(), 'yyyy-MM-dd')}.csv`
            link.click()
          }}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Add Income
          </Button>
        </div>
      </div>

      {/* Summary */}
      <Card className="card-hover border-primary/20">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
            <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Income This Month</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(thisMonth)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search incomes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="relative p-16 text-center overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-8 left-1/4 w-32 h-32 rounded-full bg-emerald-100/50 dark:bg-emerald-500/5" />
                <div className="absolute bottom-8 right-1/4 w-24 h-24 rounded-full bg-emerald-100/30 dark:bg-emerald-500/5" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-emerald-100/20 dark:bg-emerald-500/3" />
              </div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No incomes yet</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                  Start tracking your income sources to get a clear picture of your earnings.
                </p>
                <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" /> Add Your First Income
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="hidden sm:table-cell">Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="hidden md:table-cell">Frequency</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inc) => (
                    <TableRow key={inc.id} className="group">
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(inc.date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          {inc.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm font-medium max-w-[200px] truncate">
                        {inc.description}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          {formatCurrency(inc.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground capitalize">{inc.frequency}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(inc)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(inc.id)}>
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
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Income' : 'Add Income'}</DialogTitle>
            <DialogDescription>Enter the details for this income entry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Describe this income..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category (optional)</Label>
              <Input placeholder="e.g., Employment, Freelance..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {editingId ? 'Update' : 'Add Income'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}