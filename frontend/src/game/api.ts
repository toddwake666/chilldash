import Constants from 'expo-constants';
import { storage } from '@/src/utils/storage';

export type Point = { x: number; y: number };
export type Weather = 'sunny' | 'cloudy' | 'rainy';
export type Profile = {
  id: string; name: string; balance: number; earned: number; deliveries: number; xp: number;
  bike: string; gear: string; owned_bikes: string[]; owned_gear: string[]; online: boolean;
  position: Point; minutes: number; weather: Weather;
  health: number; hunger: number; energy: number; dead: boolean; at_garage: boolean;
  bikes: Record<string, { condition: number; fuel: number; air: number }>;
  food: Record<string, number>; carrying_rainkit: boolean; claimed_milestones: number[];
};
export type Place = Point & { name: string; address: string };
export type Order = {
  id: string; pickup: Place; dropoff: Place; item: string; customer: string; reward: number;
  xp: number; status: 'offered' | 'accepted' | 'picked_up' | 'delivered' | 'expired' | 'cancelled'; created_at: string;
  pickup_deadline: number | null; pickup_seconds: number;
};
export type Dispatch = { orders: Order[]; message: string; region: string; retry_after: number };
export type Service = Point & { id: string; name: string; kind: 'garage' | 'fuel' | 'repair'; address: string };
export type Catalog = { foods: Record<string, { name: string; price: number; hunger: number; energy: number; health: number }>; milestones: { deliveries: number; name: string; coins: number; food: Record<string, number> }[]; services: Service[]; recovery_cost: number };
const TOKEN_KEY = 'chill-dash-session';
let token = '';
// Expo Go reads manifest extras; the browser preview uses Expo's inlined public value.
const BASE = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  if (!BASE) throw new Error('The game connection is not configured.');
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
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Connection took too long. Please try again.');
    throw error;
  } finally { clearTimeout(timeout); }
}

export async function openSave() {
  token = await storage.secureGet(TOKEN_KEY, '') || '';
  if (token) return api<Profile>('/profile');
  const session = await api<{ token: string; profile: Profile }>('/sessions', 'POST');
  token = session.token;
  await storage.secureSet(TOKEN_KEY, token);
  return session.profile;
}