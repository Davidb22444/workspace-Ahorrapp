import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthFromCookie } from '@/lib/auth-utils'
import { sumField } from '@/lib/supabase-utils'
import ZAI from 'z-ai-web-dev-sdk'
import { z } from 'zod'

const aiRequestSchema = z.object({
  question: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
  accountId: z.string().optional(),
  includeFinancialData: z.boolean().optional().default(false),
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

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function isGreetingMessage(question: string) {
  const text = normalizeText(question)
  return /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|saludos|ola)([!.?,\s]*)$/.test(text)
    || /^(hola|buenas|hey|saludos)\b/.test(text)
}

function isShortNonFinancialMessage(question: string) {
  const text = normalizeText(question)
  if (text.length > 20) return false
  return ['hola', 'buenas', 'hey', 'gracias', 'ok', 'vale', 'listo', 'si', 'no'].includes(text)
}

function isHelpOrCapabilitiesMessage(question: string) {
  const text = normalizeText(question)
  return [
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
  ].some((phrase) => text === phrase || text.startsWith(`${phrase} `))
}

function isCasualSmallTalk(question: string) {
  const text = normalizeText(question)
  return [
    'como estas',
    'que tal',
    'todo bien',
    'buen dia',
    'buen dia,',
    'buenas como estas',
    'que onda',
  ].some((phrase) => text === phrase || text.startsWith(`${phrase} `))
}

function isFinancialIntent(question: string) {
  const text = normalizeText(question)
  return [
    'gasto',
    'gastos',
    'ingreso',
    'ingresos',
    'ahorrar',
    'ahorro',
    'presupuesto',
    'deuda',
    'deudas',
    'invertir',
    'inversion',
    'inversiones',
    'meta',
    'metas',
    'balance',
    'analiza',
    'analizar',
    'revisa',
    'revisar',
    'plan',
    'planificar',
    'suscripcion',
    'suscripciones',
  ].some((term) => text.includes(term))
}

function getFallbackResponse(question: string, financialContext: string) {
  if (financialContext) {
    return `## 💡 Perspectiva Financiera

Basándome en tus datos financieros:

${financialContext}

### Recomendaciones personalizadas:
1. **Rastrea cada gasto** - La conciencia es el primer paso para mejorar
2. **Revisa tus suscripciones** - Los pequeños costos recurrentes se acumulan
3. **Construye un fondo de emergencia** - Apunta a tener 3-6 meses de gastos
4. **Paga primero las deudas con alto interés** - El método avalancha es el más eficiente

¿Te gustaría que analice un aspecto específico de tus finanzas?`
  }

  if (isGreetingMessage(question) || isShortNonFinancialMessage(question) || isHelpOrCapabilitiesMessage(question) || isCasualSmallTalk(question)) {
    return '¡Hola! Soy tu asistente financiero. Puedo ayudarte a revisar gastos, ahorrar más, ordenar tu presupuesto, pagar deudas o analizar tus metas. Si quieres, dime qué necesitas o pregúntame algo como "analiza mis gastos" o "cómo puedo ahorrar más".'
  }

  if (isFinancialIntent(question)) {
    return `## 💡 Te puedo ayudar con eso

Puedo analizar tu situación financiera y darte recomendaciones sobre:
1. **Gastos e ingresos**
2. **Ahorro y metas**
3. **Presupuesto**
4. **Deudas**
5. **Inversiones básicas**

Si quieres, prueba con una pregunta más concreta como:
- "Analiza mis gastos"
- "Cómo puedo ahorrar más"
- "Ayúdame a hacer un presupuesto"`
  }

  return 'No pude generar una respuesta útil en este momento. Prueba a hacer la pregunta de otra forma o usa una de las preguntas rápidas.'
}

function getSuggestedPrompts(question: string) {
  const text = normalizeText(question)

  if (isGreetingMessage(question) || isShortNonFinancialMessage(question) || isCasualSmallTalk(question)) {
    return [
      'Analiza mis gastos',
      'Cómo puedo ahorrar más',
      'Ayúdame con mi presupuesto',
    ]
  }

  if (isHelpOrCapabilitiesMessage(question)) {
    return [
      'Qué puedes hacer',
      'Analiza mis gastos',
      'Recomiéndame un presupuesto',
    ]
  }

  if (text.includes('deuda') || text.includes('deudas')) {
    return [
      'Estrategia para pagar deudas',
      'Cómo priorizar mis deudas',
      'Conviene pagar primero la deuda más cara',
    ]
  }

  if (text.includes('ahorr')) {
    return [
      'Cómo ahorrar más',
      'Metas de ahorro realistas',
      'Cómo crear un fondo de emergencia',
    ]
  }

  return [
    'Analiza mis gastos',
    'Ayúdame con un presupuesto',
    'Cómo puedo ahorrar más',
  ]
}

export async function POST(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const parsed = aiRequestSchema.parse(body)

    if (
      isGreetingMessage(parsed.question) ||
      isShortNonFinancialMessage(parsed.question) ||
      isHelpOrCapabilitiesMessage(parsed.question) ||
      isCasualSmallTalk(parsed.question)
    ) {
      return NextResponse.json({
        response:
          '¡Hola! Soy tu asistente financiero. Puedo ayudarte a revisar gastos, ahorrar más, ordenar tu presupuesto, pagar deudas o analizar tus metas. Si quieres, dime qué necesitas o pregúntame algo como "analiza mis gastos" o "cómo puedo ahorrar más".',
        kind: 'onboarding',
        suggestions: getSuggestedPrompts(parsed.question),
      })
    }

    let financialContext = ''

    if (accountId && parsed.includeFinancialData) {
      const [incomes, expenses, debts, savings] = await Promise.all([
        prisma.incomes.findMany({ where: { account_id: accountId }, select: { amount: true } }),
        prisma.expenses.findMany({ where: { account_id: accountId }, select: { amount: true } }),
        prisma.debts.findMany({ where: { account_id: accountId, status: { in: ['pending', 'partial', 'active'] } }, select: { total_amount: true, paid_amount: true } }),
        prisma.savings_goals.findMany({ where: { account_id: accountId, status: 'active' }, select: { target_amount: true, saved_amount: true } }),
      ])

      const totalIncome = sumField(incomes, 'amount')
      const totalExpenses = sumField(expenses, 'amount')
      const totalDebtTotal = sumField(debts, 'total_amount')
      const totalDebtPaid = sumField(debts, 'paid_amount')
      const totalDebt = totalDebtTotal - totalDebtPaid
      const savingsTarget = sumField(savings, 'target_amount')
      const savingsSaved = sumField(savings, 'saved_amount')

      financialContext = `
Resumen financiero del usuario:
- Ingresos totales: $${totalIncome.toFixed(2)}
- Gastos totales: $${totalExpenses.toFixed(2)}
- Balance: $${(totalIncome - totalExpenses).toFixed(2)}
- Deudas pendientes: $${totalDebt.toFixed(2)}
- Metas de ahorro activas: ${savingsTarget > 0 ? `Objetivo: $${savingsTarget.toFixed(2)}, Ahorrado: $${savingsSaved.toFixed(2)}` : 'Ninguna'}
`.trim()
    }

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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        thinking: { type: 'disabled' },
      })
      response = completion.choices?.[0]?.message?.content ?? ''
    } catch (aiErr) {
      console.warn('ZAI SDK not available, using fallback response:', aiErr)
    }

    if (!response) {
      console.warn('AI assistant returned empty response', {
        accountId,
        includeFinancialData: parsed.includeFinancialData,
      })
      response = getFallbackResponse(parsed.question, financialContext)
    }

    return NextResponse.json({
      response,
      kind: isFinancialIntent(parsed.question) ? 'financial' : 'general',
      suggestions: getSuggestedPrompts(parsed.question),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('AI assistant error:', error)
    return NextResponse.json(
      { response: 'No pude conectar con el asistente en este momento. Revisa la configuración del proveedor de IA y vuelve a intentarlo.' },
      { status: 500 }
    )
  }
}
