import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const accRes = await client.query(`SELECT id FROM accounts WHERE email = 'demo@ahorrapp.com'`);
  if (!accRes.rows.length) {
    console.log('No demo account');
    await client.end();
    return;
  }
  const userId = accRes.rows[0].id;
  
  await client.query(`DELETE FROM categories WHERE account_id = $1`, [userId]);
  await client.query(`
    INSERT INTO categories (name, icon, color, type, is_default, account_id) VALUES 
    ('Salario', 'Briefcase', '#10b981', 'income', true, $1),
    ('Alimentación', 'UtensilsCrossed', '#ef4444', 'expense', true, $1),
    ('Transporte', 'Car', '#f97316', 'expense', true, $1),
    ('Vivienda', 'House', '#eab308', 'expense', true, $1)
  `, [userId]);
  
  const catRes = await client.query(`SELECT id, name FROM categories WHERE account_id = $1`, [userId]);
  const catMap = Object.fromEntries(catRes.rows.map(r => [r.name, r.id]));
  
  await client.query(`DELETE FROM incomes WHERE account_id = $1`, [userId]);
  await client.query(`
    INSERT INTO incomes (source, amount, description, frequency, date, category_id, account_id) VALUES 
    ('salary', 4500, 'Salario mensual', 'monthly', NOW() - INTERVAL '5 days', $1, $2),
    ('salary', 4500, 'Salario mensual', 'monthly', NOW() - INTERVAL '35 days', $1, $2)
  `, [catMap['Salario'], userId]);
  
  await client.query(`DELETE FROM expenses WHERE account_id = $1`, [userId]);
  await client.query(`
    INSERT INTO expenses (amount, description, date, category_id, is_recurring, frequency, account_id) VALUES 
    (1200, 'Renta', NOW() - INTERVAL '2 days', $1, true, 'monthly', $4),
    (380, 'Supermercado', NOW() - INTERVAL '4 days', $2, true, 'monthly', $4),
    (75, 'Gasolina', NOW() - INTERVAL '8 days', $3, true, 'monthly', $4),
    (1200, 'Renta', NOW() - INTERVAL '32 days', $1, true, 'monthly', $4),
    (350, 'Supermercado', NOW() - INTERVAL '15 days', $2, true, 'monthly', $4)
  `, [catMap['Vivienda'], catMap['Alimentación'], catMap['Transporte'], userId]);

  await client.query(`DELETE FROM budgets WHERE account_id = $1`, [userId]);
  const budg = await client.query(`
    INSERT INTO budgets (name, total_amount, needs_percent, wants_percent, savings_percent, cycle, is_active, account_id) 
    VALUES ('Mensual 50/30/20', 4500, 50, 30, 20, 'monthly', true, $1) RETURNING id
  `, [userId]);
  
  await client.query(`DELETE FROM budget_periods WHERE account_id = $1`, [userId]);
  await client.query(`
    INSERT INTO budget_periods (start_date, end_date, planned_income, planned_needs, planned_wants, planned_savings, actual_income, actual_needs, actual_wants, actual_savings, budget_id, account_id)
    VALUES (NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', 4500, 2250, 1350, 900, 4500, 1655, 300, 500, $1, $2)
  `, [budg.rows[0].id, userId]);

  // Movements
  await client.query(`DELETE FROM movements WHERE account_id = $1`, [userId]);
  await client.query(`
    INSERT INTO movements (type, amount, description, date, category_id, account_id) VALUES 
    ('entrada', 5450, 'Ingresos del mes', NOW() - INTERVAL '1 day', null, $1),
    ('salida', 1200, 'Renta', NOW() - INTERVAL '2 days', $2, $1),
    ('salida', 450, 'Supermercado', NOW() - INTERVAL '3 days', $3, $1),
    ('salida', 80, 'Gasolina', NOW() - INTERVAL '5 days', $4, $1)
  `, [userId, catMap['Vivienda'], catMap['Alimentación'], catMap['Transporte']]);

  // Savings goals
  await client.query(`DELETE FROM savings_goals WHERE account_id = $1`, [userId]);
  const goalRes = await client.query(`
    INSERT INTO savings_goals (name, target_amount, saved_amount, icon, color, deadline, status, account_id) VALUES 
    ('Viaje a Japón', 5000, 2200, 'Plane', '#ef4444', NOW() + INTERVAL '180 days', 'active', $1),
    ('Fondo de emergencia', 10000, 6500, 'Shield', '#10b981', null, 'active', $1),
    ('Laptop nueva', 2000, 1800, 'Laptop', '#6366f1', NOW() + INTERVAL '30 days', 'active', $1)
    RETURNING id, name
  `, [userId]);
  const goalMap = Object.fromEntries(goalRes.rows.map(r => [r.name, r.id]));

  await client.query(`DELETE FROM savings_contributions WHERE account_id = $1`, [userId]);
  await client.query(`
    INSERT INTO savings_contributions (amount, date, note, goal_id, account_id) VALUES 
    (400, NOW() - INTERVAL '5 days', 'Ahorro mensual', $1, $4),
    (500, NOW() - INTERVAL '10 days', 'Depósito', $2, $4),
    (200, NOW() - INTERVAL '3 days', 'Ahorro quincenal', $3, $4)
  `, [goalMap['Viaje a Japón'], goalMap['Fondo de emergencia'], goalMap['Laptop nueva'], userId]);

  // Debts
  await client.query(`DELETE FROM debts WHERE account_id = $1`, [userId]);
  const debtRes = await client.query(`
    INSERT INTO debts (name, total_amount, paid_amount, interest_rate, start_date, due_date, status, type, installments, account_id) VALUES 
    ('Préstamo Personal', 10000, 4500, 8.5, NOW() - INTERVAL '365 days', NOW() + INTERVAL '365 days', 'pending', 'loan', 24, $1),
    ('Tarjeta de Crédito', 3000, 1800, 18.9, NOW() - INTERVAL '240 days', null, 'pending', 'credit_card', null, $1),
    ('Préstamo Auto', 25000, 8000, 5.9, NOW() - INTERVAL '540 days', NOW() + INTERVAL '730 days', 'pending', 'loan', 60, $1)
    RETURNING id, name
  `, [userId]);
  const debtMap = Object.fromEntries(debtRes.rows.map(r => [r.name, r.id]));

  await client.query(`DELETE FROM debt_payments WHERE account_id = $1`, [userId]);
  await client.query(`
    INSERT INTO debt_payments (amount, date, note, debt_id, account_id) VALUES 
    (500, NOW() - INTERVAL '5 days', 'Cuota mensual', $1, $4),
    (300, NOW() - INTERVAL '10 days', 'Pago tarjeta', $2, $4),
    (450, NOW() - INTERVAL '7 days', 'Cuota auto', $3, $4)
  `, [debtMap['Préstamo Personal'], debtMap['Tarjeta de Crédito'], debtMap['Préstamo Auto'], userId]);

  // Dependents
  await client.query(`DELETE FROM dependents WHERE account_id = $1`, [userId]);
  await client.query(`
    INSERT INTO dependents (name, relationship, economic_weight, birth_date, account_id) VALUES 
    ('María García', 'spouse', 1.0, null, $1),
    ('Carlos García', 'child', 0.5, '2015-05-20', $1),
    ('Ana García', 'child', 0.3, '2018-11-10', $1)
  `, [userId]);

  // Notifications
  await client.query(`DELETE FROM notifications WHERE account_id = $1`, [userId]);
  await client.query(`
    INSERT INTO notifications (title, message, type, is_read, created_at, account_id) VALUES 
    ('Bienvenido a AhorrApp', 'Tu asistente financiero personal está listo.', 'success', false, NOW() - INTERVAL '30 days', $1),
    ('Presupuesto al límite', 'Has alcanzado el 85% de tu presupuesto de entretenimiento.', 'warning', false, NOW() - INTERVAL '5 days', $1),
    ('Meta de ahorro cercana', '¡Tu laptop nueva está al 90%!', 'info', false, NOW() - INTERVAL '2 days', $1)
  `, [userId]);

  // Unexpecteds
  await client.query(`DELETE FROM unexpecteds WHERE account_id = $1`, [userId]);
  await client.query(`
    INSERT INTO unexpecteds (amount, description, date, category_id, resolved, account_id) VALUES 
    (350, 'Reparación del auto', NOW() - INTERVAL '12 days', $2, true, $1),
    (180, 'Visita al dentista', NOW() - INTERVAL '3 days', null, false, $1)
  `, [userId, catMap['Transporte']]);

  console.log('Inserted dummy data successfully!');
  await client.end();
}
run().catch(console.error);
