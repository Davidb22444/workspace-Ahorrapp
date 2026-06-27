import * as fs from 'fs';

let content = fs.readFileSync('prisma/seed.ts', 'utf8');

const replacements = [
  ['prisma.account.', 'prisma.accounts.'],
  ['prisma.category.', 'prisma.categories.'],
  ['prisma.income.', 'prisma.incomes.'],
  ['prisma.expense.', 'prisma.expenses.'],
  ['prisma.unexpected.', 'prisma.unexpecteds.'],
  ['prisma.movement.', 'prisma.movements.'],
  ['prisma.savingsGoal.', 'prisma.savings_goals.'],
  ['prisma.savingsContribution.', 'prisma.savings_contributions.'],
  ['prisma.debt.', 'prisma.debts.'],
  ['prisma.debtPayment.', 'prisma.debt_payments.'],
  ['prisma.budget.', 'prisma.budgets.'],
  ['prisma.budgetPeriod.', 'prisma.budget_periods.'],
  ['prisma.dependent.', 'prisma.dependents.'],
  ['prisma.notification.', 'prisma.notifications.'],
  
  ['accountId:', 'account_id:'],
  ['categoryId:', 'category_id:'],
  ['goalId:', 'goal_id:'],
  ['debtId:', 'debt_id:'],
  ['budgetId:', 'budget_id:'],
  ['isDefault:', 'is_default:'],
  ['targetAmount:', 'target_amount:'],
  ['savedAmount:', 'saved_amount:'],
  ['interestRate:', 'interest_rate:'],
  ['startDate:', 'start_date:'],
  ['dueDate:', 'due_date:'],
  ['paidAmount:', 'paid_amount:'],
  ['totalAmount:', 'total_amount:'],
  ['needsPercent:', 'needs_percent:'],
  ['wantsPercent:', 'wants_percent:'],
  ['savingsPercent:', 'savings_percent:'],
  ['isActive:', 'is_active:'],
  ['plannedIncome:', 'planned_income:'],
  ['plannedNeeds:', 'planned_needs:'],
  ['plannedWants:', 'planned_wants:'],
  ['plannedSavings:', 'planned_savings:'],
  ['actualIncome:', 'actual_income:'],
  ['actualNeeds:', 'actual_needs:'],
  ['actualWants:', 'actual_wants:'],
  ['actualSavings:', 'actual_savings:'],
  ['economicWeight:', 'economic_weight:'],
  ['birthDate:', 'birth_date:'],
  ['isRecurring:', 'is_recurring:'],
  ['createdAt:', 'created_at:']
];

for (const [from, to] of replacements) {
  content = content.split(from).join(to);
}

fs.writeFileSync('prisma/seed.ts', content);
console.log('Fixed seed.ts');
