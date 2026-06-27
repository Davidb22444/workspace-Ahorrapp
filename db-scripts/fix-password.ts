import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  await client.query(`UPDATE accounts SET password = 'demo123' WHERE email = 'demo@ahorrapp.com'`);
  console.log('Fixed password for demo account!');
  await client.end();
}
run();
