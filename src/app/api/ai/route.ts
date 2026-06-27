import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthFromCookie } from '@/lib/auth-utils'
import { sumField } from '@/lib/supabase-utils'
import ZAI from 'z-ai-web-dev-sdk'
import { z } from 'zod'

const aiRequestSchema = z.object({
  question: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
  accountId: z.string().optional(),
})

const SYSTEM_PROMPT = `Eres AhorrApp AI, un asistente financiero personal experto. Ayudas a los usuarios a:
- Analizar sus gastos e ingresos
- Dar consejos de ahorro personalizados
- Sugerir presupuestos basados en 50/30/20
- Explicar conceptos financieros de forma simple
- Recomendar estrategias para reducir deudas
- Sugerir metas de ahorro realistas
- Responder preguntas sobre finanzas personales

Siempre responde en español, de forma clara y concisa. Si el usuario comparte datos financieros, úsalos para dar consejos personalizados.`

export async function POST(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const parsed = aiRequestSchema.parse(body)

    let financialContext = ''

    if (accountId) {
      // Gather financial summary for context
      const [incomeRes, expenseRes, debtRes, savingsRes] = await Promise.all([
        supabase.from('incomes').select('amount').eq('account_id', accountId),
        supabase.from('expenses').select('amount').eq('account_id', accountId),
        supabase.from('debts').select('total_amount, paid_amount').eq('account_id', accountId).in('status', ['pending', 'partial', 'active']),
        supabase.from('savings_goals').select('target_amount, saved_amount').eq('account_id', accountId).eq('status', 'active'),
      ])

      const totalIncome = sumField(incomeRes.data || [], 'amount')
      const totalExpenses = sumField(expenseRes.data || [], 'amount')
      const totalDebtTotal = sumField(debtRes.data || [], 'total_amount')
      const totalDebtPaid = sumField(debtRes.data || [], 'paid_amount')
      const totalDebt = totalDebtTotal - totalDebtPaid
      const savingsTarget = sumField(savingsRes.data || [], 'target_amount')
      const savingsSaved = sumField(savingsRes.data || [], 'saved_amount')

      financialContext = `
Resumen financiero del usuario:
- Ingresos totales: $${totalIncome.toFixed(2)}
- Gastos totales: $${totalExpenses.toFixed(2)}
- Balance: $${(totalIncome - totalExpenses).toFixed(2)}
- Deudas pendientes: $${totalDebt.toFixed(2)}
- Metas de ahorro activas: ${savingsTarget > 0 ? `Objetivo: $${savingsTarget.toFixed(2)}, Ahorrado: $${savingsSaved.toFixed(2)}` : 'Ninguna'}
`.trim()
    }

    // Merge any additional context passed by the client
    let fullContext = financialContext
    if (parsed.context && Object.keys(parsed.context).length > 0) {
      fullContext += '\n\nContexto adicional del usuario:\n' + JSON.stringify(parsed.context, null, 2)
    }

    const userMessage = fullContext
      ? `[Datos financieros del usuario]:\n${fullContext}\n\n[Pregunta del usuario]: ${parsed.question}`
      : parsed.question

    let response = ''
    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        thinking: { type: 'disabled' },
      })
      response = completion.choices?.[0]?.message?.content ?? ''
    } catch (aiErr) {
      console.warn('ZAI SDK not available, using fallback response:', aiErr)
    }

    // Fallback: build a context-aware response from the financial data
    if (!response) {
      if (financialContext) {
        response = `## 💡 Perspectiva Financiera\n\nBasándome en tus datos financieros:\n\n${financialContext}\n\n### Recomendaciones personalizadas:\n1. **Rastrea cada gasto** - La conciencia es el primer paso para mejorar\n2. **Revisa tus suscripciones** - Los pequeños costos recurrentes se acumulan\n3. **Construye un fondo de emergencia** - Apunta a tener 3-6 meses de gastos\n4. **Paga primero las deudas con alto interés** - El método avalancha es el más eficiente\n\n¿Te gustaría que analice un aspecto específico de tus finanzas?`
      } else {
        response = `## 💡 Consejos Financieros Generales\n\n1. **Rastrea cada gasto** - La conciencia es el primer paso para mejorar\n2. **Revisa tus suscripciones** - Los pequeños costos recurrentes se acumulan\n3. **Construye un fondo de emergencia** - Apunta a tener 3-6 meses de gastos\n4. **Paga primero las deudas con alto interés** - El método avalancha es el que más ahorra\n\n¿Te gustaría que analice un aspecto específico de tus finanzas? ¡Prueba una de las preguntas rápidas!`
      }
    }

    return NextResponse.json({ response })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('AI assistant error:', error)
    return NextResponse.json({ response: 'Lo siento, hubo un error al procesar tu pregunta. Por favor intenta de nuevo.' })
  }
}