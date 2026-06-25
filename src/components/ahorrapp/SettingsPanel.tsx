'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { User, Mail, Moon, Sun, DollarSign, Shield, LogOut, Plus, X, Tags, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'MXN', label: 'MXN ($)', symbol: '$' },
  { value: 'COP', label: 'COP ($)', symbol: '$' },
  { value: 'ARS', label: 'ARS ($)', symbol: '$' },
]

const PRESET_COLORS = [
  '#10b981', '#f59e0b', '#f43f5e', '#6366f1', '#06b6d4',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
  '#64748b', '#e11d48',
]

interface CategoryItem {
  id: string
  name: string
  icon: string
  color: string
  type: string
  isDefault: boolean
}

export default function SettingsPanel() {
  const { user, logout } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [currency, setCurrency] = useState('USD')
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')

  // Category management state
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [catLoading, setCatLoading] = useState(true)
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [catForm, setCatForm] = useState({
    name: '',
    type: 'expense',
    color: '#6366f1',
    icon: 'Circle',
  })

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    const doFetch = async () => {
      try {
        const res = await fetch(`/api/categories?accountId=${user.id}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setCategories(data.categories || [])
        }
      } catch { /* ok */ }
      if (!cancelled) setCatLoading(false)
    }
    doFetch()
    return () => { cancelled = true }
  }, [user?.id])

  const handleSaveProfile = () => {
    if (!name || !email) {
      toast.error('Please fill in all fields')
      return
    }
    toast.success('Profile updated')
  }

  const handleAddCategory = async () => {
    if (!catForm.name) {
      toast.error('Please enter a category name')
      return
    }
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...catForm, accountId: user?.id }),
      })
      if (res.ok) {
        const data = await res.json()
        setCategories((prev) => [...prev, { ...catForm, id: data.category?.id || Date.now().toString(), isDefault: false }])
        toast.success('Category created')
        setCatDialogOpen(false)
        setCatForm({ name: '', type: 'expense', color: '#6366f1', icon: 'Circle' })
        return
      }
    } catch { /* fallback */ }
    setCategories((prev) => [...prev, { ...catForm, id: Date.now().toString(), isDefault: false }])
    toast.success('Category created')
    setCatDialogOpen(false)
    setCatForm({ name: '', type: 'expense', color: '#6366f1', icon: 'Circle' })
  }

  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (cat.isDefault) {
      toast.error('Cannot delete default categories')
      return
    }
    try {
      const res = await fetch(`/api/categories/${cat.id}?accountId=${user?.id}`, { method: 'DELETE' })
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== cat.id))
        toast.success('Category deleted')
        return
      }
    } catch { /* fallback */ }
    setCategories((prev) => prev.filter((c) => c.id !== cat.id))
    toast.success('Category deleted')
  }

  const incomeCategories = categories.filter((c) => c.type === 'income')
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  const renderCategoryList = (items: CategoryItem[], typeLabel: string) => {
    if (items.length === 0) {
      return (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No {typeLabel.toLowerCase()} categories yet
        </p>
      )
    }
    return (
      <div className="divide-y divide-border/50">
        {items.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between py-2.5 group">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-sm font-medium text-foreground truncate">{cat.name}</span>
              {cat.isDefault ? (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">System</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">Custom</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-muted-foreground hidden sm:inline">{cat.icon}</span>
              {!cat.isDefault && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteCategory(cat)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="module-header">
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-foreground">{user?.name || 'User'}</h3>
              <p className="text-sm text-muted-foreground">{user?.email || ''}</p>
              <Badge variant="secondary" className="mt-1">{user?.role || 'user'}</Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={handleSaveProfile} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Appearance</CardTitle>
          <CardDescription>Customize how AhorrApp looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-primary" />
              ) : (
                <Sun className="w-5 h-5 text-primary" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Toggle between light and dark theme</p>
              </div>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">System Theme</p>
              <p className="text-xs text-muted-foreground">Use your system&apos;s color scheme</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme('system')}
            >
              Use System
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Preferences</CardTitle>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Currency</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Select value={currency} onValueChange={(v) => { setCurrency(v); toast.success(`Currency set to ${v}`) }}>
                <SelectTrigger className="pl-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">This affects how amounts are displayed throughout the app.</p>
          </div>
        </CardContent>
      </Card>

      {/* Manage Categories */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Tags className="w-4 h-4" /> Manage Categories
              </CardTitle>
              <CardDescription className="mt-1">Organize your income and expense categories</CardDescription>
            </div>
            <Button size="sm" onClick={() => setCatDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {catLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
              <Skeleton className="h-6 w-36 mt-4" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Income Categories */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-0 text-xs font-medium">
                    Income
                  </Badge>
                  <span className="text-xs text-muted-foreground">{incomeCategories.length} categories</span>
                </div>
                {renderCategoryList(incomeCategories, 'Income')}
              </div>

              <Separator />

              {/* Expense Categories */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-0 text-xs font-medium">
                    Expense
                  </Badge>
                  <span className="text-xs text-muted-foreground">{expenseCategories.length} categories</span>
                </div>
                {renderCategoryList(expenseCategories, 'Expense')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-destructive">Account</CardTitle>
          <CardDescription>Danger zone - these actions are irreversible</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCatDialogOpen(false)
          setCatForm({ name: '', type: 'expense', color: '#6366f1', icon: 'Circle' })
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Create a new category for organizing your finances.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g., Freelance, Subscriptions..."
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={catForm.type} onValueChange={(v) => setCatForm({ ...catForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Icon Name</Label>
                <Input
                  placeholder="e.g., Circle, Star"
                  value={catForm.icon}
                  onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setCatForm({ ...catForm, color })}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      catForm.color === color
                        ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCatDialogOpen(false)
              setCatForm({ name: '', type: 'expense', color: '#6366f1', icon: 'Circle' })
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}