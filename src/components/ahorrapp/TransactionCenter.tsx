'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'

import {
  Search, ArrowUpRight, ArrowDownRight, Filter, ChevronDown,
  ChevronLeft, ChevronRight, Calendar, DollarSign,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useFormatCurrency } from '@/lib/format-currency'

// --- Types ---

interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: string
}

interface UnifiedTransaction {
  id: string
  type: 'income' | 'expense' | 'unexpected'
  description: string
  amount: number
  date: string
  categoryId: string | null
  category: Category | null
  // Income-specific
  source?: string
  frequency?: string
  // Expense-specific
  isRecurring?: boolean
  // Unexpected-specific
  resolved?: boolean
}

type TypeFilter = 'all' | 'income' | 'expense' | 'unexpected'

const ITEMS_PER_PAGE = 20

// --- Component ---

export default function TransactionCenter() {
  const formatCurrency = useFormatCurrency()
  const { user } = useAppStore()
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Filters
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')

  // Pagination
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [incomeRes, expenseRes, unexpectedRes, catRes] = await Promise.all([
        fetch(`/api/income?accountId=${user.id}`),
        fetch(`/api/expenses?accountId=${user.id}`),
        fetch(`/api/unexpected?accountId=${user.id}`),
        fetch(`/api/categories?accountId=${user.id}`),
      ])

      const incomeData = await incomeRes.json()
      const expenseData = await expenseRes.json()
      const unexpectedData = await unexpectedRes.json()
      const catData = await catRes.json()

      // Income returns array directly; expenses/unexpected wrapped
      const incomeList = Array.isArray(incomeData) ? incomeData : (incomeData.incomes || [])
      const expenseList = expenseData.expenses || []
      const unexpectedList = unexpectedData.unexpecteds || []

      const mapped: UnifiedTransaction[] = [
        ...incomeList.map((i: Record<string, unknown>) => ({
          id: i.id as string,
          type: 'income' as const,
          description: (i.description as string) || i.source,
          amount: Number(i.amount),
          date: i.date as string,
          categoryId: i.categoryId as string | null,
          category: i.category as Category | null,
          source: i.source as string,
          frequency: i.frequency as string,
        })),
        ...expenseList.map((e: Record<string, unknown>) => ({
          id: e.id as string,
          type: 'expense' as const,
          description: e.description as string,
          amount: Number(e.amount),
          date: e.date as string,
          categoryId: e.categoryId as string | null,
          category: e.category as Category | null,
          isRecurring: e.isRecurring as boolean,
        })),
        ...unexpectedList.map((u: Record<string, unknown>) => ({
          id: u.id as string,
          type: 'unexpected' as const,
          description: u.description as string,
          amount: Number(u.amount),
          date: u.date as string,
          categoryId: u.categoryId as string | null,
          category: u.category as Category | null,
          resolved: u.resolved as boolean,
        })),
      ]

      // Sort by date descending
      mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setTransactions(mapped)
      setCategories(Array.isArray(catData.categories) ? catData.categories : [])
    } catch (err) {
      console.error('TransactionCenter fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { fetchData() }, [fetchData])

  // Apply filters
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      // Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      // Category filter
      if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false
      // Search
      if (searchText) {
        const q = searchText.toLowerCase()
        const desc = t.description.toLowerCase()
        const cat = t.category?.name?.toLowerCase() || ''
        const src = (t.source || '').toLowerCase()
        if (!desc.includes(q) && !cat.includes(q) && !src.includes(q)) return false
      }
      // Date range
      if (dateFrom) {
        const d = new Date(t.date)
        if (d < new Date(dateFrom)) return false
      }
      if (dateTo) {
        const d = new Date(t.date)
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (d > to) return false
      }
      // Amount range
      if (amountMin && t.amount < Number(amountMin)) return false
      if (amountMax && t.amount > Number(amountMax)) return false
      return true
    })
  }, [transactions, typeFilter, categoryFilter, searchText, dateFrom, dateTo, amountMin, amountMax])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [typeFilter, categoryFilter, searchText, dateFrom, dateTo, amountMin, amountMax])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Summary
  const totalIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = filtered
    .filter((t) => t.type === 'expense' || t.type === 'unexpected')
    .reduce((s, t) => s + t.amount, 0)
  const net = totalIncome - totalExpenses

  const hasActiveFilters = typeFilter !== 'all' || categoryFilter !== 'all' ||
    searchText !== '' || dateFrom !== '' || dateTo !== '' || amountMin !== '' || amountMax !== ''

  const clearFilters = () => {
    setTypeFilter('all')
    setCategoryFilter('all')
    setSearchText('')
    setDateFrom('')
    setDateTo('')
    setAmountMin('')
    setAmountMax('')
  }

  const typeFilters: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'income', label: 'Ingreso' },
    { key: 'expense', label: 'Gastos' },
    { key: 'unexpected', label: 'Imprevisto' },
  ]

  const TYPE_LABELS: Record<string, string> = {
    income: 'Ingreso',
    expense: 'Gasto',
    unexpected: 'Imprevisto',
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="module-header">
          <h2 className="text-2xl font-bold text-foreground">Centro de Transacciones</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rastrea y filtra todas tus transacciones
          </p>
        </div>
      </motion.div>

      {/* Search + Filter Toggle */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2 items-center"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar transacciones..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={filtersOpen ? 'default' : 'outline'}
          size="default"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={cn('gap-2', hasActiveFilters && !filtersOpen && 'border-primary text-primary')}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filtros</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">
              {[
                typeFilter !== 'all' ? 1 : 0,
                categoryFilter !== 'all' ? 1 : 0,
                dateFrom || dateTo ? 1 : 0,
                amountMin || amountMax ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </Badge>
          )}
          <ChevronDown className={cn('w-4 h-4 transition-transform', filtersOpen && 'rotate-180')} />
        </Button>
      </motion.div>

      {/* Advanced Filters Panel */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-4">
                {/* Type filter tabs */}
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Tipo
                  </Label>
                  <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
                    {typeFilters.map((tf) => (
                      <button
                        key={tf.key}
                        onClick={() => setTypeFilter(tf.key)}
                        className={cn(
                          'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                          typeFilter === tf.key
                            ? 'bg-background shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date from */}
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      <Calendar className="w-3 h-3 inline mr-1" />Desde
                    </Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  {/* Date to */}
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      <Calendar className="w-3 h-3 inline mr-1" />Hasta
                    </Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                  {/* Amount min */}
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      <DollarSign className="w-3 h-3 inline mr-1" />Monto Mínimo
                    </Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amountMin}
                      onChange={(e) => setAmountMin(e.target.value)}
                      min={0}
                      step={0.01}
                    />
                  </div>
                  {/* Amount max */}
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      <DollarSign className="w-3 h-3 inline mr-1" />Monto Máximo
                    </Label>
                    <Input
                      type="number"
                      placeholder="Sin límite"
                      value={amountMax}
                      onChange={(e) => setAmountMax(e.target.value)}
                      min={0}
                      step={0.01}
                    />
                  </div>
                </div>

                {/* Category filter */}
                <div className="max-w-xs">
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Categoría
                  </Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las Categorías" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las Categorías</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                    Limpiar todos los filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>

      {/* Summary Bar */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-2.5"
        >
          <span>
            Mostrando <strong className="text-foreground">{filtered.length}</strong> transaccion{filtered.length !== 1 ? 'es' : ''}
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span className="text-emerald-600 dark:text-emerald-400">
            Ingresos: <strong>{formatCurrency(totalIncome)}</strong>
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span className="text-rose-600 dark:text-rose-400">
            Gastos: <strong>{formatCurrency(totalExpenses)}</strong>
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span className={cn('font-medium', net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
            Neto: {formatCurrency(net)}
          </span>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && <Loading />}

      {/* Transaction List */}
      {!loading && paged.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-state rounded-xl p-10 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-4"
          >
            <span className="text-6xl mb-2 inline-block">📭</span>
          </motion.div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {hasActiveFilters ? 'Sin transacciones encontradas' : 'Sin transacciones aún'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {hasActiveFilters
              ? 'Intenta ajustar tus filtros'
              : 'Comienza agregando ingresos o gastos para verlos aquí.'}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
              Limpiar Filtros
            </Button>
          )}
        </motion.div>
      )}

      {!loading && paged.length > 0 && (
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {paged.map((t, idx) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ delay: idx * 0.02 }}
                className={cn(
                  'flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors cursor-default',
                  'border-l-[3px]',
                  t.type === 'income' && 'border-l-emerald-500',
                  t.type === 'expense' && 'border-l-rose-500',
                  t.type === 'unexpected' && 'border-l-amber-500',
                )}
              >
                {/* Type icon */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    t.type === 'income' && 'bg-emerald-100 dark:bg-emerald-500/15',
                    t.type === 'expense' && 'bg-rose-100 dark:bg-rose-500/15',
                    t.type === 'unexpected' && 'bg-amber-100 dark:bg-amber-500/15',
                  )}
                >
                  {t.type === 'income' ? (
                    <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ArrowDownRight
                      className={cn(
                        'w-5 h-5',
                        t.type === 'expense'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-600 dark:text-amber-400'
                      )}
                    />
                  )}
                </div>

                {/* Description & meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">
                      {t.description}
                    </p>
                    {t.category && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-5 shrink-0"
                        style={{ borderColor: t.category.color, borderWidth: 1 }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full mr-1 shrink-0"
                          style={{ backgroundColor: t.category.color }}
                        />
                        {t.category.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span>{format(parseISO(t.date), 'MMM d, yyyy', { locale: es })}</span>
                    {t.type === 'income' && t.source && (
                      <>
                        <span className="text-border">·</span>
                        <span className="capitalize">{t.source}</span>
                        {t.frequency && (
                          <>
                            <span className="text-border">·</span>
                            <span className="capitalize">{t.frequency}</span>
                          </>
                        )}
                      </>
                    )}
                    {t.type === 'expense' && t.isRecurring && (
                      <>
                        <span className="text-border">·</span>
                        <span>Recurrente</span>
                      </>
                    )}
                    {t.type === 'unexpected' && (
                      <>
                        <span className="text-border">·</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                          {t.resolved ? 'Resuelto' : 'Pendiente'}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      t.type === 'income' && 'text-emerald-600 dark:text-emerald-400',
                      t.type === 'expense' && 'text-rose-600 dark:text-rose-400',
                      t.type === 'unexpected' && 'text-amber-600 dark:text-amber-400',
                    )}
                  >
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{TYPE_LABELS[t.type] || t.type}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between pt-2"
        >
          <p className="text-xs text-muted-foreground">
            Página {page} de {totalPages} · {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {/* Show page numbers for reasonable page counts */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}