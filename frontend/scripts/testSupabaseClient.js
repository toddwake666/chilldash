const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pykqjpiflndeexxujikz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5a3FqcGlmbG5kZWV4eHVqaWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MDI0OTMsImV4cCI6MjEwNDQ3ODQ5M30.98WaCuSQbnn0GnPpNLPs08Lf93-uYNvC3ImFalB6Lqw';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function test() {
  console.log('Testing Supabase Client Write...');
  const testDeviceId = 'test_device_' + Date.now();
  const { data: insertData, error: insertError } = await supabase
    .from('player_saves')
    .upsert({
      device_id: testDeviceId,
      player_name: 'Test Rider',
      level: 5,
      balance: 450,
      xp: 250,
      bike: 'express',
      owned_bikes: ['daydream', 'express']
    }, { onConflict: 'device_id' })
    .select();

  if (insertError) {
    console.error('Insert error:', insertError);
    return;
  }
  console.log('Successfully saved to Supabase:', insertData);

  console.log('Testing Supabase Client Read...');
  const { data: readData, error: readError } = await supabase
    .from('player_saves')
    .select('*')
    .eq('device_id', testDeviceId)
    .single();

  if (readError) {
    console.error('Read error:', readError);
    return;
  }
  console.log('Successfully read from Supabase:', readData);

  // Clean up test row
  await supabase.from('player_saves').delete().eq('device_id', testDeviceId);
  console.log('Cleaned up test row.');
}

test();
