import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT count(*) FROM expenses');
  console.log('Expenses count:', res.rows[0].count);
  
  const acc = await client.query('SELECT id, email FROM accounts');
  console.log('Accounts:', acc.rows);
  
  await client.end();
}
run();
