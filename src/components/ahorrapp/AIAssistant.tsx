'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Sparkles, User, Lightbulb, Wallet, Shield, ShieldOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AssistantSuggestion {
  label: string
}

let messageIdCounter = 0

const QUICK_QUESTIONS = [
  { icon: '💰', label: '¿Cómo puedo ahorrar más?' },
  { icon: '📊', label: 'Analiza mis gastos' },
  { icon: '📋', label: 'Recomendaciones de presupuesto' },
  { icon: '💳', label: 'Estrategia de pago de deudas' },
  { icon: '📈', label: 'Consejos de inversión' },
  { icon: '🎯', label: 'Tips para metas de ahorro' },
]

function timeAgo(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Ahora mismo'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

function createMessageId() {
  messageIdCounter += 1
  return `msg-${messageIdCounter}`
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function isGreetingOrHelp(text: string) {
  const normalized = normalizeText(text)
  return (
    /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|saludos|ola)([!.?,\s]*)$/.test(normalized) ||
    /^(hola|buenas|hey|saludos)\b/.test(normalized) ||
    [
      'que puedes hacer',
      'que haces',
      'como me ayudas',
      'ayudame',
      'ayuda',
      'no se que preguntar',
      'que puedo preguntarte',
      'como funciona',
      'explicame',
      'necesito ayuda',
      'como estas',
      'que tal',
      'todo bien',
      'buen dia',
      'que onda',
      'gracias',
      'ok',
      'vale',
      'listo',
      'si',
      'no',
    ].includes(normalized)
  )
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [shareData, setShareData] = useState(false)
  const [assistantSuggestions, setAssistantSuggestions] = useState<AssistantSuggestion[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)
  const { user, dashboardData } = useAppStore()
  const hasUserMessages = messages.some((m) => m.role === 'user')
  const hasDebt = typeof dashboardData?.totalDebt === 'number' && dashboardData.totalDebt > 0
  const hasSavingsGoals = Array.isArray(dashboardData?.savingsGoals) && dashboardData.savingsGoals.length > 0
  const hasNegativeBalance = typeof dashboardData?.balance === 'number' && dashboardData.balance < 0
  const onboardingQuestions = hasDebt
    ? QUICK_QUESTIONS.filter((q) => /deudas|presupuesto|ahorrar/i.test(q.label)).slice(0, 3)
    : hasNegativeBalance
      ? QUICK_QUESTIONS.filter((q) => /gastos|presupuesto|ahorrar/i.test(q.label)).slice(0, 3)
      : hasSavingsGoals
        ? QUICK_QUESTIONS.filter((q) => /ahorro|invers/i.test(q.label) || /metas/i.test(q.label)).slice(0, 3)
        : QUICK_QUESTIONS.slice(0, 3)

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const sendMessage = async (content: string) => {
    if (!content.trim()) return

    const localQuickReply = isGreetingOrHelp(content)
      ? '¡Hola! Soy tu asistente financiero. Puedo ayudarte a revisar gastos, ahorrar más, ordenar tu presupuesto, pagar deudas o analizar tus metas. Si quieres, dime qué necesitas o pregúntame algo como "analiza mis gastos" o "cómo puedo ahorrar más".'
      : ''

    const userMsg: Message = {
      id: createMessageId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setAssistantSuggestions([])

    if (localQuickReply) {
      const assistantMsg: Message = {
        id: createMessageId(),
        role: 'assistant',
        content: localQuickReply,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setAssistantSuggestions([
        { label: 'Analiza mis gastos' },
        { label: 'Cómo puedo ahorrar más' },
        { label: 'Ayúdame con mi presupuesto' },
      ])
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question: content, accountId: user?.id, includeFinancialData: shareData }),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.suggestions)) {
          setAssistantSuggestions(data.suggestions.map((label: string) => ({ label })))
        }
        const assistantMsg: Message = {
          id: createMessageId(),
          role: 'assistant',
          content: data.response || data.message || 'No pude procesar esa solicitud.',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        setLoading(false)
        return
      }
    } catch { /* fallback */ }

    // Fallback error message
    const assistantMsg: Message = {
      id: createMessageId(),
      role: 'assistant',
      content: 'Lo siento, no pude conectarme con el asistente. Intenta de nuevo más tarde.',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, assistantMsg])
    setLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] min-h-[640px]">
      <div className="flex-shrink-0 mb-4">
        <div className="module-header">
          <h1 className="text-2xl sm:text-3xl font-bold text-gradient">Asistente IA</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-0.5">Tu asesor financiero impulsado por IA</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          {/* Messages or Empty State */}
          {/* ScrollArea does not forward refs in this wrapper, so we keep the existing cast here. */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <ScrollArea className="flex-1 min-h-0 px-3 py-4 sm:px-4" ref={scrollRef as any}>
            {!hasUserMessages && !loading ? (
              /* Welcome Empty State */
              <div className="flex flex-col items-center justify-center min-h-full w-full max-w-2xl mx-auto text-center py-6 sm:py-10">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                    <Wallet className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 leading-tight px-2">
                    {user?.name ? `Hola, ${user.name}` : 'Pregúntame lo que quieras sobre tus finanzas'}
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-2">
                    Puedo ayudarte con estrategias de ahorro, análisis de gastos, planificación de presupuesto y más.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  className="w-full max-w-2xl"
                >
                  <div className="rounded-2xl border border-border bg-muted/60 p-4 text-left">
                    <p className="text-sm font-semibold text-foreground">
                      {user?.name ? 'Empieza con una ruta rápida' : 'Empieza con una opción rápida'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Elige una acción para que te guíe paso a paso.
                    </p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {onboardingQuestions.map((q) => (
                        <button
                          key={q.label}
                          onClick={() => sendMessage(q.label)}
                          className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-left transition-colors hover:bg-accent"
                        >
                          <span className="text-base shrink-0">{q.icon}</span>
                          <span className="font-medium leading-snug">{q.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="w-full"
                >
                  <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Prueba una pregunta rápida
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full">
                    {QUICK_QUESTIONS.map((q) => (
                      <button
                        key={q.label}
                        onClick={() => sendMessage(q.label)}
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-muted hover:bg-accent text-sm text-foreground transition-colors border border-border hover:border-primary/30 text-left min-h-16 w-full"
                      >
                        <span className="text-lg shrink-0">{q.icon}</span>
                        <span className="font-medium leading-snug">{q.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 w-full">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">Privacidad de datos</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Activa esta opción para compartir tus datos financieros (ingresos, gastos, deudas, metas de ahorro) con el asistente y recibir consejos personalizados.
                        </p>
                        <label className="inline-flex items-center gap-2 mt-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={shareData}
                            onChange={(e) => setShareData(e.target.checked)}
                            className="w-4 h-4 rounded border-border accent-primary"
                          />
                          <span className="text-sm text-foreground">
                            {shareData ? 'Compartiendo datos financieros' : 'No compartir datos financieros'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            ) : (
              /* Chat Messages */
              <div className="space-y-4 max-w-3xl mx-auto w-full">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    {msg.role === 'assistant' && (
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="max-w-[92%] sm:max-w-[80%] min-w-0">
                      <div className={cn(
                        'px-4 py-3 break-words overflow-hidden',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
                          : 'bg-muted rounded-2xl rounded-tl-sm'
                      )}>
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ol]:mb-2 [&_table]:text-xs [&_th]:p-1.5 [&_td]:p-1.5 [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:mt-2 [&_h3]:mb-1">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                      <p className={cn(
                        'text-[10px] mt-1',
                        msg.role === 'user' ? 'text-right' : 'text-left'
                      )}>
                        <span className="text-muted-foreground">{timeAgo(msg.timestamp)}</span>
                      </p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center mt-1">
                        <User className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Typing Indicator */}
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 justify-start"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-1.5 h-5">
                        <motion.span
                          className="w-2 h-2 rounded-full bg-primary/60"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        />
                        <motion.span
                          className="w-2 h-2 rounded-full bg-primary/60"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                        />
                        <motion.span
                          className="w-2 h-2 rounded-full bg-primary/60"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </ScrollArea>

          {assistantSuggestions.length > 0 && !loading && (
            <div className="px-3 sm:px-4 pb-3">
              <div className="rounded-2xl border border-border bg-muted/60 p-3 sm:p-4">
                <p className="text-xs font-semibold text-foreground">Puedes continuar con esto</p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {assistantSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => sendMessage(suggestion.label)}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-left transition-colors hover:bg-accent"
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Questions (show after first message) */}
          {hasUserMessages && !loading && (
            <div className="px-3 sm:px-4 pb-3 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Preguntas rápidas
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => sendMessage(q.label)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-accent text-sm text-foreground transition-colors max-w-full"
                  >
                    <span>{q.icon}</span>
                    <span className="whitespace-normal text-left">{q.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex-shrink-0 p-3 sm:p-4 border-t border-border">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-3xl mx-auto w-full">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-1 w-full"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 w-full sm:w-10"
                disabled={loading || !input.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <div className="max-w-3xl mx-auto mt-1.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShareData(!shareData)}
                className="inline-flex items-center gap-1 text-[10px] transition-colors text-left"
              >
                {shareData ? (
                  <>
                    <Shield className="w-3 h-3 text-green-500" />
                    <span className="text-green-600 dark:text-green-400 font-medium">Compartiendo datos financieros</span>
                  </>
                ) : (
                  <>
                    <ShieldOff className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Datos financieros no compartidos</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
