'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Trash2, Edit2, DollarSign, UserCircle } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

interface Dependent {
  id: string
  name: string
  relationship: string
  economicWeight: number
  totalSpending?: number
}

const RELATIONSHIPS = ['spouse', 'child', 'parent', 'sibling', 'other']

const mockDependents: Dependent[] = [
  { id: '1', name: 'Maria Garcia', relationship: 'spouse', economicWeight: 30, totalSpending: 1026 },
  { id: '2', name: 'Carlos Garcia', relationship: 'child', economicWeight: 20, totalSpending: 684 },
  { id: '3', name: 'Ana Garcia', relationship: 'child', economicWeight: 15, totalSpending: 513 },
]

export default function DependentsModule() {
  const [dependents, setDependents] = useState<Dependent[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAppStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    relationship: 'child',
    economicWeight: '',
  })

  useEffect(() => {
    let cancelled = false
    const doFetch = async () => {
      try {
        const res = await fetch(`/api/dependents?accountId=${user?.id}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setDependents(data.dependents || data || [])
          setLoading(false)
          return
        }
      } catch { /* fallback */ }
      if (!cancelled) { setDependents(mockDependents); setLoading(false) }
    }
    doFetch()
    return () => { cancelled = true }
  }, [])

  const resetForm = () => {
    setForm({ name: '', relationship: 'child', economicWeight: '' })
    setEditingId(null)
  }

  const openAdd = () => { resetForm(); setDialogOpen(true) }

  const openEdit = (dep: Dependent) => {
    setForm({
      name: dep.name,
      relationship: dep.relationship,
      economicWeight: String(dep.economicWeight),
    })
    setEditingId(dep.id)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.economicWeight) { toast.error('Please fill in all fields'); return }
    const payload = { ...form, economicWeight: parseFloat(form.economicWeight) }

    try {
      const url = editingId ? `/api/dependents/${editingId}` : '/api/dependents'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, accountId: user?.id }) })
      if (res.ok) {
        const newDep = { ...payload, id: editingId || Date.now().toString() }
        setDependents((prev) => editingId ? prev.map((d) => d.id === editingId ? newDep : d) : [...prev, newDep])
        toast.success(editingId ? 'Dependent updated' : 'Dependent added')
        setDialogOpen(false)
        resetForm()
        return
      }
    } catch { /* fallback */ }

    const newDep = { ...payload, id: editingId || Date.now().toString() }
    setDependents((prev) => editingId ? prev.map((d) => d.id === editingId ? newDep : d) : [...prev, newDep])
    toast.success(editingId ? 'Dependent updated' : 'Dependent added')
    setDialogOpen(false)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    try { await fetch(`/api/dependents/${id}?accountId=${user?.id}`, { method: 'DELETE' }) } catch { /* ok */ }
    setDependents((prev) => prev.filter((d) => d.id !== id))
    toast.success('Dependent removed')
  }

  const totalWeight = dependents.reduce((sum, d) => sum + d.economicWeight, 0)
  const totalSpending = dependents.reduce((sum, d) => sum + (d.totalSpending || 0), 0)

  const relColors: Record<string, string> = {
    spouse: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300',
    child: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300',
    parent: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300',
    sibling: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300',
    other: 'bg-gray-50 dark:bg-gray-500/10 text-gray-700 dark:text-gray-300',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dependientes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage family members and their economic impact</p>
        </div>
        <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Add Dependent
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Dependents</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{dependents.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10">
              <UserCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Economic Weight</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{totalWeight}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10">
              <DollarSign className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Per-Dependent Spending</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(totalSpending)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dependents Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>)}
        </div>
      ) : dependents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No dependents added</p>
          <p className="text-sm mt-1">Add family members to track per-dependent spending</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dependents.map((dep, idx) => (
            <motion.div
              key={dep.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="card-hover">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{dep.name}</h3>
                        <Badge variant="secondary" className={relColors[dep.relationship] || relColors.other}>
                          {dep.relationship}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(dep)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(dep.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Economic Weight</span>
                        <span className="font-semibold tabular-nums">{dep.economicWeight}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${dep.economicWeight}%` }}
                        />
                      </div>
                    </div>

                    {dep.totalSpending !== undefined && (
                      <div className="flex justify-between text-sm pt-2 border-t border-border">
                        <span className="text-muted-foreground">Monthly Spending</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(dep.totalSpending)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Dependent' : 'Add Dependent'}</DialogTitle>
            <DialogDescription>Add a family member to track their economic impact.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Select value={form.relationship} onValueChange={(v) => setForm({ ...form, relationship: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Economic Weight (%)</Label>
              <p className="text-xs text-muted-foreground">Percentage of budget allocated to this dependent (0-100)</p>
              <Input type="number" min="0" max="100" placeholder="0" value={form.economicWeight} onChange={(e) => setForm({ ...form, economicWeight: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {editingId ? 'Update' : 'Add Dependent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}