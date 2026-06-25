// Helper for converting between snake_case (Supabase) and camelCase (app)
export function toCamel(row: Record<string, any>): Record<string, any> {
  if (!row) return row
  const r: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
    r[camel] = v
  }
  return r
}

export function toSnake(obj: Record<string, any>): Record<string, any> {
  if (!obj) return obj
  const r: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    const snake = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
    r[snake] = v
  }
  return r
}

// Maps for common field conversions
export const FIELD_MAP: Record<string, string> = {
  accountId: 'account_id', categoryId: 'category_id', dependentId: 'dependent_id',
  isRecurring: 'is_recurring', totalAmount: 'total_amount', paidAmount: 'paid_amount',
  interestRate: 'interest_rate', startDate: 'start_date', dueDate: 'due_date',
  isDefault: 'is_default', savingsPercent: 'savings_percent', needsPercent: 'needs_percent',
  wantsPercent: 'wants_percent', isActive: 'is_active', plannedIncome: 'planned_income',
  plannedNeeds: 'planned_needs', plannedWants: 'planned_wants', plannedSavings: 'planned_savings',
  actualIncome: 'actual_income', actualNeeds: 'actual_needs', actualWants: 'actual_wants',
  actualSavings: 'actual_savings', budgetId: 'budget_id', isRead: 'is_read',
  targetAmount: 'target_amount', savedAmount: 'saved_amount', goalId: 'goal_id',
  debtId: 'debt_id', birthDate: 'birth_date', economicWeight: 'economic_weight',
  createdAt: 'created_at', updatedAt: 'updated_at',
}