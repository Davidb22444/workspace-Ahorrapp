'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Plus, AlertTriangle, Trash2, Edit2, ArrowDownRight, Search } from 'lucide-react'
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
import { motion } from 'framer-motion'

const CATEGORIES = [
  { id: 'transport', name: 'Transporte', color: '#f43f5e' },
  { id: 'health', name: 'Salud', color: '#ec4899' },
  { id: 'housing', name: 'Vivienda', color: '#10b981' },
  { id: 'food', name: 'Alimentación', color: '#f59e0b' },
  { id: 'other', name: 'Otro', color: '#64748b' },
]

const CATEGORY_LABELS: Record<string, string> = {
  housing: 'Vivienda',
  food: 'Alimentación',
  transport: 'Transporte',
  entertainment: 'Entretenimiento',
  utilities: 'Servicios',
  health: 'Salud',
  education: 'Educación',
  clothing: 'Ropa',
  other: 'Otro',
}

interface ApiCategory {
  id: string
  name: string
  icon?: string
  color: string
}

interface UnexpectedExpense {
  id: string
  amount: number
  description: string
  date: string
  category: string
  categoryColor?: string
}

function mapApiUnexpected(raw: Record<string, unknown>): UnexpectedExpense {
  const cat = raw.category as ApiCategory | null | undefined
  return {
    id: raw.id as string,
    amount: raw.amount as number,
    description: raw.description as string,
    date: raw.date ? new Date(raw.date as string).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    category: cat?.name?.toLowerCase() || (raw.categoryId as string) || 'other',
    categoryColor: cat?.color || '#64748b',
  }
}

const mockUnexpected: UnexpectedExpense[] = [
  { id: 'u1', amount: 350, description: 'Reparación de Auto', date: '2025-06-12', category: 'transport', categoryColor: '#f43f5e' },
  { id: 'u2', amount: 120, description: 'Visita Dental de Emergencia', date: '2025-05-28', category: 'health', categoryColor: '#ec4899' },
  { id: 'u3', amount: 200, description: 'Reparación de Plomería', date: '2025-05-15', category: 'housing', categoryColor: '#10b981' },
  { id: 'u4', amount: 75, description: 'Cargador de Teléfono Perdido', date: '2025-05-10', category: 'other', categoryColor: '#64748b' },
  { id: 'u5', amount: 450, description: 'Visita de Emergencia al Veterinario', date: '2025-04-20', category: 'health', categoryColor: '#ec4899' },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export default function UnexpectedModule() {
  const [expenses, setExpenses] = useState<UnexpectedExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const { user } = useAppStore()

  const [form, setForm] = useState({
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'other',
  })

  useEffect(() => {
    let cancelled = false
    const doFetch = async () => {
      try {
        const res = await fetch(`/api/unexpected?accountId=${user?.id}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          const rawList = Array.isArray(data.unexpecteds) ? data.unexpecteds : Array.isArray(data.expenses) ? data.expenses : Array.isArray(data) ? data : []
          setExpenses(rawList.map(mapApiUnexpected))
          setLoading(false)
          return
        }
      } catch { /* fallback */ }
      if (!cancelled) { setExpenses(mockUnexpected); setLoading(false) }
    }
    doFetch()
    return () => { cancelled = true }
  }, [])

  const resetForm = () => {
    setForm({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), category: 'other' })
    setEditingId(null)
  }

  const openAdd = () => { resetForm(); setDialogOpen(true) }

  const openEdit = (exp: UnexpectedExpense) => {
    setForm({ amount: String(exp.amount), description: exp.description, date: exp.date, category: exp.category })
    setEditingId(exp.id)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.amount || !form.description) { toast.error('Por favor completa el monto y la descripción'); return }
    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      categoryColor: CATEGORIES.find((c) => c.id === form.category)?.color || '#64748b',
    }

    try {
      const url = editingId ? `/api/unexpected/${editingId}` : '/api/unexpected'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, accountId: user?.id }) })
      if (res.ok) {
        const newExp = { ...payload, id: editingId || Date.now().toString() } as UnexpectedExpense
        setExpenses((prev) => editingId ? prev.map((e) => e.id === editingId ? newExp : e) : [newExp, ...prev])
        toast.success(editingId ? 'Gasto actualizado' : 'Gasto imprevisto agregado')
        setDialogOpen(false)
        resetForm()
        return
      }
    } catch { /* fallback */ }

    const newExp = { ...payload, id: editingId || Date.now().toString() } as UnexpectedExpense
    setExpenses((prev) => editingId ? prev.map((e) => e.id === editingId ? newExp : e) : [newExp, ...prev])
    toast.success(editingId ? 'Gasto actualizado' : 'Gasto imprevisto agregado')
    setDialogOpen(false)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    try { await fetch(`/api/unexpected/${id}?accountId=${user?.id}`, { method: 'DELETE' }) } catch { /* ok */ }
    setExpenses((prev) => prev.filter((e) => e.id !== id))
    toast.success('Gasto eliminado')
  }

  const filtered = expenses.filter((e) => {
    if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const thisMonth = expenses
    .filter((e) => { const d = new Date(e.date); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
    .reduce((sum, e) => sum + e.amount, 0)

  const allTime = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="module-header">
          <h1 className="text-2xl font-bold text-foreground">Imprevistos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Rastrea gastos imprevistos para una mejor planificación</p>
        </div>
        <Button onClick={openAdd} className="bg-amber-600 hover:bg-amber-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Registrar Gasto Imprevisto
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="card-hover border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Este Mes</p>
              <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{formatCurrency(thisMonth)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10">
              <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Todo el Tiempo</p>
              <p className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">{formatCurrency(allTime)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar gastos imprevistos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-4"
              >
                <Image src="/images/empty-state.png" alt="Sin gastos imprevistos" width={112} height={112} className="h-28 w-28 object-contain rounded-2xl mx-auto" />
              </motion.div>
              <p>No se encontraron gastos imprevistos</p>
              <p className="text-sm mt-1">Registra gastos imprevistos para identificar patrones</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="hidden sm:table-cell">Descripción</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((exp) => (
                    <TableRow key={exp.id} className="group table-row-interactive">
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(exp.date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" style={{
                          backgroundColor: (exp.categoryColor || '#64748b') + '20',
                          color: exp.categoryColor || '#64748b',
                        }}>
                          {CATEGORY_LABELS[exp.category] || exp.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm font-medium max-w-[200px] truncate">{exp.description}</TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-rose-600 dark:text-rose-400 tabular-nums flex items-center gap-1">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          {formatCurrency(exp.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(exp)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(exp.id)}>
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
            <DialogTitle>{editingId ? 'Editar' : 'Registrar'} Gasto Imprevisto</DialogTitle>
            <DialogDescription>Registra un gasto imprevisto para su seguimiento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Monto ($)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input placeholder="¿Qué sucedió?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white">
              {editingId ? 'Actualizar' : 'Registrar Gasto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}