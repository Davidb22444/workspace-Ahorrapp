import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { z } from 'zod'

const aiRequestSchema = z.object({
  question: z.string().min(1),
  context: z.record(z.unknown()).optional(),
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
    const body = await request.json()
    const parsed = aiRequestSchema.parse(body)

    let financialContext = ''

    if (parsed.accountId) {
      // Gather financial summary for context
      const [incomeResult, expenseResult, debtResult, savingsResult] = await Promise.all([
        db.income.aggregate({
          _sum: { amount: true },
          where: { accountId: parsed.accountId },
        }),
        db.expense.aggregate({
          _sum: { amount: true },
          where: { accountId: parsed.accountId },
        }),
        db.debt.aggregate({
          _sum: { totalAmount: true, paidAmount: true },
          where: { accountId: parsed.accountId, status: { in: ['pending', 'partial'] } },
        }),
        db.savingsGoal.aggregate({
          _sum: { targetAmount: true, savedAmount: true },
          where: { accountId: parsed.accountId, status: 'active' },
        }),
      ])

      const totalIncome = incomeResult._sum.amount ?? 0
      const totalExpenses = expenseResult._sum.amount ?? 0
      const totalDebt = (debtResult._sum.totalAmount ?? 0) - (debtResult._sum.paidAmount ?? 0)
      const savingsTarget = savingsResult._sum.targetAmount ?? 0
      const savingsSaved = savingsResult._sum.savedAmount ?? 0

      financialContext = `
Resumen financiero del usuario:
- Ingresos totales: $${totalIncome.toFixed(2)}
- Gastos totales: $${totalExpenses.toFixed(2)}
- Balance: $${(totalIncome - totalExpenses).toFixed(2)}
- Deudas pendientes: $${totalDebt.toFixed(2)}
- Metas de ahorro activas: ${savingsResult._sum.targetAmount ? `Objetivo: $${savingsTarget.toFixed(2)}, Ahorrado: $${savingsSaved.toFixed(2)}` : 'Ninguna'}
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

    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      thinking: { type: 'disabled' },
    })

    const response = completion.choices?.[0]?.message?.content ?? 'Lo siento, no pude generar una respuesta.'

    return NextResponse.json({ response })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('AI assistant error:', error)
    return NextResponse.json(
      { error: 'Failed to generate AI response', response: 'Lo siento, hubo un error al procesar tu pregunta. Por favor intenta de nuevo.' },
      { status: 500 }
    )
  }
}