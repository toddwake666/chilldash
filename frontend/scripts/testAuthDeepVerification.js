const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const assert = require('assert');

const SUPABASE_URL = 'https://pykqjpiflndeexxujikz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5a3FqcGlmbG5kZWV4eHVqaWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MDI0OTMsImV4cCI6MjEwNDQ3ODQ5M30.98WaCuSQbnn0GnPpNLPs08Lf93-uYNvC3ImFalB6Lqw';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

function parseOAuthReturnUrl(returnUrl) {
  const [beforeHash, hashFragment] = returnUrl.split('#');
  const [, queryString] = beforeHash.split('?');

  let accessToken = null;
  let refreshToken = null;
  let code = null;

  if (hashFragment) {
    const params = new URLSearchParams(hashFragment);
    accessToken = params.get('access_token');
    refreshToken = params.get('refresh_token');
  }

  if (queryString) {
    const params = new URLSearchParams(queryString);
    code = params.get('code');
    if (!accessToken) {
      accessToken = params.get('access_token');
      refreshToken = params.get('refresh_token');
    }
  }

  return { accessToken, refreshToken, code };
}

function resolveProfileForAuth(cloudSave, curr) {
  const isCurrRookie = !curr || (curr.deliveries === 0 && curr.xp === 0 && curr.balance <= 30);
  const cloudProgress = cloudSave ? (cloudSave.xp || 0) * 1000 + (cloudSave.deliveries || 0) * 100 + (cloudSave.balance || 0) : -1;
  const currProgress = curr ? (curr.xp || 0) * 1000 + (curr.deliveries || 0) * 100 + (curr.balance || 0) : 0;

  if (cloudSave && (isCurrRookie || cloudProgress >= currProgress)) {
    const profileToApply = { ...cloudSave };
    let boostAwarded = false;

    if (!profileToApply.auth_boost_claimed) {
      profileToApply.auth_boost_claimed = true;
      profileToApply.balance += 100;
      profileToApply.earned += 100;
      profileToApply.health = 100;
      profileToApply.hunger = 100;
      profileToApply.energy = 100;
      if (profileToApply.bikes?.[profileToApply.bike]) {
        profileToApply.bikes[profileToApply.bike].condition = 100;
        profileToApply.bikes[profileToApply.bike].fuel = 100;
        profileToApply.bikes[profileToApply.bike].air = 100;
      }
      boostAwarded = true;
    }

    return { profile: profileToApply, restored: true, boostAwarded };
  }

  if (curr) {
    const profileToApply = { ...curr };
    let boostAwarded = false;

    if (!profileToApply.auth_boost_claimed) {
      profileToApply.auth_boost_claimed = true;
      profileToApply.balance += 100;
      profileToApply.earned += 100;
      profileToApply.health = 100;
      profileToApply.hunger = 100;
      profileToApply.energy = 100;
      if (profileToApply.bikes?.[profileToApply.bike]) {
        profileToApply.bikes[profileToApply.bike].condition = 100;
        profileToApply.bikes[profileToApply.bike].fuel = 100;
        profileToApply.bikes[profileToApply.bike].air = 100;
      }
      boostAwarded = true;
    }

    return { profile: profileToApply, restored: false, boostAwarded };
  }

  return null;
}

async function runAllTests() {
  console.log('=== TEST SUITE: SUPABASE AUTH & BOOST FLOWS ===\n');

  // Test 1: OAuth URL Parsing (Testing fragment/query isolation)
  console.log('Test 1: OAuth URL Parsing Edge Cases');
  const urlWithCodeAndHash = 'chilldash://auth/callback?code=AUTH_CODE_SECRET#state=xyz&foo=bar';
  const parsed1 = parseOAuthReturnUrl(urlWithCodeAndHash);
  assert.strictEqual(parsed1.code, 'AUTH_CODE_SECRET', 'Code should not be corrupted by hash fragment');
  console.log('  PASS: Code parameter parsed cleanly without hash corruption');

  const urlWithImplicitTokensAndQuery = 'chilldash://auth/callback?state=abc#access_token=ACC_TOKEN_123&refresh_token=REF_TOKEN_456';
  const parsed2 = parseOAuthReturnUrl(urlWithImplicitTokensAndQuery);
  assert.strictEqual(parsed2.accessToken, 'ACC_TOKEN_123');
  assert.strictEqual(parsed2.refreshToken, 'REF_TOKEN_456');
  console.log('  PASS: Access & refresh tokens parsed cleanly from hash');

  // Test 2: Progress Restoration Edge Cases (Testing fix for 0 XP account wipe bug)
  console.log('\nTest 2: Account Restoration & Boost Logic');
  
  // Scenario A: Returning user has 0 XP, 5 deliveries, 150 coins, boost already claimed
  const existingCloudSaveA = {
    id: 'CD-OLD-SAVE',
    name: 'Veteran Rider',
    balance: 150,
    earned: 150,
    deliveries: 5,
    xp: 0, // 0 XP!
    bike: 'scooter',
    bikes: { scooter: { condition: 80, fuel: 50, air: 90 } },
    auth_boost_claimed: true,
  };
  const freshRookieLocal = {
    id: 'CD-FRESH-INSTALL',
    name: 'Rookie rider',
    balance: 30,
    earned: 0,
    deliveries: 0,
    xp: 0,
    bike: 'scooter',
    bikes: { scooter: { condition: 100, fuel: 100, air: 100 } },
    auth_boost_claimed: false,
  };

  const resA = resolveProfileForAuth(existingCloudSaveA, freshRookieLocal);
  assert.strictEqual(resA.restored, true, 'Must restore existing cloud save even if XP is 0');
  assert.strictEqual(resA.profile.deliveries, 5, 'Must keep 5 deliveries');
  assert.strictEqual(resA.profile.balance, 150, 'Must keep 150 coins balance');
  assert.strictEqual(resA.boostAwarded, false, 'Should not duplicate boost if already claimed');
  console.log('  PASS: Scenario A - 0 XP existing account safely restored without data wipe');

  // Scenario B: Existing cloud save never claimed boost yet
  const existingCloudSaveB = {
    id: 'CD-LEGACY-SAVE',
    name: 'Legacy Rider',
    balance: 50,
    earned: 50,
    deliveries: 2,
    xp: 20,
    bike: 'scooter',
    bikes: { scooter: { condition: 60, fuel: 40, air: 70 } },
    auth_boost_claimed: false, // Not yet claimed!
  };

  const resB = resolveProfileForAuth(existingCloudSaveB, freshRookieLocal);
  assert.strictEqual(resB.restored, true);
  assert.strictEqual(resB.boostAwarded, true, 'Boost should be awarded to existing user if not yet claimed');
  assert.strictEqual(resB.profile.balance, 150, '50 + 100 = 150 coins');
  assert.strictEqual(resB.profile.bikes.scooter.condition, 100, 'Bike condition refreshed to 100');
  assert.strictEqual(resB.profile.bikes.scooter.fuel, 100, 'Bike fuel refreshed to 100');
  console.log('  PASS: Scenario B - Legacy account restored and boost granted');

  // Scenario C: Fresh user signs up with local progress
  const localGuestWithRides = {
    id: 'CD-GUEST-PROGRESS',
    name: 'Local Hero',
    balance: 70,
    earned: 40,
    deliveries: 2,
    xp: 50,
    bike: 'scooter',
    bikes: { scooter: { condition: 85, fuel: 80, air: 85 } },
    auth_boost_claimed: false,
  };

  const resC = resolveProfileForAuth(null, localGuestWithRides);
  assert.strictEqual(resC.restored, false);
  assert.strictEqual(resC.boostAwarded, true);
  assert.strictEqual(resC.profile.balance, 170, '70 + 100 = 170 coins');
  assert.strictEqual(resC.profile.auth_boost_claimed, true);
  console.log('  PASS: Scenario C - Fresh user links local progress and receives +100 boost');

  // Test 3: Live Supabase Email SignUp without email verification + Auto-Confirm
  console.log('\nTest 3: Live Supabase Email SignUp & Auto-Confirm Trigger');
  const testEmail = `courier_verify_${Date.now()}@chilldash.test`;
  const testPass = 'SuperCourierPass123!';
  const testSyncId = `CD-VERIFY-${Date.now().toString(36).toUpperCase()}`;

  const signUpRes = await supabase.auth.signUp({
    email: testEmail,
    password: testPass,
    options: { data: { name: 'Deep Test Courier' } }
  });
  assert.ifError(signUpRes.error);
  const userId = signUpRes.data.user?.id;
  assert.ok(userId, 'User ID must exist');
  console.log(`  PASS: User created with ID: ${userId}`);

  // Test 4: Live Supabase Email SignIn (confirms email verification bypass worked)
  console.log('\nTest 4: Live Supabase Immediate SignIn');
  const signInRes = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPass,
  });
  assert.ifError(signInRes.error);
  assert.ok(signInRes.data.session, 'Active session must be issued');
  console.log('  PASS: Immediate sign-in succeeded without email verification lock');

  // Test 5: Live Cloud Save Upsert with user_id & Query
  console.log('\nTest 5: Live Cloud Save Upsert and Query by user_id');
  const savePayload = {
    device_id: testSyncId,
    user_id: userId,
    player_name: 'Deep Test Courier',
    level: 2,
    xp: 150,
    balance: 230,
    bike: 'scooter',
    gear: 'everyday',
    owned_bikes: ['scooter', 'bicycle'],
    deliveries: 4,
    hunger: 100,
    fuel: 100,
    condition: 100,
    milestones_claimed: [],
    profile_data: {
      id: testSyncId,
      name: 'Deep Test Courier',
      balance: 230,
      xp: 150,
      deliveries: 4,
      auth_boost_claimed: true,
    },
    updated_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await supabase
    .from('player_saves')
    .upsert(savePayload, { onConflict: 'device_id' });
  assert.ifError(upsertErr);

  const { data: retrievedSave, error: retrieveErr } = await supabase
    .from('player_saves')
    .select('*')
    .eq('user_id', userId)
    .single();

  assert.ifError(retrieveErr);
  assert.strictEqual(retrievedSave.user_id, userId);
  assert.strictEqual(retrievedSave.balance, 230);
  assert.strictEqual(retrievedSave.profile_data.auth_boost_claimed, true);
  console.log('  PASS: Cloud save tied to Supabase user_id and retrieved successfully');

  // Cleanup
  console.log('\nCleaning up test artifacts...');
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
  console.log('  PASS: Test user and test cloud save deleted.');

  console.log('\n=== ALL DEEP VERIFICATION CHECKS PASSED ===');
}

runAllTests().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
