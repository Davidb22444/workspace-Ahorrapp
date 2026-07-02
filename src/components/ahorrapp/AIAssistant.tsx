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

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [shareData, setShareData] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)
  const { user } = useAppStore()
  const hasUserMessages = messages.some((m) => m.role === 'user')

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

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: content, accountId: user?.id, includeFinancialData: shareData }),
      })
      if (res.ok) {
        const data = await res.json()
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
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
      id: (Date.now() + 1).toString(),
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
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex-shrink-0 mb-4">
        <div className="module-header">
          <h1 className="text-2xl font-bold text-gradient">Asistente IA</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Tu asesor financiero impulsado por IA</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          {/* Messages or Empty State */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
            {!hasUserMessages && !loading ? (
              /* Welcome Empty State */
              <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6"
                >
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                    <Wallet className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-1">Pregúntame lo que quieras sobre tus finanzas</h2>
                  <p className="text-sm text-muted-foreground">
                    Puedo ayudarte con estrategias de ahorro, análisis de gastos, planificación de presupuesto y más.
                  </p>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {QUICK_QUESTIONS.map((q) => (
                      <button
                        key={q.label}
                        onClick={() => sendMessage(q.label)}
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-muted hover:bg-accent text-sm text-foreground transition-colors border border-border hover:border-primary/30 text-left"
                      >
                        <span className="text-lg">{q.icon}</span>
                        <span className="font-medium">{q.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
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
              <div className="space-y-4 max-w-3xl mx-auto">
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
                    <div className="max-w-[80%]">
                      <div className={cn(
                        'px-4 py-3',
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

          {/* Quick Questions (show after first message) */}
          {hasUserMessages && !loading && (
            <div className="px-4 pb-3 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Preguntas rápidas
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => sendMessage(q.label)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-accent text-sm text-foreground transition-colors"
                  >
                    <span>{q.icon}</span>
                    <span>{q.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex-shrink-0 p-4 border-t border-border">
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-1"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                disabled={loading || !input.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <div className="max-w-3xl mx-auto mt-1.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShareData(!shareData)}
                className="inline-flex items-center gap-1 text-[10px] transition-colors"
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