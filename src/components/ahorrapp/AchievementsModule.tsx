'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy, Target, DollarSign, PiggyBank, Shield, BarChart3,
  TrendingUp, CheckCircle, Star, Award, Lock, PartyPopper,
  Repeat, Flag, ShoppingCart,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  color: string
  unlocked: boolean
  unlockedDate?: string
  progress?: number
  targetValue?: number
  currentValue?: number
  category: string
}

const ICON_MAP: Record<string, React.ReactNode> = {
  trophy: <Trophy className="w-7 h-7" />,
  target: <Target className="w-7 h-7" />,
  dollar: <DollarSign className="w-7 h-7" />,
  piggybank: <PiggyBank className="w-7 h-7" />,
  shield: <Shield className="w-7 h-7" />,
  barchart: <BarChart3 className="w-7 h-7" />,
  trendingup: <TrendingUp className="w-7 h-7" />,
  star: <Star className="w-7 h-7" />,
  award: <Award className="w-7 h-7" />,
  party: <PartyPopper className="w-7 h-7" />,
  repeat: <Repeat className="w-7 h-7" />,
  flag: <Flag className="w-7 h-7" />,
  cart: <ShoppingCart className="w-7 h-7" />,
}

const mockAchievements: Achievement[] = [
  {
    id: '1', title: 'First Deposit', description: 'Record your first income entry', icon: 'dollar',
    color: '#10b981', unlocked: true, unlockedDate: '2025-01-15', category: 'income',
  },
  {
    id: '2', title: 'Savings Starter', description: 'Save your first $100', icon: 'piggybank',
    color: '#06b6d4', unlocked: true, unlockedDate: '2025-02-10', category: 'savings',
  },
  {
    id: '3', title: 'Budget Master', description: 'Stay under budget for 3 consecutive months', icon: 'target',
    color: '#f59e0b', unlocked: true, unlockedDate: '2025-04-01', category: 'budget',
  },
  {
    id: '4', title: 'Debt Destroyer', description: 'Pay off a debt completely', icon: 'shield',
    color: '#f43f5e', unlocked: true, unlockedDate: '2025-05-20', category: 'debt',
  },
  {
    id: '5', title: 'Thousand Club', description: 'Accumulate $1,000 in total savings', icon: 'award',
    color: '#8b5cf6', unlocked: false, progress: 72, targetValue: 1000, currentValue: 720, category: 'savings',
  },
  {
    id: '6', title: 'Consistency King', description: 'Log expenses for 30 consecutive days', icon: 'repeat',
    color: '#ec4899', unlocked: false, progress: 53, targetValue: 30, currentValue: 16, category: 'consistency',
  },
  {
    id: '7', title: 'Frugal Finder', description: 'Reduce monthly expenses by 10% from baseline', icon: 'cart',
    color: '#14b8a6', unlocked: false, progress: 45, targetValue: 10, currentValue: 4.5, category: 'expenses',
  },
  {
    id: '8', title: 'Milestone $10K', description: 'Reach $10,000 in total savings', icon: 'trophy',
    color: '#f59e0b', unlocked: false, progress: 21, targetValue: 10000, currentValue: 2150, category: 'savings',
  },
  {
    id: '9', title: 'Chart Topper', description: 'View your dashboard every day for a week', icon: 'barchart',
    color: '#6366f1', unlocked: true, unlockedDate: '2025-03-14', category: 'engagement',
  },
  {
    id: '10', title: 'Rising Star', description: 'Increase income month-over-month 3 times', icon: 'trendingup',
    color: '#10b981', unlocked: false, progress: 67, targetValue: 3, currentValue: 2, category: 'income',
  },
  {
    id: '11', title: 'Goal Getter', description: 'Fully fund a savings goal', icon: 'flag',
    color: '#f43f5e', unlocked: false, progress: 30, targetValue: 1, currentValue: 0, category: 'savings',
  },
  {
    id: '12', title: 'Super Saver', description: 'Save 50% of your income in a single month', icon: 'star',
    color: '#06b6d4', unlocked: false, progress: 38, targetValue: 50, currentValue: 19, category: 'savings',
  },
]

export default function AchievementsModule() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAppStore()

  useEffect(() => {
    let cancelled = false
    const doFetch = async () => {
      try {
        const res = await fetch(`/api/achievements?accountId=${user?.id}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          const list = data.achievements || data || []
          if (Array.isArray(list) && list.length > 0) {
            setAchievements(list)
            setLoading(false)
            return
          }
        }
      } catch { /* fallback */ }
      if (!cancelled) {
        setAchievements(mockAchievements)
        setLoading(false)
      }
    }
    doFetch()
    return () => { cancelled = true }
  }, [])

  const unlockedCount = achievements.filter((a) => a.unlocked).length
  const totalCount = achievements.length
  const unlockPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

  const nextMilestone = achievements
    .filter((a) => !a.unlocked && a.progress !== undefined)
    .sort((a, b) => (b.progress || 0) - (a.progress || 0))[0]

  // Circular progress ring SVG values
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (unlockPct / 100) * circumference

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Achievements</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Track your financial milestones</p>
      </div>

      {/* Summary Stats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="stat-card card-hover"><CardContent className="p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>
          <Card className="stat-card card-hover"><CardContent className="p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Unlocked count with circular ring */}
          <Card className="stat-card card-hover card-glow">
            <CardContent className="p-5 flex items-center gap-5">
              <div className="relative w-24 h-24 shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted/50"
                  />
                  <circle
                    cx="50" cy="50" r={radius}
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-700 ease-out"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#059669" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-xl font-bold tabular-nums text-gradient">{unlockedCount}</span>
                    <span className="text-muted-foreground text-sm">/{totalCount}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unlocked</p>
                <p className="text-2xl font-bold text-gradient mt-1">{unlockPct}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">Keep going!</p>
              </div>
            </CardContent>
          </Card>

          {/* Next milestone hint */}
          <Card className="stat-card card-hover">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 shrink-0">
                <Flag className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Next Milestone</p>
                {nextMilestone ? (
                  <>
                    <p className="text-sm font-semibold text-foreground mt-1 truncate">{nextMilestone.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{nextMilestone.progress}% complete</p>
                    <Progress value={nextMilestone.progress} className="h-1.5 mt-2 w-32" />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">All achievements unlocked!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Achievements Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="w-14 h-14 rounded-full mx-auto mb-4" />
                <Skeleton className="h-4 w-3/4 mx-auto mb-2" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : achievements.length === 0 ? (
        <div className="empty-state rounded-xl text-center py-16 px-6 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No achievements yet</p>
          <p className="text-sm mt-1">Start using the app to unlock your first achievement</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children">
          {achievements.map((achievement, idx) => {
            const iconNode = ICON_MAP[achievement.icon] || <Award className="w-7 h-7" />

            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -3 }}
              >
                <Card
                  className={cn(
                    'card-hover overflow-hidden relative',
                    achievement.unlocked ? 'card-glow' : 'opacity-75',
                  )}
                  style={
                    achievement.unlocked
                      ? { '--card-glow-color': `${achievement.color}40` } as React.CSSProperties
                      : undefined
                  }
                >
                  {achievement.unlocked && (
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ background: `linear-gradient(90deg, ${achievement.color}, ${achievement.color}80)` }}
                    />
                  )}
                  <CardContent className="p-5 text-center">
                    {/* Icon Circle */}
                    <div className="relative inline-flex mb-3">
                      <div
                        className={cn(
                          'w-14 h-14 rounded-full flex items-center justify-center',
                          achievement.unlocked ? '' : 'grayscale opacity-50',
                        )}
                        style={{
                          background: achievement.unlocked
                            ? `linear-gradient(135deg, ${achievement.color}20, ${achievement.color}10)`
                            : 'rgba(100,116,139,0.1)',
                          color: achievement.unlocked ? achievement.color : '#94a3b8',
                        }}
                      >
                        {iconNode}
                      </div>
                      {achievement.unlocked && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {!achievement.unlocked && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-muted flex items-center justify-center border border-border">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Title & Description */}
                    <h3
                      className={cn(
                        'text-sm font-semibold mb-1',
                        achievement.unlocked ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {achievement.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {achievement.description}
                    </p>

                    {/* Unlocked state */}
                    {achievement.unlocked && achievement.unlockedDate && (
                      <div className="flex items-center justify-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <PartyPopper className="w-3.5 h-3.5" />
                        <span>Unlocked {format(new Date(achievement.unlockedDate), 'MMM d, yyyy')}</span>
                      </div>
                    )}

                    {/* Locked state with progress */}
                    {!achievement.unlocked && achievement.progress !== undefined && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold tabular-nums" style={{ color: achievement.color }}>
                            {achievement.progress}%
                          </span>
                        </div>
                        <Progress value={achievement.progress} className="h-1.5" />
                      </div>
                    )}

                    {!achievement.unlocked && achievement.progress === undefined && (
                      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Locked</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Category Legend */}
      {!loading && achievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="card-hover">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Categories
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(achievements.map((a) => a.category))).map((cat) => {
                  const count = achievements.filter((a) => a.category === cat).length
                  const unlocked = achievements.filter((a) => a.category === cat && a.unlocked).length
                  return (
                    <Badge key={cat} variant="secondary" className="capitalize text-xs px-2.5 py-1">
                      {cat} ({unlocked}/{count})
                    </Badge>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}