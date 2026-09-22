const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.pykqjpiflndeexxujikz',
    password: 'Bengal@743235',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Altering columns to NUMERIC...');
    await client.query(`
      ALTER TABLE public.player_saves 
        ALTER COLUMN fuel TYPE NUMERIC,
        ALTER COLUMN condition TYPE NUMERIC,
        ALTER COLUMN hunger TYPE NUMERIC;
    `);
    console.log('Columns altered successfully!');
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    try { await client.end(); } catch (_) {}
  }
}

run();
