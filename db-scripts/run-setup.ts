import { Client } from 'pg';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to Supabase...');
  
  const sql = fs.readFileSync('supabase-setup.sql', 'utf8');
  
  console.log('Executing supabase-setup.sql...');
  await client.query(sql);
  
  console.log('Setup SQL executed successfully!');
  await client.end();
}

run().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
