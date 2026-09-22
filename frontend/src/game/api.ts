import Constants from 'expo-constants';
import { storage } from '@/src/utils/storage';
import type { WorldData } from './region';

export type Point = { x: number; y: number };
export type Weather = 'sunny' | 'cloudy' | 'rainy';
export type Profile = {
  id: string; name: string; balance: number; earned: number; deliveries: number; xp: number;
  bike: string; gear: string; owned_bikes: string[]; owned_gear: string[]; online: boolean;
  position: Point; minutes: number; weather: Weather;
  health: number; hunger: number; energy: number; dead: boolean; at_garage: boolean;
  bikes: Record<string, { condition: number; fuel: number; air: number; tank_level?: number }>;
  food: Record<string, number>; carrying_rainkit: boolean; claimed_milestones: number[];
  auth_boost_claimed?: boolean;
  is_pro?: boolean;
  tutorial_step?: number;
  tutorial_active?: boolean;
  tutorial_completed?: boolean;
  boss_borrowed_viper?: boolean;
  partho_borrowed_express?: boolean;
  partho_quest_completed?: boolean;
  partho_chat_stage?: number;
  rainkit_purchased_minutes?: number;
  visited_revenuecat_bridge?: boolean;
  claimed_bridge_goal?: boolean;
  speed_boost_until?: number;
  pro_free_boosts?: number;
  pro_boost_reset_at?: number;
  pro_plan?: 'monthly' | 'yearly' | 'lifetime';
  pro_expires_at?: number;
};
export type Place = Point & { name: string; address: string };
export type Order = {
  id: string; pickup: Place; dropoff: Place; item: string; customer: string; reward: number;
  xp: number; status: 'offered' | 'accepted' | 'picked_up' | 'delivered' | 'expired' | 'cancelled'; created_at: string;
  pickup_deadline: number | null; pickup_seconds: number;
};
export type Dispatch = { orders: Order[]; message: string; region: string; retry_after: number };
export type Service = Point & { id: string; name: string; kind: 'garage' | 'fuel' | 'repair' | 'bike_shop'; address: string };
export type Destination = Point & { id:string; name:string; kind:string; address:string };
export type Catalog = { foods: Record<string, { name: string; price: number; hunger: number; energy: number; health: number }>; milestones: { deliveries: number; name: string; coins: number; food: Record<string, number> }[]; services: Service[]; recovery_cost: number; world:WorldData; server_time:number };
const TOKEN_KEY = 'chill-dash-session';
let token = '';
// Expo Go reads manifest extras; the browser preview uses Expo's inlined public value.
const BASE = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

import { localApi, getLocalProfile } from './localEngine';

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  if (!BASE) {
    return localApi<T>(path, method, body);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${BASE}/api${path}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not save this action. Please try again.');
    return data;
  } catch (error) {
    // Graceful offline fallback
    return localApi<T>(path, method, body);
  } finally { clearTimeout(timeout); }
}

export async function openSave() {
  if (!BASE) {
    return getLocalProfile();
  }
  try {
    token = await storage.secureGet(TOKEN_KEY, '') || '';
    if (token) return api<Profile>('/profile');
    const session = await api<{ token: string; profile: Profile }>('/sessions', 'POST');
    token = session.token;
    await storage.secureSet(TOKEN_KEY, token);
    return session.profile;
  } catch {
    return getLocalProfile();
  }
}

export { restoreProfileFromSyncCode, saveLocalProfile } from './localEngine';
export { getSyncId, setSyncId } from './supabase';