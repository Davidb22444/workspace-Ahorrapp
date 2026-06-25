import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"'
          i++ // skip next quote
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
          i++ // skip \n in \r\n
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

  // Handle last field/row
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

  // If there's a "type" column, it's "all" format
  if (normalized.some((h) => h === 'type')) return 'all'

  return 'income' // default fallback
}

function getColumnIndex(headers: string[], targets: string[]): number {
  const normalized = headers.map(normalizeHeader)
  for (const target of targets) {
    const idx = normalized.indexOf(normalizeHeader(target))
    if (idx !== -1) return idx
  }
  return -1
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const accountId = formData.get('accountId') as string | null
    const typeParam = formData.get('type') as string | null

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      )
    }

    if (!file) {
      return NextResponse.json(
        { error: 'file is required' },
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

    const headers = rows[0]
    const dataRows = rows.slice(1)

    // Auto-detect type if "all"
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

          await db.income.create({
            data: {
              source,
              amount,
              description,
              date: dateStr ? new Date(dateStr) : new Date(),
              frequency,
              accountId,
            },
          })

          imported++
        } catch (err) {
          errors.push(`Row ${i + 2}: Failed to import - ${(err as Error).message}`)
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

          // Try to find category by name
          let categoryId: string | undefined
          if (categoryStr) {
            const cat = await db.category.findFirst({
              where: {
                accountId,
                name: { equals: categoryStr, mode: 'insensitive' },
              },
              select: { id: true },
            })
            if (cat) categoryId = cat.id
          }

          const isRecurring = recurringStr
            ? ['true', 'yes', '1', 'y'].includes(recurringStr.toLowerCase())
            : false

          await db.expense.create({
            data: {
              description,
              amount,
              date: dateStr ? new Date(dateStr) : new Date(),
              categoryId,
              isRecurring,
              accountId,
            },
          })

          imported++
        } catch (err) {
          errors.push(`Row ${i + 2}: Failed to import - ${(err as Error).message}`)
        }
      }
    }

    return NextResponse.json({ imported, errors })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}