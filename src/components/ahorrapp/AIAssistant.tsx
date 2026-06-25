'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader2, Sparkles, User, Lightbulb } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const QUICK_QUESTIONS = [
  { icon: '💰', label: 'How can I save more?' },
  { icon: '📊', label: 'Analyze my expenses' },
  { icon: '📋', label: 'Budget recommendations' },
  { icon: '💳', label: 'Debt payoff strategy' },
  { icon: '📈', label: 'Investment advice' },
  { icon: '🎯', label: 'Savings goal tips' },
]

const MOCK_RESPONSES: Record<string, string> = {
  'How can I save more?': `Here are some proven strategies to boost your savings:

## 💰 Top Savings Tips

1. **Automate your savings** - Set up automatic transfers to your savings account on payday
2. **The 30-day rule** - Wait 30 days before making any non-essential purchase over $50
3. **Review subscriptions** - Cancel unused subscriptions (you might save $50-100/month)
4. **Meal planning** - Plan meals weekly and cook at home (saves $200-400/month)
5. **Energy savings** - Reduce utility bills by 10-15% with simple habits

## 📊 Based on Your Data
- You're currently saving **20%** of your income
- Increasing to **25%** would add an extra **$260/month** to your savings
- Your food spending is **13%** above the recommended budget

Would you like me to create a detailed savings plan?`,
  'Analyze my expenses': `## 📊 Expense Analysis

### Current Month Breakdown
| Category | Amount | % of Budget | Status |
|----------|--------|-------------|--------|
| Housing | $1,200 | 46% | ✅ On target |
| Food | $680 | 20% | ⚠️ Over budget |
| Transport | $450 | 13% | ⚠️ Slightly over |
| Entertainment | $320 | 9% | ✅ Under budget |
| Utilities | $380 | 11% | ✅ On target |

### Key Findings
- **Food spending** is $80 over your planned budget
- **Transport costs** have increased 15% from last month
- **Entertainment** is well under budget - great job! 🎉
- **Housing** is stable at 23% of income (healthy range)

### Recommendations
1. Consider meal prepping to reduce food costs
2. Look into public transit options for commuting
3. Your entertainment budget could be reduced further if needed`,
  'Budget recommendations': `## 📋 Budget Recommendations

### Suggested 50/30/20 Allocation

Based on your income of **$5,200/month**:

| Category | Amount | Your Current | Difference |
|----------|--------|-------------|------------|
| **Needs** (50%) | $2,600 | $2,510 | +$90 surplus |
| **Wants** (30%) | $1,560 | $1,480 | +$80 surplus |
| **Savings** (20%) | $1,040 | $770 | -$270 deficit |

### ⚠️ Action Items
1. **Prioritize savings** - You're only saving 14.8% instead of 20%
2. **Redirect surplus** - Move the $170 surplus from needs/wants to savings
3. **Set up automatic savings** - Make it the first "bill" you pay each month
4. **Review needs** - Make sure all "needs" are truly essential

### 🎯 Stretch Goal
Try increasing savings to **25%** over the next 3 months by:
- Reducing food waste
- Negotiating bills
- Finding a side income source`,
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! 👋 I'm your AI financial assistant. I can help you with:

- **Savings strategies** and goal planning
- **Expense analysis** and optimization
- **Budget recommendations** based on the 50/30/20 rule
- **Debt payoff** strategies
- **General financial** advice

Click a quick question below or type your own!`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { user } = useAppStore()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

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
          content: data.response || data.message || 'I could not process that request.',
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
        : `Great question! Based on your financial data, here's what I'd suggest:

## Financial Insight 💡

While I'd need more context to give you a fully personalized answer, here are some general tips:

1. **Track every expense** - Awareness is the first step to improvement
2. **Review your subscriptions** - Small recurring costs add up
3. **Build an emergency fund** - Aim for 3-6 months of expenses
4. **Pay high-interest debt first** - The avalanche method saves the most

Would you like me to analyze a specific aspect of your finances? Try one of the quick questions for more detailed insights!`

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
        <h1 className="text-2xl font-bold text-foreground">Asistente IA</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Your AI-powered financial advisor</p>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {msg.role === 'assistant' && (
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted rounded-tl-sm'
                  )}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ol]:mb-2 [&_table]:text-xs [&_th]:p-1.5 [&_td]:p-1.5 [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:mt-2 [&_h3]:mb-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center mt-1">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Questions (show when no user messages) */}
          {messages.length <= 1 && !loading && (
            <div className="px-4 pb-3 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Quick questions
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
                placeholder="Ask me anything about your finances..."
                className="flex-1"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                disabled={loading || !input.trim()}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}