import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthFromCookie } from '@/lib/auth-utils'

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentRow.push(currentField.trim())
        currentField = ''
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
          i++
        }
        currentRow.push(currentField.trim())
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow)
        }
        currentRow = []
        currentField = ''
      } else {
        currentField += char
      }
    }
  }

  currentRow.push(currentField.trim())
  if (currentRow.some((f) => f.length > 0)) {
    rows.push(currentRow)
  }

  return rows
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '')
}

type ImportType = 'income' | 'expense' | 'all'

function detectType(headers: string[]): ImportType {
  const normalized = headers.map(normalizeHeader)

  const hasSource = normalized.some((h) => h === 'source')
  const hasDescription = normalized.some((h) => h === 'description')
  const hasCategory = normalized.some((h) => h === 'category')
  const hasAmount = normalized.some((h) => h === 'amount')

  if (hasSource && hasAmount) {
    if (hasCategory) return 'expense'
    return 'income'
  }
  if (hasDescription && hasAmount && hasCategory) return 'expense'

  if (normalized.some((h) => h === 'type')) return 'all'

  return 'income'
}

function getColumnIndex(headers: string[], targets: string[]): number {
  const normalized = headers.map(normalizeHeader)
  for (const target of targets) {
    const idx = normalized.indexOf(normalizeHeader(target))
    if (idx !== -1) return idx
  }
  return -1
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_ROWS = 1000
const ALLOWED_MIME_TYPES = ['text/csv', 'text/plain', 'application/vnd.ms-excel']
const ALLOWED_EXTENSIONS = ['.csv']

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const cookieAccountId = getAuthFromCookie(request)
    if (!cookieAccountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const typeParam = formData.get('type') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'file is required' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 413 }
      )
    }

    const fileName = file.name.toLowerCase()
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext))
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: 'Invalid file type. Only .csv files are allowed.' },
        { status: 400 }
      )
    }

    const validTypes: ImportType[] = ['income', 'expense', 'all']
    let importType: ImportType = (typeParam as ImportType) || 'all'
    if (!validTypes.includes(importType)) {
      importType = 'all'
    }

    const text = await file.text()
    const rows = parseCSV(text)

    if (rows.length < 2) {
      return NextResponse.json({
        imported: 0,
        errors: ['CSV file is empty or has no data rows'],
      })
    }

    if (rows.length > MAX_ROWS + 1) {
      return NextResponse.json({
        imported: 0,
        errors: [`CSV has too many rows (max ${MAX_ROWS} data rows).`],
      })
    }

    const headers = rows[0]
    const dataRows = rows.slice(1)

    let effectiveType = importType
    if (effectiveType === 'all') {
      effectiveType = detectType(headers)
    }

    let imported = 0
    const errors: string[] = []

    if (effectiveType === 'income') {
      const srcIdx = getColumnIndex(headers, ['source'])
      const amtIdx = getColumnIndex(headers, ['amount'])
      const descIdx = getColumnIndex(headers, ['description'])
      const dateIdx = getColumnIndex(headers, ['date'])
      const freqIdx = getColumnIndex(headers, ['frequency'])

      if (srcIdx === -1 || amtIdx === -1) {
        return NextResponse.json({
          imported: 0,
          errors: ['Income CSV must have "source" and "amount" columns'],
        })
      }

      const incomeRows: Record<string, unknown>[] = []

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i]
        try {
          const source = row[srcIdx]
          const amountStr = row[amtIdx]
          const amount = parseFloat(amountStr.replace(/[$,]/g, ''))

          if (!source || isNaN(amount) || amount <= 0) {
            errors.push(`Row ${i + 2}: Invalid source or amount`)
            continue
          }

          const description = descIdx !== -1 ? row[descIdx] : undefined
          const dateStr = dateIdx !== -1 ? row[dateIdx] : undefined
          const frequency = freqIdx !== -1 ? row[freqIdx] : 'monthly'

          incomeRows.push({
            source,
            amount,
            description: description || null,
            date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
            frequency,
            account_id: cookieAccountId,
          })

          imported++
        } catch (err) {
          errors.push(`Row ${i + 2}: Failed to import - ${(err as Error).message}`)
        }
      }

      if (incomeRows.length > 0) {
        try {
          await prisma.incomes.createMany({ data: incomeRows as any })
        } catch (err: any) {
          errors.push(`Batch insert error: ${err.message}`)
          imported -= incomeRows.length
        }
      }
    } else if (effectiveType === 'expense') {
      const descIdx = getColumnIndex(headers, ['description'])
      const amtIdx = getColumnIndex(headers, ['amount'])
      const dateIdx = getColumnIndex(headers, ['date'])
      const catIdx = getColumnIndex(headers, ['category', 'categoryid'])
      const recIdx = getColumnIndex(headers, ['isrecurring', 'recurring'])

      if (descIdx === -1 || amtIdx === -1) {
        return NextResponse.json({
          imported: 0,
          errors: ['Expense CSV must have "description" and "amount" columns'],
        })
      }

      const allCats = await prisma.categories.findMany({
        where: { account_id: cookieAccountId },
        select: { id: true, name: true },
      })

      const catNameMap = new Map<string, string>()
      for (const c of allCats) {
        catNameMap.set(c.name.toLowerCase(), c.id)
      }

      const expenseRows: Record<string, unknown>[] = []

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i]
        try {
          const description = row[descIdx]
          const amountStr = row[amtIdx]
          const amount = parseFloat(amountStr.replace(/[$,]/g, ''))

          if (!description || isNaN(amount) || amount <= 0) {
            errors.push(`Row ${i + 2}: Invalid description or amount`)
            continue
          }

          const dateStr = dateIdx !== -1 ? row[dateIdx] : undefined
          const categoryStr = catIdx !== -1 ? row[catIdx] : undefined
          const recurringStr = recIdx !== -1 ? row[recIdx] : undefined

          let categoryId: string | null = null
          if (categoryStr) {
            categoryId = catNameMap.get(categoryStr.toLowerCase()) || null
          }

          const isRecurring = recurringStr
            ? ['true', 'yes', '1', 'y'].includes(recurringStr.toLowerCase())
            : false

          expenseRows.push({
            description,
            amount,
            date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
            category_id: categoryId,
            is_recurring: isRecurring,
            account_id: cookieAccountId,
          })

          imported++
        } catch (err) {
          errors.push(`Row ${i + 2}: Failed to import - ${(err as Error).message}`)
        }
      }

      if (expenseRows.length > 0) {
        try {
          await prisma.expenses.createMany({ data: expenseRows as any })
        } catch (err: any) {
          errors.push(`Batch insert error: ${err.message}`)
          imported -= expenseRows.length
        }
      }
    }

    return NextResponse.json({ imported: Math.max(0, imported), errors })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}