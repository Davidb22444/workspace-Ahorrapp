'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { User, Mail, Moon, Sun, DollarSign, Shield, LogOut } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
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

export default function SettingsPanel() {
  const { user, logout } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [currency, setCurrency] = useState('USD')
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')

  const handleSaveProfile = () => {
    if (!name || !email) {
      toast.error('Please fill in all fields')
      return
    }
    toast.success('Profile updated')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
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
    </div>
  )
}