const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pykqjpiflndeexxujikz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5a3FqcGlmbG5kZWV4eHVqaWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MDI0OTMsImV4cCI6MjEwNDQ3ODQ5M30.98WaCuSQbnn0GnPpNLPs08Lf93-uYNvC3ImFalB6Lqw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const p = {
  id: 'local-rider-01',
  name: 'Rookie rider',
  balance: 30,
  earned: 0,
  deliveries: 0,
  xp: 0,
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
};

async function test() {
  const syncId = 'CD-TEST-1234';
  const currentBike = p.bikes[p.bike] || { condition: 100, fuel: 100 };
  const level = Math.floor(p.xp / 100) + 1;

  const { data, error } = await supabase
    .from('player_saves')
    .upsert(
      {
        device_id: syncId,
        player_name: p.name,
        level,
        xp: p.xp,
        balance: p.balance,
        bike: p.bike,
        gear: p.gear,
        owned_bikes: p.owned_bikes,
        deliveries: p.deliveries,
        hunger: p.hunger,
        fuel: currentBike.fuel,
        condition: currentBike.condition,
        milestones_claimed: p.claimed_milestones || [],
        profile_data: p,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'device_id' }
    )
    .select();

  if (error) {
    console.error('Direct upsert error:', error);
  } else {
    console.log('Direct upsert success:', data);
  }
}

test();
