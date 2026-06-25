'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Sparkles, User, Lightbulb, Wallet } from 'lucide-react'
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

const MOCK_RESPONSES: Record<string, string> = {
  '¿Cómo puedo ahorrar más?': `Aquí tienes algunas estrategias comprobadas para aumentar tus ahorros:

## 💰 Mejores Tips de Ahorro

1. **Automatiza tus ahorros** - Configura transferencias automáticas a tu cuenta de ahorros el día de pago
2. **La regla de los 30 días** - Espera 30 días antes de realizar cualquier compra no esencial mayor a $50
3. **Revisa tus suscripciones** - Cancela las suscripciones que no uses (podrías ahorrar $50-100/mes)
4. **Planificación de comidas** - Planifica las comidas semanalmente y cocina en casa (ahorra $200-400/mes)
5. **Ahorro de energía** - Reduce las facturas de servicios un 10-15% con hábitos simples

## 📊 Basado en Tus Datos
- Actualmente estás ahorrando el **20%** de tus ingresos
- Aumentar al **25%** agregaría **$260/mes** extra a tus ahorros
- Tu gasto en alimentación está **13%** por encima del presupuesto recomendado

¿Te gustaría que cree un plan de ahorro detallado?`,
  'Analiza mis gastos': `## 📊 Análisis de Gastos

### Desglose del Mes Actual
| Categoría | Monto | % del Presupuesto | Estado |
|----------|--------|-------------|--------|
| Vivienda | $1,200 | 46% | ✅ En objetivo |
| Alimentación | $680 | 20% | ⚠️ Sobrepasado |
| Transporte | $450 | 13% | ⚠️ Ligeramente sobrepasado |
| Entretenimiento | $320 | 9% | ✅ Debajo del presupuesto |
| Servicios | $380 | 11% | ✅ En objetivo |

### Hallazgos Clave
- El **gasto en alimentación** está $80 por encima de tu presupuesto planeado
- Los **costos de transporte** han aumentado un 15% respecto al mes pasado
- **Entretenimiento** está muy por debajo del presupuesto - ¡excelente trabajo! 🎉
- **Vivienda** es estable en el 23% de los ingresos (rango saludable)

### Recomendaciones
1. Considera preparar comidas para reducir los costos de alimentación
2. Investiga opciones de transporte público para desplazarte
3. Tu presupuesto de entretenimiento podría reducirse más si es necesario`,
  'Recomendaciones de presupuesto': `## 📋 Recomendaciones de Presupuesto

### Asignación Sugerida 50/30/20

Basado en tus ingresos de **$5,200/mes**:

| Categoría | Monto | Tu Actual | Diferencia |
|----------|--------|-------------|------------|
| **Necesidades** (50%) | $2,600 | $2,510 | +$90 sobrante |
| **Deseos** (30%) | $1,560 | $1,480 | +$80 sobrante |
| **Ahorros** (20%) | $1,040 | $770 | -$270 déficit |

### ⚠️ Acciones a Tomar
1. **Prioriza el ahorro** - Solo estás ahorrando 14.8% en lugar del 20%
2. **Redirige el sobrante** - Mueve los $170 sobrantes de necesidades/deseos a ahorros
3. **Configura ahorros automáticos** - Conviértelo en la primera "factura" que pagas cada mes
4. **Revisa las necesidades** - Asegúrate de que todas las "necesidades" sean realmente esenciales

### 🎯 Meta Ambiciosa
Intenta aumentar los ahorros al **25%** en los próximos 3 meses mediante:
- Reducir el desperdicio de alimentos
- Negociar facturas
- Encontrar una fuente de ingresos adicional`,
}

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const { user } = useAppStore()
  const hasUserMessages = messages.some((m) => m.role === 'user')

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
        body: JSON.stringify({ question: content, accountId: user?.id }),
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

    // Fallback to mock responses
    setTimeout(() => {
      const matchedKey = Object.keys(MOCK_RESPONSES).find((k) => content.toLowerCase().includes(k.toLowerCase()))
      const response = matchedKey
        ? MOCK_RESPONSES[matchedKey]
        : `¡Excelente pregunta! Basándome en tus datos financieros, esto es lo que te sugeriría:

## Perspectiva Financiera 💡

Aunque necesitaría más contexto para darte una respuesta completamente personalizada, aquí hay algunos consejos generales:

1. **Rastrea cada gasto** - La conciencia es el primer paso para mejorar
2. **Revisa tus suscripciones** - Los pequeños costos recurrentes se acumulan
3. **Construye un fondo de emergencia** - Apunta a tener 3-6 meses de gastos
4. **Paga primero las deudas con alto interés** - El método avalancha es el que más ahorra

¿Te gustaría que analice un aspecto específico de tus finanzas? ¡Prueba una de las preguntas rápidas para obtener información más detallada!`

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setLoading(false)
    }, 1200)
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}