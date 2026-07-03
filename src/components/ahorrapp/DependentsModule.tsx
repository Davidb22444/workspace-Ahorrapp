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
import { Loading } from '@/components/ui/loading'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useFormatCurrency } from '@/lib/format-currency'

interface Dependent {
  id: string
  name: string
  relationship: string
  economicWeight: number
  totalSpending?: number
}

const RELATIONSHIPS = ['spouse', 'child', 'parent', 'sibling', 'other']

const relationshipLabels: Record<string, string> = {
  spouse: 'Cónyuge',
  child: 'Hijo/a',
  parent: 'Padre/Madre',
  sibling: 'Hermano/a',
  other: 'Otro',
}

export default function DependentsModule() {
  const formatCurrency = useFormatCurrency()
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
      if (!cancelled) { setDependents([]); setLoading(false) }
    }
    doFetch()
    return () => { cancelled = true }
  }, [user?.id])

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
    if (!form.name || !form.economicWeight) { toast.error('Por favor completa todos los campos'); return }
    const payload = { ...form, economicWeight: parseFloat(form.economicWeight) }

    try {
      const url = editingId ? `/api/dependents/${editingId}` : '/api/dependents'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, accountId: user?.id }) })
      if (res.ok) {
        const newDep = { ...payload, id: editingId || Date.now().toString() }
        setDependents((prev) => editingId ? prev.map((d) => d.id === editingId ? newDep : d) : [...prev, newDep])
        toast.success(editingId ? 'Dependiente actualizado' : 'Dependiente agregado')
        setDialogOpen(false)
        resetForm()
        return
      } else {
        toast.error('Error al guardar en el servidor')
        return
      }
    } catch { /* network error - use local fallback */ }

    const newDep = { ...payload, id: editingId || Date.now().toString() }
    setDependents((prev) => editingId ? prev.map((d) => d.id === editingId ? newDep : d) : [...prev, newDep])
    toast.warning('Guardado localmente (sin conexión)')
    setDialogOpen(false)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    try { const res = await fetch(`/api/dependents/${id}?accountId=${user?.id}`, { method: 'DELETE' }); if (!res.ok) { toast.error('Error al eliminar en el servidor'); return } } catch { /* network error */ }
    setDependents((prev) => prev.filter((d) => d.id !== id))
    toast.success('Dependiente eliminado')
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
        <div className="module-header">
          <h1 className="text-2xl font-bold text-foreground">Dependientes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Administra a los miembros de tu familia y su impacto económico</p>
        </div>
        <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Agregar Dependiente
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
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total de Dependientes</p>
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
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Peso Económico Total</p>
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
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gasto por Dependiente</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(totalSpending)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dependents Grid */}
      {loading ? (
        <Loading />
      ) : dependents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 text-muted-foreground"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-4"
          >
            <span className="text-6xl mb-2 inline-block">📭</span>
          </motion.div>
          <p className="text-lg font-medium">Sin dependientes aún</p>
          <p className="text-sm mt-1">Agrega a los miembros de tu familia para rastrear el gasto por dependiente</p>
        </motion.div>
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
                          {relationshipLabels[dep.relationship] || dep.relationship}
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
                        <span className="text-muted-foreground">Peso Económico</span>
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
                        <span className="text-muted-foreground">Gasto Mensual</span>
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
            <DialogTitle>{editingId ? 'Editar Dependiente' : 'Agregar Dependiente'}</DialogTitle>
            <DialogDescription>Agrega un miembro de la familia para rastrear su impacto económico.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Nombre completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Relación</Label>
              <Select value={form.relationship} onValueChange={(v) => setForm({ ...form, relationship: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => (
                    <SelectItem key={r} value={r}>{relationshipLabels[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Peso Económico (%)</Label>
              <p className="text-xs text-muted-foreground">Porcentaje del presupuesto asignado a este dependiente (0-100)</p>
              <Input type="number" min="0" max="100" placeholder="0" value={form.economicWeight} onChange={(e) => setForm({ ...form, economicWeight: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {editingId ? 'Guardar' : 'Agregar Dependiente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}