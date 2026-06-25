'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, XCircle, Trash2, PartyPopper } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface Notification {
  id: string
  type: 'info' | 'warning' | 'success' | 'error'
  title: string
  message: string
  read: boolean
  createdAt: string
}

const mockNotifications: Notification[] = [
  { id: '1', type: 'success', title: 'Budget Goal Met!', message: 'You stayed under budget for entertainment this month. Great job!', read: false, createdAt: '2025-06-12T10:30:00Z' },
  { id: '2', type: 'warning', title: 'Budget Overrun', message: 'Your food spending is $80 over the planned budget this month.', read: false, createdAt: '2025-06-11T14:20:00Z' },
  { id: '3', type: 'info', title: 'Savings Milestone', message: 'Your Emergency Fund is now 45% complete! Keep going.', read: false, createdAt: '2025-06-10T09:15:00Z' },
  { id: '4', type: 'error', title: 'Debt Payment Due', message: 'Your credit card payment of $500 is due in 3 days.', read: false, createdAt: '2025-06-09T16:00:00Z' },
  { id: '5', type: 'info', title: 'Monthly Report Ready', message: 'Your May 2025 financial report is available for review.', read: true, createdAt: '2025-06-01T08:00:00Z' },
  { id: '6', type: 'success', title: 'Income Received', message: 'Monthly salary of $5,200 has been received.', read: true, createdAt: '2025-06-01T07:00:00Z' },
  { id: '7', type: 'warning', title: 'Savings Goal Behind', message: 'Your vacation savings goal is only 40% complete with 2 months remaining.', read: true, createdAt: '2025-05-28T12:00:00Z' },
  { id: '8', type: 'info', title: 'New Feature Available', message: 'AI Assistant is now available! Get personalized financial advice.', read: true, createdAt: '2025-05-25T10:00:00Z' },
]

const typeConfig = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', borderColor: 'border-l-blue-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', borderColor: 'border-l-amber-500' },
  success: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', borderColor: 'border-l-emerald-500' },
  error: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', borderColor: 'border-l-rose-500' },
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(days / 365)
  return `${years}y ago`
}

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { user, setUnreadCount } = useAppStore()

  useEffect(() => {
    let cancelled = false
    const doFetch = async () => {
      try {
        const res = await fetch(`/api/notifications?accountId=${user?.id}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          const list = (data.notifications || data || []).map((n: Record<string, unknown>) => ({
            ...n,
            read: n.isRead ?? n.read ?? false,
          }))
          setNotifications(list)
          setUnreadCount(list.filter((n: Notification) => !n.read).length)
          setLoading(false)
          return
        }
      } catch { /* fallback */ }
      if (!cancelled) {
        setNotifications(mockNotifications)
        setUnreadCount(mockNotifications.filter((n) => !n.read).length)
        setLoading(false)
      }
    }
    doFetch()
    return () => { cancelled = true }
  }, [setUnreadCount])

  const markAsRead = async (id: string) => {
    try { await fetch(`/api/notifications/${id}`, { method: 'PUT' }) } catch { /* ok */ }
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(notifications.filter((n) => n.id !== id && !n.read).length)
  }

  const markAllRead = async () => {
    try { await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: user?.id }) }) } catch { /* ok */ }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    toast.success('All notifications marked as read')
  }

  const deleteNotification = async (id: string) => {
    try { await fetch(`/api/notifications/${id}?accountId=${user?.id}`, { method: 'DELETE' }) } catch { /* ok */ }
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const allRead = notifications.length > 0 && unreadCount === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="module-header">
          <h1 className="text-2xl font-bold text-gradient">Notificaciones</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-2" /> Mark all as read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state rounded-xl text-center py-16 px-6 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No notifications</p>
          <p className="text-sm mt-1">You&apos;re all caught up!</p>
        </div>
      ) : allRead ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="empty-state rounded-xl text-center py-16 px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <PartyPopper className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="text-lg font-semibold text-foreground">All caught up! 🎉</p>
            <p className="text-sm text-muted-foreground mt-1">You have no unread notifications</p>
          </div>

          <div className="space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto pr-1 mt-4">
            {notifications.map((notif, idx) => {
              const config = typeConfig[notif.type]
              const Icon = config.icon

              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group"
                >
                  <Card className="card-hover cursor-pointer transition-all border-l-4 opacity-60 hover:opacity-100 hover:translate-x-1"
                    style={{ borderLeftColor: notif.type === 'success' ? '#10b981' : notif.type === 'warning' ? '#f59e0b' : notif.type === 'error' ? '#f43f5e' : '#3b82f6' }}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <div className={cn('p-2 rounded-lg shrink-0', config.bg)}>
                          <Icon className={cn('w-4 h-4', config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-medium text-muted-foreground">{notif.title}</h3>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[11px] text-muted-foreground">{timeAgo(notif.createdAt)}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id) }}
                              >
                                <Trash2 className="w-3 h-3 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm mt-0.5 text-muted-foreground/70 truncate">{notif.message}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
          {notifications.map((notif, idx) => {
            const config = typeConfig[notif.type]
            const Icon = config.icon

            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="group"
              >
                <Card
                  className={cn(
                    'card-hover cursor-pointer transition-all border-l-4 hover:translate-x-1',
                    config.borderColor,
                    !notif.read && 'bg-primary/[0.02] dark:bg-primary/[0.05]'
                  )}
                  onClick={() => !notif.read && markAsRead(notif.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className={cn('p-2 rounded-lg shrink-0', config.bg)}>
                        <Icon className={cn('w-4 h-4', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h3 className={cn('text-sm font-semibold', !notif.read && 'text-foreground')}>
                              {notif.title}
                            </h3>
                            {!notif.read && (
                              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[11px] text-muted-foreground">
                              {timeAgo(notif.createdAt)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id) }}
                            >
                              <Trash2 className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                        <p className={cn(
                          'text-sm mt-0.5',
                          notif.read ? 'text-muted-foreground' : 'text-foreground/80'
                        )}>
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}