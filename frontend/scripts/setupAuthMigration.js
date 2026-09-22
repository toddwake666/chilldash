const { Client } = require('pg');

async function main() {
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
    console.log('Setting up auto-confirm trigger...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.auto_confirm_user()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.email_confirmed_at IS NULL THEN
          NEW.email_confirmed_at := now();
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
      CREATE TRIGGER on_auth_user_created_confirm
        BEFORE INSERT OR UPDATE ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.auto_confirm_user();

      UPDATE auth.users 
      SET email_confirmed_at = now() 
      WHERE email_confirmed_at IS NULL;
    `);
    console.log('Auto-confirm trigger created successfully!');

    console.log('Adding user_id to player_saves...');
    await client.query(`
      ALTER TABLE public.player_saves ADD COLUMN IF NOT EXISTS user_id uuid;
      CREATE INDEX IF NOT EXISTS idx_player_saves_user_id ON public.player_saves(user_id);
    `);
    console.log('user_id column and index added successfully!');

    await client.end();
  } catch (err) {
    console.error('Error during migration:', err);
    try { await client.end(); } catch (_) {}
  }
}

main();
