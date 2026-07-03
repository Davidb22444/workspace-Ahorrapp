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
import { Loading } from '@/components/ui/loading'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useFormatCurrency } from '@/lib/format-currency'

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

export default function AchievementsModule() {
  const formatCurrency = useFormatCurrency()
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
        setAchievements([])
        setLoading(false)
      }
    }
    doFetch()
    return () => { cancelled = true }
  }, [user?.id])

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
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h1 className="text-2xl font-bold text-gradient">Logros</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">Rastrea tus metas financieras</p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 200 }}
          className="hidden sm:block"
        >
          <span className="text-6xl inline-block" role="img" aria-label="Logros">🏆</span>
        </motion.div>
      </div>

      {/* Summary Stats */}
      {loading ? (
        <Loading />
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Desbloqueado</p>
                <p className="text-2xl font-bold text-gradient mt-1">{unlockPct}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">¡Sigue así!</p>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Próxima Meta</p>
                {nextMilestone ? (
                  <>
                    <p className="text-sm font-semibold text-foreground mt-1 truncate">{nextMilestone.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{nextMilestone.progress}% completado</p>
                    <Progress value={nextMilestone.progress} className="h-1.5 mt-2 w-32" />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">¡Todos los logros desbloqueados!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Achievements Grid */}
      {loading ? (
        <Loading />
      ) : achievements.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-state rounded-xl text-center py-16 px-6 text-muted-foreground"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-4"
          >
            <span className="text-6xl mb-2 inline-block">📭</span>
          </motion.div>
          <p className="text-lg font-medium">Sin logros aún</p>
          <p className="text-sm mt-1">Comienza a usar la app para desbloquear tu primer logro</p>
        </motion.div>
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
                        <span>Desbloqueado el {format(new Date(achievement.unlockedDate), 'MMM d, yyyy')}</span>
                      </div>
                    )}

                    {/* Locked state with progress */}
                    {!achievement.unlocked && achievement.progress !== undefined && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progreso</span>
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
                        <span>Bloqueado</span>
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
                Categorías
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(achievements.map((a) => a.category))).map((cat, idx) => {
                  const count = achievements.filter((a) => a.category === cat).length
                  const unlocked = achievements.filter((a) => a.category === cat && a.unlocked).length
                  return (
                    <Badge key={cat || `cat-${idx}`} variant="secondary" className="capitalize text-xs px-2.5 py-1">
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