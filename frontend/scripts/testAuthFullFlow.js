const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

const SUPABASE_URL = 'https://pykqjpiflndeexxujikz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5a3FqcGlmbG5kZWV4eHVqaWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MDI0OTMsImV4cCI6MjEwNDQ3ODQ5M30.98WaCuSQbnn0GnPpNLPs08Lf93-uYNvC3ImFalB6Lqw';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function runVerification() {
  console.log('=== STARTING SUPABASE AUTH FULL FLOW VERIFICATION ===\n');

  const testEmail = `courier_${Date.now()}@chilldash.test`;
  const testPassword = 'SafePassword99!';
  const testSyncId = `CD-TEST-${Date.now().toString(36).toUpperCase()}`;

  // 1. Email Sign Up (no verification)
  console.log(`1. Testing Email SignUp for: ${testEmail}`);
  const signUpRes = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: { name: 'Speedy Rider' }
    }
  });

  if (signUpRes.error) {
    console.error('FAIL: SignUp error:', signUpRes.error);
    process.exit(1);
  }

  const userId = signUpRes.data.user?.id;
  console.log('PASS: User signed up successfully with ID:', userId);

  // 2. Email Sign In
  console.log(`\n2. Testing Email SignIn for: ${testEmail}`);
  const signInRes = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInRes.error) {
    console.error('FAIL: SignIn error:', signInRes.error);
    process.exit(1);
  }

  console.log('PASS: User signed in successfully. Session active:', !!signInRes.data.session);

  // 3. Tying Cloud Save to user_id
  console.log('\n3. Testing Cloud Save tying to user_id:');
  const mockProfile = {
    id: testSyncId,
    name: 'Speedy Rider',
    balance: 130, // 30 + 100 boost
    earned: 100,
    deliveries: 3,
    xp: 250,
    bike: 'scooter',
    gear: 'everyday',
    owned_bikes: ['scooter', 'bicycle'],
    owned_gear: ['everyday'],
    online: true,
    position: { x: 352, y: 750 },
    minutes: 540,
    weather: 'sunny',
    health: 100,
    hunger: 100,
    energy: 100,
    dead: false,
    at_garage: true,
    bikes: {
      scooter: { condition: 100, fuel: 100, air: 100 },
      bicycle: { condition: 100, fuel: 100, air: 100 },
      express: { condition: 100, fuel: 100, air: 100 },
    },
    food: { apple: 2, sandwich: 0, meal: 0 },
    carrying_rainkit: false,
    claimed_milestones: [],
    auth_boost_claimed: true,
  };

  const { error: upsertErr } = await supabase
    .from('player_saves')
    .upsert({
      device_id: testSyncId,
      user_id: userId,
      player_name: mockProfile.name,
      level: 3,
      xp: mockProfile.xp,
      balance: mockProfile.balance,
      bike: mockProfile.bike,
      gear: mockProfile.gear,
      owned_bikes: mockProfile.owned_bikes,
      deliveries: mockProfile.deliveries,
      hunger: 100,
      fuel: 100,
      condition: 100,
      milestones_claimed: [],
      profile_data: mockProfile,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'device_id' });

  if (upsertErr) {
    console.error('FAIL: Cloud Save upsert error:', upsertErr);
    process.exit(1);
  }
  console.log('PASS: Cloud save upserted with user_id:', userId);

  // 4. Loading Cloud Save by user_id
  console.log('\n4. Testing Cloud Save query by user_id:');
  const { data: loadData, error: loadErr } = await supabase
    .from('player_saves')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (loadErr || !loadData) {
    console.error('FAIL: Load by user_id error:', loadErr);
    process.exit(1);
  }
  console.log('PASS: Retrieved cloud save by user_id successfully:');
  console.log({
    device_id: loadData.device_id,
    user_id: loadData.user_id,
    player_name: loadData.player_name,
    balance: loadData.balance,
    auth_boost_claimed: loadData.profile_data?.auth_boost_claimed,
  });

  // 5. Cleanup
  console.log('\n5. Cleaning up test data:');
  await supabase.from('player_saves').delete().eq('device_id', testSyncId);
  const pgClient = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.pykqjpiflndeexxujikz',
    password: 'Bengal@743235',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });
  await pgClient.connect();
  await pgClient.query("DELETE FROM auth.users WHERE email = $1", [testEmail]);
  await pgClient.end();
  console.log('PASS: Test save and test user deleted cleanly.');

  console.log('\n=== ALL VERIFICATION CHECKS PASSED ===');
}

runVerification().catch(err => {
  console.error('Unexpected failure:', err);
  process.exit(1);
});
