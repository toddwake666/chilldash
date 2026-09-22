import AsyncStorage from '@react-native-async-storage/async-storage';
import worldData from './worldData.json';
import type { Catalog, Destination, Dispatch, Order, Point, Profile, Weather } from './api';
import { distance, nearestRoad, onFootpath, region, getRoute, BIKES } from './world';
import { syncProfileToSupabase, loadProfileFromSupabase, getSyncId, setSyncId } from './supabase';

const PROFILE_KEY = 'chill_dash_local_profile';

export const MAX_TANK_LEVELS: Record<string, number> = {
  scooter: 2,
  express: 3,
  ninja: 4,
  viper: 5,
};

export const TANK_UPGRADE_COSTS: Record<number, number> = {
  2: 45,
  3: 75,
  4: 110,
  5: 150,
};

export function getFullRefuelCost(bike: string, tankLevel?: number): number {
  if (bike === 'bicycle') return 4;
  const level = tankLevel || 1;
  return 12 + (level - 1) * 6;
}

export function getDefaultProfile(): Profile {
  return {
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
    online: false,
    position: { x: 352, y: 750 },
    minutes: 540,
    weather: 'sunny',
    health: 100,
    hunger: 100,
    energy: 100,
    dead: false,
    at_garage: true,
    bikes: {
      scooter: { condition: 100, fuel: 100, air: 100, tank_level: 1 },
      bicycle: { condition: 100, fuel: 100, air: 100, tank_level: 1 },
      express: { condition: 100, fuel: 100, air: 100, tank_level: 1 },
      ninja: { condition: 100, fuel: 100, air: 100, tank_level: 1 },
      viper: { condition: 100, fuel: 100, air: 100, tank_level: 1 },
    },
    food: { apple: 2, sandwich: 0, meal: 0 },
    carrying_rainkit: false,
    claimed_milestones: [],
    tutorial_step: 10,
    tutorial_active: false,
    tutorial_completed: true,
    boss_borrowed_viper: false,
    partho_borrowed_express: false,
    partho_quest_completed: false,
    partho_chat_stage: 0,
    visited_revenuecat_bridge: false,
    claimed_bridge_goal: false,
  };
}

let cachedProfile: Profile | null = null;
let activeOrder: Order | null = null;
let orderCooldownUntil = 0;
const shopCooldowns: Record<string, number> = {};

let isInitialCloudCheckDone = false;

export async function getLocalProfile(): Promise<Profile> {
  if (!cachedProfile) {
    try {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      cachedProfile = raw ? JSON.parse(raw) : null;
    } catch {
      cachedProfile = null;
    }
  }

  // If local save is present, sanitize and return immediately (<10ms).
  // Check Supabase in the background asynchronously without blocking launch!
  if (cachedProfile) {
    if (!isInitialCloudCheckDone) {
      isInitialCloudCheckDone = true;
      loadProfileFromSupabase()
        .then(async (cloudProfile) => {
          if (cloudProfile && cachedProfile && (cloudProfile.xp || 0) > (cachedProfile.xp || 0)) {
            cachedProfile = cloudProfile;
            await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(cloudProfile));
          }
        })
        .catch(e => console.warn('Background cloud check error:', e));
    }

    // Tutorial permanently completed in open-world mode
    cachedProfile.tutorial_active = false;
    cachedProfile.tutorial_completed = true;
    cachedProfile.tutorial_step = 10;

    // Ensure starter and current bike are always in owned_bikes
    if (!cachedProfile.owned_bikes.includes('scooter')) {
      cachedProfile.owned_bikes.push('scooter');
    }
    if (cachedProfile.bike && !cachedProfile.owned_bikes.includes(cachedProfile.bike)) {
      cachedProfile.owned_bikes.push(cachedProfile.bike);
    }

    // Starter bike safety check complete

    // Pro User 7-in-game-day free speed boost cycle (10,080 minutes = 7 days)
    if (cachedProfile.is_pro) {
      if (cachedProfile.pro_boost_reset_at === undefined || cachedProfile.minutes >= cachedProfile.pro_boost_reset_at) {
        cachedProfile.pro_free_boosts = 2;
        cachedProfile.pro_boost_reset_at = (cachedProfile.minutes || 0) + 10080;
      }
    }

    syncProfileToSupabase(cachedProfile);
    return cachedProfile;
  }

  // Only if no local profile exists at all (e.g. freshly reinstalled app), check cloud
  if (!isInitialCloudCheckDone) {
    isInitialCloudCheckDone = true;
    try {
      const cloudProfile = await loadProfileFromSupabase();
      if (cloudProfile) {
        cachedProfile = cloudProfile;
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(cloudProfile));
      }
    } catch (e) {
      console.warn('Initial cloud check error:', e);
    }
  }

  if (!cachedProfile) {
    cachedProfile = getDefaultProfile();
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(cachedProfile));
  }

  // Tutorial permanently completed in open-world mode
  cachedProfile.tutorial_active = false;
  cachedProfile.tutorial_completed = true;
  cachedProfile.tutorial_step = 10;

  if (!cachedProfile.owned_bikes.includes('scooter')) {
    cachedProfile.owned_bikes.push('scooter');
  }
  if (cachedProfile.bike && !cachedProfile.owned_bikes.includes(cachedProfile.bike)) {
    cachedProfile.owned_bikes.push(cachedProfile.bike);
  }

  syncProfileToSupabase(cachedProfile);
  return cachedProfile;
}

export async function saveLocalProfile(p: Profile): Promise<Profile> {
  cachedProfile = p;
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch (e) {
    console.warn('Failed to save profile', e);
  }
  syncProfileToSupabase(p);
  return p;
}

export async function restoreProfileFromSyncCode(syncCode: string): Promise<Profile | null> {
  const cloudProfile = await loadProfileFromSupabase(syncCode.trim().toUpperCase());
  if (cloudProfile) {
    await setSyncId(syncCode.trim().toUpperCase());
    cachedProfile = cloudProfile;
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(cloudProfile));
    return cloudProfile;
  }
  return null;
}

export function getLocalCatalog(): Catalog {
  return {
    foods: worldData.foods as Catalog['foods'],
    milestones: worldData.milestones as unknown as Catalog['milestones'],
    services: worldData.services as Catalog['services'],
    recovery_cost: 15,
    world: worldData.world as unknown as Catalog['world'],
    server_time: Date.now() / 1000,
  };
}

function calculateRouteDistance(a: Point, b: Point): number {
  const route = getRoute(a, b);
  if (route.length > 1) {
    return route.reduce((sum, p, i) => (i ? sum + distance(p, route[i - 1]) : 0), 0);
  }
  return distance(a, b);
}

export function getPointTown(pt: Point): string {
  if (pt.x <= 1700 && pt.y <= 1600) return 'Sunnyvale';
  if (pt.x > 1700 && pt.x <= 3350 && pt.y <= 1600) return 'Pinecrest';
  if (pt.x > 3350 && pt.y <= 1700) return 'Bongaon';
  if (pt.x <= 3600 && pt.y > 1700) return 'Habra';
  if (pt.x > 3600 && pt.y > 1700) return 'Petrapole';
  return 'Sunnyvale';
}

const ADJACENT_TOWNS: Record<string, string[]> = {
  Sunnyvale: ['Pinecrest', 'Habra'],
  Pinecrest: ['Sunnyvale', 'Bongaon', 'Habra'],
  Bongaon: ['Pinecrest', 'Petrapole'],
  Habra: ['Sunnyvale', 'Pinecrest', 'Petrapole'],
  Petrapole: ['Habra', 'Bongaon'],
};

export async function getLocalDispatch(): Promise<Dispatch> {
  const p = await getLocalProfile();
  const currentRegion = region(p.position);
  const now = Date.now() / 1000;

  // Check if active order has expired
  if (activeOrder && activeOrder.status === 'accepted' && activeOrder.pickup_deadline && activeOrder.pickup_deadline < now) {
    activeOrder.status = 'expired';
    activeOrder = null;
  }

  if (activeOrder && (activeOrder.status === 'offered' || activeOrder.status === 'accepted' || activeOrder.status === 'picked_up')) {
    return {
      orders: [activeOrder],
      message: '',
      region: currentRegion,
      retry_after: 0,
    };
  }

  if (!p.online || p.dead) {
    return {
      orders: [],
      message: 'You’re offline. Toggle online inside your phone when you’re ready.',
      region: currentRegion,
      retry_after: 0,
    };
  }

  const wait = (p.tutorial_active && (p.tutorial_step === 6 || p.tutorial_step === 7)) ? 0 : Math.max(0, Math.ceil(orderCooldownUntil - now));
  if (wait > 0) {
    return {
      orders: [],
      message: 'No orders from this location right now. Visit other places while shops prepare new requests.',
      region: currentRegion,
      retry_after: wait,
    };
  }

  // Find available shops in the region, prioritizing rider's current town or nearest shops
  const riderTown = getPointTown(p.position);
  const availableShops = worldData.pickups
    .map((pickup, idx) => ({ pickup, idx, dist: distance(p.position, pickup), town: getPointTown(pickup) }))
    .filter(item => (shopCooldowns[item.idx] || 0) <= now);

  if (availableShops.length === 0) {
    return {
      orders: [],
      message: 'Shops are preparing new requests. Check back in a few moments.',
      region: currentRegion,
      retry_after: 15,
    };
  }

  // Categorize shops by proximity to rider's current town
  const localShops = availableShops.filter(s => s.town === riderTown);
  const adjacentTownNames = ADJACENT_TOWNS[riderTown] || [];
  const adjacentShops = availableShops.filter(s => adjacentTownNames.includes(s.town));
  const farShops = availableShops.filter(s => s.town !== riderTown && !adjacentTownNames.includes(s.town));

  // Rider has ~35% chance of getting a cross-town or far-town pickup order
  const wantCrossTownPickup = (Math.random() < 0.35 || localShops.length === 0);
  let pool = localShops;
  if (wantCrossTownPickup) {
    if (farShops.length > 0 && Math.random() < 0.25) {
      pool = farShops;
    } else if (adjacentShops.length > 0) {
      pool = adjacentShops;
    } else if (farShops.length > 0) {
      pool = farShops;
    }
  }

  if (!pool || pool.length === 0) {
    pool = availableShops;
  }

  pool.sort((a, b) => a.dist - b.dist);
  const topSlice = pool.slice(0, Math.min(3, pool.length));
  const selected = topSlice[Math.floor(Math.random() * topSlice.length)];
  const pickup = selected.pickup;
  const pickupTown = selected.town;

  // Decide if delivery is inter-town (to an adjacent town) or intra-town
  const adjacentList = ADJACENT_TOWNS[pickupTown] || [];
  const wantInterTown = adjacentList.length > 0 && (Math.random() < 0.40 || p.deliveries % 3 === 1);

  // Helper to test if a candidate dropoff is valid and well-separated from pickup
  const isValidDropoff = (d: typeof worldData.dropoffs[0], minSeparation = 300) => {
    if (!d) return false;
    if (d.name.trim().toLowerCase() === pickup.name.trim().toLowerCase()) return false;
    if (d.x === pickup.x && d.y === pickup.y) return false;
    return distance(pickup, d) >= minSeparation;
  };

  let dropoff: typeof worldData.dropoffs[0] | null = null;

  if (wantInterTown) {
    const targetTown = adjacentList[Math.floor(Math.random() * adjacentList.length)];
    const interCandidates = worldData.dropoffs.filter(d => getPointTown(d) === targetTown && isValidDropoff(d, 350));
    if (interCandidates.length > 0) {
      dropoff = interCandidates[Math.floor(Math.random() * interCandidates.length)];
    }
  }

  if (!dropoff) {
    const localCandidates = worldData.dropoffs.filter(d => getPointTown(d) === pickupTown && isValidDropoff(d, 300));
    if (localCandidates.length > 0) {
      dropoff = localCandidates[Math.floor(Math.random() * localCandidates.length)];
    }
  }

  if (!dropoff) {
    const anyValid = worldData.dropoffs.filter(d => isValidDropoff(d, 300));
    if (anyValid.length > 0) {
      dropoff = anyValid[Math.floor(Math.random() * anyValid.length)];
    }
  }

  if (!dropoff) {
    // Ultimate safety fallback: sort by distance from pickup descending and take the farthest distinct place
    const sorted = [...worldData.dropoffs]
      .filter(d => d.name.trim().toLowerCase() !== pickup.name.trim().toLowerCase())
      .sort((a, b) => distance(pickup, b) - distance(pickup, a));
    dropoff = sorted[0] || worldData.dropoffs[0];
  }

  const travelDist = calculateRouteDistance(p.position, pickup);
  const routeDist = calculateRouteDistance(pickup, dropoff);
  const isInterTownPickup = pickupTown !== riderTown;
  const isFarPickup = travelDist > 1600;
  const isInterTownDropoff = pickupTown !== getPointTown(dropoff);

  // Time scaled generously according to pickup distance:
  // Base buffer: 75s for local, 110s for adjacent town, 150s for far cross-map.
  const baseBuffer = isFarPickup ? 150 : (isInterTownPickup ? 110 : 75);
  const travelTime = Math.floor(travelDist / 26);
  const seconds = Math.max(75, Math.min(600, travelTime + baseBuffer));

  // Lucrative bonuses for far and cross-town orders
  const farBonus = isFarPickup ? Math.floor(travelDist / 38) : (isInterTownPickup ? 24 : 0);
  const baseReward = (isInterTownDropoff || isInterTownPickup) ? 48 : 26;

  const items = [
    'Coffee & croissants',
    'Two margherita pizzas',
    'A fresh flower bouquet',
    'Noodles for two',
    'A box of cinnamon rolls',
    'A warm lunch bowl',
    'Match-day sandwiches',
    'Tea and station snacks',
    'Lunch for the visitor gate',
  ];
  const customers = ['Maya', 'Leo', 'Sam', 'Alex', 'Robin', 'Jules', 'Arjun', 'Riya', 'Dev'];

  activeOrder = {
    id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    pickup,
    dropoff,
    item: items[selected.idx % items.length],
    customer: customers[selected.idx % customers.length],
    reward: baseReward + Math.floor(routeDist / 35) + farBonus,
    xp: (isInterTownDropoff ? 40 : 25) + (isFarPickup ? 35 : (isInterTownPickup ? 18 : 0)),
    status: 'offered',
    created_at: new Date().toISOString(),
    pickup_deadline: null,
    pickup_seconds: seconds,
  };

  shopCooldowns[selected.idx] = now + 180;
  return {
    orders: [activeOrder],
    message: '',
    region: currentRegion,
    retry_after: 0,
  };
}

// Local API Mock Handlers
export async function localApi<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const p = await getLocalProfile();

  // Profile & Session
  if (path === '/sessions' || path === '/profile') {
    return p as unknown as T;
  }

  if (path === '/catalog' || path === '/world') {
    return getLocalCatalog() as unknown as T;
  }

  if (path === '/dispatch') {
    return (await getLocalDispatch()) as unknown as T;
  }

  // Game Tick
  if (path === '/game/tick' && method === 'POST') {
    const b = body as {
      position: Point;
      minutes: number;
      weather: Weather;
      elapsed: number;
      moving: number;
      distance: number;
    };

    p.position = b.position;
    p.minutes = b.minutes;
    p.weather = b.weather;

    if (!p.dead && !p.at_garage) {
      const elapsed = b.elapsed;
      const moving = Math.min(elapsed, b.moving);
      const traveled = Math.min(b.distance, moving * 520);

      p.hunger = Math.max(0, p.hunger - elapsed * 0.04);
      p.energy = Math.max(0, Math.min(100, p.energy - moving * 0.03 + (elapsed - moving) * 0.015));

      const damage =
        (p.hunger <= 10 ? elapsed * 0.20 : 0) +
        (b.weather === 'rainy' && p.gear !== 'raincoat' ? elapsed * 0.20 : 0);

      p.health = Math.max(0, p.health - damage);

      const bike = p.bike;
      const resource = bike === 'bicycle' ? 'air' : 'fuel';
      if (p.bikes[bike]) {
        const BIKE_RATES: Record<string, number> = {
          bicycle: 0.0035,
          scooter: 0.0095,
          express: 0.0125,
          ninja: 0.0160,
          viper: 0.0220,
        };
        const tankLevel = p.bikes[bike].tank_level || 1;
        const capacityMultiplier = bike === 'bicycle' ? 1 : 1 + (tankLevel - 1) * 0.5;
        const baseRate = BIKE_RATES[bike] ?? 0.0095;
        const rate = baseRate / capacityMultiplier;
        p.bikes[bike][resource] = Math.max(
          0,
          p.bikes[bike][resource] - traveled * rate
        );
      }

      if (p.health <= 0) {
        p.dead = true;
        p.online = false;
        if (activeOrder) activeOrder.status = 'cancelled';
        await saveLocalProfile(p);
      }

      // Rain kit degradation (tears up after 3 in-game days = 4320 minutes)
      if (p.rainkit_purchased_minutes && (p.minutes - p.rainkit_purchased_minutes >= 4320)) {
        if (p.carrying_rainkit || p.owned_gear.includes('raincoat')) {
          p.carrying_rainkit = false;
          p.owned_gear = p.owned_gear.filter(g => g !== 'raincoat');
          if (p.gear === 'raincoat') p.gear = 'everyday';
          p.rainkit_purchased_minutes = undefined;
          await saveLocalProfile(p);
        }
      }

      // Speed Boost expiration (1 in-game day = 1440 minutes = 12 real minutes)
      if (p.speed_boost_until && p.minutes >= p.speed_boost_until) {
        p.speed_boost_until = undefined;
        await saveLocalProfile(p);
      }

      // Pro User 7-in-game-day free boost cycle refresh (10,080 minutes = 7 days)
      if (p.is_pro) {
        if (p.pro_boost_reset_at === undefined || p.minutes >= p.pro_boost_reset_at) {
          p.pro_free_boosts = 2;
          p.pro_boost_reset_at = (p.minutes || 0) + 10080;
          await saveLocalProfile(p);
        }
      }
    }

    cachedProfile = p;
    const dispatch = await getLocalDispatch();
    return { profile: p, dispatch } as unknown as T;
  }

  // Collision
  if (path === '/game/collision' && method === 'POST') {
    const b = body as { kind: 'traffic' | 'wall' };
    if (!p.at_garage && !p.dead) {
      const strong = b.kind === 'traffic';
      const bike = p.bike;
      p.health = Math.max(0, p.health - (strong ? 4 : 1));
      p.energy = Math.max(0, p.energy - (strong ? 6 : 2));
      if (p.bikes[bike]) {
        p.bikes[bike].condition = Math.max(0, p.bikes[bike].condition - (strong ? 5 : 2));
        if (bike === 'bicycle') {
          p.bikes[bike].air = Math.max(0, p.bikes[bike].air - (strong ? 3 : 1));
        }
      }
      if (p.health <= 0) {
        p.dead = true;
        p.online = false;
        await saveLocalProfile(p);
      }
      cachedProfile = p;
    }
    return p as unknown as T;
  }

  // Equipment & Purchases
  if (path === '/profile/equipment' && method === 'PUT') {
    const b = body as { bike: string; gear: string };
    p.bike = b.bike;
    p.gear = b.gear;
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  if (path === '/profile/purchase' && method === 'POST') {
    const b = body as { item: string };
    const cost = BIKES.find(bike => bike.id === b.item)?.cost ?? (b.item === 'raincoat' ? 60 : 60);
    if (p.balance >= cost) {
      p.balance -= cost;
      if (['express', 'ninja', 'viper'].includes(b.item)) {
        if (!p.owned_bikes.includes(b.item)) p.owned_bikes.push(b.item);
        if (!p.bikes[b.item]) p.bikes[b.item] = { condition: 100, fuel: 100, air: 100, tank_level: 1 };
      } else if (b.item === 'raincoat') {
        if (!p.owned_gear.includes('raincoat')) p.owned_gear.push('raincoat');
        p.carrying_rainkit = true;
      }
      await saveLocalProfile(p);
    }
    return p as unknown as T;
  }

  // Garage Tank Upgrade
  if (path === '/garage/upgrade_tank' && method === 'POST') {
    const b = body as { bike: string };
    const bikeId = b.bike;
    const maxLevel = MAX_TANK_LEVELS[bikeId] || 1;
    const stats = p.bikes[bikeId];
    const isOwned = p.bike === bikeId || p.owned_bikes.includes(bikeId);
    if (stats && isOwned) {
      const currentLevel = stats.tank_level || 1;
      const nextLevel = currentLevel + 1;
      if (nextLevel <= maxLevel) {
        const cost = TANK_UPGRADE_COSTS[nextLevel] || 50;
        if (p.balance >= cost) {
          p.balance -= cost;
          stats.tank_level = nextLevel;
          stats.fuel = 100; // Bonus full tank with new capacity!
          await saveLocalProfile(p);
        } else {
          throw new Error('Not enough coins to upgrade fuel tank.');
        }
      } else {
        throw new Error('Fuel tank is already at maximum capacity.');
      }
    }
    return p as unknown as T;
  }

  // Speed Boost Activation (+10 km/h for 1 in-game day = 1440 minutes = 12 real minutes)
  if (path === '/game/boost' && method === 'POST') {
    if (p.speed_boost_until && p.minutes < p.speed_boost_until) {
      throw new Error('Speed boost is already active! Please wait until it expires.');
    }
    const b = body as { method: 'pro' | 'coins' | 'ad' };
    const DURATION = 1440; // 1 in-game day = 12 real-world minutes of gameplay
    if (b.method === 'pro') {
      if (!p.is_pro) {
        throw new Error('Pro membership required for free speed boosts.');
      }
      if ((p.pro_free_boosts ?? 0) <= 0) {
        throw new Error('No free Pro boosts remaining in this 7-day cycle.');
      }
      p.pro_free_boosts = Math.max(0, (p.pro_free_boosts ?? 2) - 1);
      p.speed_boost_until = Math.max(p.speed_boost_until || 0, p.minutes || 0) + DURATION;
      await saveLocalProfile(p);
      return { profile: p, message: 'Speed Boost active: +10 km/h for 1 in-game day (12 minutes).' } as unknown as T;
    } else if (b.method === 'coins') {
      const cost = 10;
      if (p.balance < cost) {
        throw new Error('Insufficient coins. You need 10 coins for a Speed Boost.');
      }
      p.balance -= cost;
      p.speed_boost_until = Math.max(p.speed_boost_until || 0, p.minutes || 0) + DURATION;
      await saveLocalProfile(p);
      return { profile: p, message: 'Speed Boost active: +10 km/h for 1 in-game day (12 minutes).' } as unknown as T;
    } else if (b.method === 'ad') {
      p.speed_boost_until = Math.max(p.speed_boost_until || 0, p.minutes || 0) + DURATION;
      await saveLocalProfile(p);
      return { profile: p, message: 'Speed Boost active: +10 km/h for 1 in-game day (12 minutes).' } as unknown as T;
    }
    throw new Error('Invalid boost method.');
  }

  if (path === '/profile/online' && method === 'PUT') {
    const isNewLife = !p.partho_quest_completed && !p.partho_borrowed_express && (p.partho_chat_stage ?? 0) < 2;
    if (isNewLife) {
      throw new Error('Check your messages and meet Partho first!');
    }
    const b = body as { online: boolean };
    p.online = b.online;
    if (!p.online && activeOrder && activeOrder.status === 'offered') {
      activeOrder = null;
    }
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  if (path === '/profile/position' && method === 'PUT') {
    const b = body as { position: Point };
    if (b.position) {
      p.position = { x: b.position.x, y: b.position.y };
      p.at_garage = false;
      await saveLocalProfile(p);
    }
    return p as unknown as T;
  }

  // Order Actions
  if (path.startsWith('/orders/')) {
    const parts = path.split('/');
    const action = parts[parts.length - 1];

    if (action === 'accept') {
      const isNewLife = !p.partho_quest_completed && !p.partho_borrowed_express && (p.partho_chat_stage ?? 0) < 2;
      if (isNewLife) {
        throw new Error('Check your messages and meet Partho first!');
      }
      if (activeOrder) {
        activeOrder.status = 'accepted';
        activeOrder.pickup_deadline = Date.now() / 1000 + (activeOrder.pickup_seconds || 90);
        if (p.tutorial_active && (p.tutorial_step === 6 || p.tutorial_step === 5)) {
          p.tutorial_step = 7;
        }
        await saveLocalProfile(p);
      }
      return activeOrder as unknown as T;
    }

    if (action === 'decline') {
      if (activeOrder) {
        activeOrder.status = 'cancelled';
        activeOrder = null;
      }
      orderCooldownUntil = Date.now() / 1000 + 35;
      return { status: 'cancelled' } as unknown as T;
    }

    if (action === 'pickup') {
      const pos = body as Point | undefined;
      if (activeOrder && pos) {
        const roadPt = nearestRoad(activeOrder.pickup).point;
        const dist = Math.min(distance(pos, activeOrder.pickup), distance(pos, roadPt));
        if (dist > 75) {
          throw new Error('Not at the pickup location!');
        }
      }
      if (activeOrder) {
        activeOrder.status = 'picked_up';
        activeOrder.pickup_deadline = null;
      }
      return activeOrder as unknown as T;
    }

    if (action === 'deliver') {
      const pos = body as Point | undefined;
      if (activeOrder && pos) {
        const roadPt = nearestRoad(activeOrder.dropoff).point;
        const dist = Math.min(distance(pos, activeOrder.dropoff), distance(pos, roadPt));
        if (dist > 75) {
          throw new Error('You must reach the customer delivery location first!');
        }
      }
      const deliveredOrder = activeOrder ? { ...activeOrder, status: 'delivered' as const } : null;
      if (deliveredOrder) {
        // Chill Dash Pro VIP gets +25% bonus coins and +25 bonus XP
        const proBonus = p.is_pro ? Math.max(5, Math.round(deliveredOrder.reward * 0.25)) : 0;
        const totalReward = deliveredOrder.reward + proBonus;
        p.balance += totalReward;
        p.earned += totalReward;
        p.deliveries += 1;
        p.xp += deliveredOrder.xp + (p.is_pro ? 25 : 0);
        orderCooldownUntil = Date.now() / 1000 + 45;
        activeOrder = null;
        await saveLocalProfile(p);
      }
      return { order: deliveredOrder, profile: p } as unknown as T;
    }
  }

  // Garage Enter & Leave
  if (path === '/garage/enter') {
    p.at_garage = true;
    p.online = false;
    p.health = 100;
    p.energy = 100;
    p.hunger = Math.max(40, p.hunger);
    p.position = { x: 352, y: 750 };
    const curBike = p.bikes[p.bike];
    if (curBike) {
      if (curBike.condition <= 25) curBike.condition = 100;
      if (curBike.air <= 20) curBike.air = 100;
      if (curBike.fuel <= 20) curBike.fuel = 100;
    }
    if (activeOrder && activeOrder.status === 'offered') activeOrder = null;
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  if (path === '/garage/leave') {
    p.at_garage = false;
    if (p.tutorial_active && p.tutorial_step === 3) {
      p.tutorial_step = 4;
    }
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  // Quick Travel (costs 30 coins)
  if (path === '/profile/travel' && method === 'POST') {
    const b = body as { destination: Point; cost?: number };
    const cost = b.cost ?? 30;
    if (p.balance < cost) {
      throw new Error(`Quick travel costs ${cost} coins. You have ${p.balance} coins.`);
    }
    p.balance -= cost;
    p.position = b.destination;
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  if (path === '/profile/position' && method === 'PUT') {
    const b = body as { position: Point; cost?: number };
    if (b.cost && p.balance >= b.cost) {
      p.balance -= b.cost;
    }
    p.position = b.position;
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  // Set Pro status
  if (path === '/profile/pro') {
    const b = (body || {}) as { is_pro?: boolean; plan?: 'monthly' | 'yearly' | 'lifetime'; expires_at?: number };
    p.is_pro = b.is_pro !== false;
    if (b.plan) p.pro_plan = b.plan;
    if (b.expires_at) p.pro_expires_at = b.expires_at;
    if (p.is_pro) {
      if (!p.pro_free_boosts || p.pro_free_boosts < 1) {
        p.pro_free_boosts = 2;
        p.pro_boost_reset_at = (p.minutes || 0) + 10080;
      }
    } else {
      p.pro_free_boosts = 0;
      p.pro_boost_reset_at = undefined;
      p.pro_plan = undefined;
      p.pro_expires_at = undefined;
    }
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  // Recovery (after death)
  if (path === '/recovery') {
    const b = body as { choice: 'pay' | 'restart'; confirm_restart?: boolean };
    if (b.choice === 'pay') {
      // Pro VIPs have 0 recovery fee (saves 15 coins every time)
      if (!p.is_pro) {
        p.balance = Math.max(0, p.balance - 15);
      }
      p.dead = false;
      p.health = 100;
      p.energy = 100;
      p.hunger = 80;
      p.position = { x: 352, y: 750 };
      p.at_garage = true;
      p.online = false;
    } else {
      const fresh = getDefaultProfile();
      Object.assign(p, fresh);
    }
    activeOrder = null;
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  // Wallet / Coin purchases & ad rewards
  if (path === '/wallet/coins') {
    const b = body as { coins: number; reason?: string };
    p.balance += (b.coins || 0);
    if ((b.coins || 0) > 0) p.earned += b.coins;
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  // Food
  if (path === '/food/buy') {
    const b = body as { item: 'apple' | 'sandwich' | 'meal' };
    const food = (worldData.foods as Record<string, { price: number }>)[b.item];
    if (food && p.balance >= food.price) {
      p.balance -= food.price;
      p.food[b.item] = (p.food[b.item] || 0) + 1;
      await saveLocalProfile(p);
    }
    return p as unknown as T;
  }

  if (path === '/food/eat') {
    const b = body as { item: 'apple' | 'sandwich' | 'meal' };
    if (p.food[b.item] && p.food[b.item] > 0) {
      p.food[b.item] -= 1;
      const food = (worldData.foods as Record<string, { health: number; energy: number; hunger: number }>)[b.item];
      if (food) {
        p.health = Math.min(100, p.health + food.health);
        p.energy = Math.min(100, p.energy + food.energy);
        p.hunger = Math.min(100, p.hunger + food.hunger);
      }
      await saveLocalProfile(p);
    }
    return p as unknown as T;
  }

  // Milestones
  if (path.includes('/milestones/') && path.endsWith('/claim')) {
    const count = parseInt(path.split('/')[2], 10);
    const milestone = worldData.milestones.find(m => m.deliveries === count);
    if (milestone && !p.claimed_milestones.includes(count) && p.deliveries >= count) {
      p.balance += milestone.coins;
      p.claimed_milestones.push(count);
      for (const [foodKey, qty] of Object.entries(milestone.food)) {
        p.food[foodKey] = (p.food[foodKey] || 0) + (qty as number);
      }
      if (count === 1 && p.tutorial_active && (p.tutorial_step || 1) <= 7) {
        p.tutorial_step = 8;
      }
      await saveLocalProfile(p);
    }
    return p as unknown as T;
  }

  // Services
  if (path === '/services/use' || path === '/services/roadside') {
    const b = body as { action: 'repair' | 'refuel' | 'pump' | 'rest'; service_id?: string; coins?: number };
    const remote = path === '/services/roadside';
    const bike = p.bike;
    if (b.action === 'rest') {
      p.health = 100;
      p.energy = 100;
      p.hunger = Math.max(40, p.hunger);
    } else {
      const stats = p.bikes[bike];
      if (stats) {
        if (b.action === 'repair') {
          const cost = Math.ceil((100 - stats.condition) * 0.25) + (remote ? 10 : 0);
          if (p.balance >= cost) {
            p.balance -= cost;
            stats.condition = 100;
          }
        } else if (b.action === 'pump') {
          // Bicycle tire pump remains flat 4 coins (+10 roadside)
          const cost = 4 + (remote ? 10 : 0);
          if (p.balance >= cost) {
            p.balance -= cost;
            stats.air = 100;
          }
        } else if (b.action === 'refuel') {
          // Motorized bike: partial or full refueling based on tank_level
          const fullTankCost = getFullRefuelCost(bike, stats.tank_level);
          const missingFuel = Math.max(0, 100 - stats.fuel);
          const maxNeededCoins = Math.max(1, Math.ceil((missingFuel / 100) * fullTankCost));

          let spendFuelCoins = maxNeededCoins;
          if (typeof b.coins === 'number' && b.coins >= 6) {
            spendFuelCoins = Math.min(b.coins, maxNeededCoins);
          }
          const totalCost = spendFuelCoins + (remote ? 10 : 0);
          if (p.balance >= totalCost && missingFuel > 0.01) {
            p.balance -= totalCost;
            const addedFuel = (spendFuelCoins / fullTankCost) * 100;
            stats.fuel = Math.min(100, stats.fuel + addedFuel);
          }
        }
      }
      if (b.action === 'refuel' && p.tutorial_active && p.tutorial_step === 8) {
        p.tutorial_step = 9;
      }
    }
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  // Gear Pack / Remote
  if (path === '/gear/carry') {
    const b = body as { carry: boolean };
    p.carrying_rainkit = b.carry;
    if (!b.carry) p.gear = 'everyday';
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  if (path === '/gear/remote') {
    if (!p.carrying_rainkit) {
      const owned = p.owned_gear.includes('raincoat');
      const isFreeTutorial = p.tutorial_active && !owned;
      const cost = isFreeTutorial ? 0 : (owned ? 0 : 60) + (p.at_garage ? 0 : 10);
      if (p.balance >= cost) {
        p.balance -= cost;
        p.carrying_rainkit = true;
        if (!owned) p.owned_gear.push('raincoat');
        p.rainkit_purchased_minutes = p.minutes;
        if (p.tutorial_active && (p.tutorial_step || 1) <= 2) {
          p.tutorial_step = 3;
        }
        await saveLocalProfile(p);
      }
    }
    return p as unknown as T;
  }

  // Partho Story & Express Bike Tutorial Endpoints
  if (path === '/tutorial/partho_borrow_express') {
    p.partho_borrowed_express = true;
    p.partho_chat_stage = 2;
    if (!p.bikes.express) p.bikes.express = { condition: 100, fuel: 100, air: 100, tank_level: 1 };
    p.owned_bikes = ['express']; // all others locked during test
    p.bike = 'express';
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  if (path === '/tutorial/partho_return_express') {
    p.partho_borrowed_express = false;
    p.partho_quest_completed = true;
    p.owned_bikes = ['scooter', 'bicycle'];
    p.bike = 'scooter';
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  if (path === '/tutorial/partho_chat_stage') {
    const b = body as { stage: number };
    if (b && typeof b.stage === 'number') {
      p.partho_chat_stage = b.stage;
    }
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  // Tutorial Flow Endpoints
  if (path === '/tutorial/borrow_viper') {
    p.boss_borrowed_viper = true;
    if (!p.owned_bikes.includes('viper')) p.owned_bikes.push('viper');
    if (!p.bikes.viper) p.bikes.viper = { condition: 100, fuel: 100, air: 100, tank_level: 1 };
    p.bike = 'viper';
    p.tutorial_step = 2;
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  if (path === '/tutorial/step') {
    const b = body as { step: number };
    if (b && typeof b.step === 'number') {
      p.tutorial_step = b.step;
    }
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  if (path === '/tutorial/return_viper') {
    p.tutorial_completed = true;
    p.tutorial_active = false;
    p.tutorial_step = 10;
    if (p.boss_borrowed_viper) {
      p.boss_borrowed_viper = false;
      p.owned_bikes = p.owned_bikes.filter(id => id !== 'viper');
      p.bike = 'scooter';
    }
    p.balance += 50;
    p.earned += 50;
    p.xp += 50;
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  if (path === '/tutorial/skip') {
    p.tutorial_completed = true;
    p.tutorial_active = false;
    if (p.boss_borrowed_viper) {
      p.boss_borrowed_viper = false;
      p.owned_bikes = p.owned_bikes.filter(id => id !== 'viper');
      p.bike = 'scooter';
    }
    await saveLocalProfile(p);
    return p as unknown as T;
  }

  // Custom Goals Claim (RevenueCat Bridge)
  if (path === '/goals/claim_bridge') {
    if (p.visited_revenuecat_bridge && !p.claimed_bridge_goal) {
      p.claimed_bridge_goal = true;
      p.balance += 50;
      p.earned += 50;
      p.food.sandwich = (p.food.sandwich || 0) + 2;
      p.xp += 30;
      await saveLocalProfile(p);
    }
    return p as unknown as T;
  }

  return p as unknown as T;
}
