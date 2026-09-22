import { createClient, Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import type { Profile } from './api';

// Complete any pending auth sessions on web/native
WebBrowser.maybeCompleteAuthSession();

export const SUPABASE_URL = 'https://pykqjpiflndeexxujikz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5a3FqcGlmbG5kZWV4eHVqaWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MDI0OTMsImV4cCI6MjEwNDQ3ODQ5M30.98WaCuSQbnn0GnPpNLPs08Lf93-uYNvC3ImFalB6Lqw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

const DEVICE_ID_KEY = 'chill_dash_device_sync_id';

/**
 * Gets or creates a persistent unique Sync ID for this installation.
 * Example format: CD-A1B2-C3D4
 */
export async function getSyncId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      id = `CD-${part1}-${part2}`;
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'CD-DEMO-0001';
  }
}

/**
 * Sets a custom Sync ID (used when a player restores their progress on a new install).
 */
export async function setSyncId(newId: string): Promise<void> {
  await AsyncStorage.setItem(DEVICE_ID_KEY, newId.trim().toUpperCase());
}

export type AuthResult = {
  success: boolean;
  user?: User | null;
  session?: Session | null;
  error?: string;
};

/**
 * Signs up a new rider with email and password.
 * Automatically confirmed via database trigger (no email verification required).
 */
export async function signUpWithEmail(email: string, password: string, name?: string): Promise<AuthResult> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Please enter both email and password.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: name?.trim() || 'Rider',
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Auto-confirm trigger in Postgres verifies user immediately.
    // If GoTrue did not issue a session on signUp, sign in immediately.
    if (!data.session) {
      const signInRes = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (signInRes.error) {
        return { success: false, error: signInRes.error.message };
      }
      return { success: true, user: signInRes.data.user, session: signInRes.data.session };
    }

    return { success: true, user: data.user, session: data.session };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to sign up.' };
  }
}

/**
 * Signs in an existing rider with email and password.
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user, session: data.session };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to log in.' };
  }
}

/**
 * Initiates Google OAuth authentication.
 * Works seamlessly on Native (via Expo WebBrowser & deep linking) and Web.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const redirectUrl = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : Linking.createURL('auth/callback');

    // Pre-flight check: verify if Google provider is enabled on this Supabase project
    const authProbeUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;
    try {
      const probe = await fetch(authProbeUrl, { method: 'GET' });
      if (probe.status === 400) {
        const body = await probe.json().catch(() => null);
        if (body?.msg && body.msg.includes('provider is not enabled')) {
          return {
            success: false,
            error: 'Google sign-in is not yet enabled in the Supabase Dashboard. You can sign up with Email instantly without verification, or enable Google under Authentication > Providers in Supabase.',
          };
        }
      }
    } catch {
      // Proceed if offline or network probe fails
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (Platform.OS === 'web') {
      return { success: true };
    }

    if (!data?.url) {
      return { success: false, error: 'Could not generate Google authorization link.' };
    }

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (res.type === 'success' && res.url) {
      const returnUrl = res.url;
      const [beforeHash, hashFragment] = returnUrl.split('#');
      const [, queryString] = beforeHash.split('?');

      let accessToken: string | null = null;
      let refreshToken: string | null = null;
      let code: string | null = null;

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

      if (accessToken && refreshToken) {
        const sessionRes = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionRes.error) {
          return { success: false, error: sessionRes.error.message };
        }
        return { success: true, user: sessionRes.data.user, session: sessionRes.data.session };
      } else if (code) {
        const exchangeRes = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeRes.error) {
          return { success: false, error: exchangeRes.error.message };
        }
        return { success: true, user: exchangeRes.data.user, session: exchangeRes.data.session };
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        return { success: true, user: session.user, session };
      }

      return { success: false, error: 'Authentication completed but no session was returned.' };
    } else if (res.type === 'cancel' || res.type === 'dismiss') {
      return { success: false, error: 'Google sign-in was cancelled.' };
    }

    return { success: false, error: 'Google sign-in did not complete.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Google authentication error.' };
  }
}

/**
 * Signs out the current user.
 */
export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to sign out.' };
  }
}

/**
 * Fetches the currently authenticated user, or null.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Fetches the currently authenticated session, or null.
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

/**
 * Fetches cloud profile for a specific Supabase user ID.
 */
export async function loadProfileForUser(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('player_saves')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return (data.profile_data as Profile) || null;
  } catch {
    return null;
  }
}

/**
 * Saves the current profile to Supabase cloud, automatically binding user_id if authenticated.
 */
let debounceTimer: any = null;
export async function syncProfileToSupabase(p: Profile, immediate = false): Promise<void> {
  const doSync = async () => {
    try {
      const syncId = await getSyncId();
      const currentBike = p.bikes[p.bike] || { condition: 100, fuel: 100 };
      const level = Math.floor(p.xp / 100) + 1;

      // Identify if a user is currently authenticated
      let userId: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id || null;
      } catch {
        userId = null;
      }

      const payload: Record<string, any> = {
        device_id: syncId,
        player_name: p.name,
        level,
        xp: p.xp,
        balance: p.balance,
        bike: p.bike,
        gear: p.gear,
        owned_bikes: p.owned_bikes,
        deliveries: p.deliveries,
        hunger: Math.round(p.hunger),
        fuel: Math.round(currentBike.fuel),
        condition: Math.round(currentBike.condition),
        milestones_claimed: p.claimed_milestones || [],
        profile_data: p,
        updated_at: new Date().toISOString(),
      };

      if (userId) {
        payload.user_id = userId;
      }

      const { error } = await supabase
        .from('player_saves')
        .upsert(payload, { onConflict: 'device_id' });

      if (error) {
        console.warn('[Supabase Sync] Upsert error:', error.message);
        if (immediate) throw error;
      } else {
        console.log(`[Supabase Sync] Player saved to cloud! (Sync ID: ${syncId}, User: ${userId || 'guest'})`);
      }
    } catch (err) {
      console.warn('[Supabase Sync] Network/sync error:', err);
      if (immediate) throw err;
    }
  };

  if (immediate) {
    await doSync();
  } else {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doSync, 20000);
  }
}

/**
 * Fetches the profile from Supabase cloud for the given syncId or authenticated user.
 */
export async function loadProfileFromSupabase(syncId?: string): Promise<Profile | null> {
  try {
    // If no explicit syncId was provided, check if user is logged in
    if (!syncId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const userProfile = await loadProfileForUser(session.user.id);
          if (userProfile) {
            console.log(`[Supabase Sync] Restored profile for user ${session.user.id}`);
            return userProfile;
          }
        }
      } catch (err) {
        console.warn('[Supabase Sync] Could not check user profile:', err);
      }
    }

    const id = syncId || (await getSyncId());
    const { data, error } = await supabase
      .from('player_saves')
      .select('*')
      .eq('device_id', id)
      .maybeSingle();

    if (error || !data) return null;

    if (data.profile_data) {
      return data.profile_data as Profile;
    }

    // Fallback reconstruction if profile_data is not present
    return {
      id: data.device_id,
      name: data.player_name || 'Rider',
      balance: data.balance || 30,
      earned: 0,
      deliveries: data.deliveries || 0,
      xp: data.xp || 0,
      bike: data.bike || 'scooter',
      gear: data.gear || 'everyday',
      owned_bikes: data.owned_bikes || ['scooter', 'bicycle'],
      owned_gear: ['everyday'],
      online: true,
      position: { x: 352, y: 750 },
      minutes: 540,
      weather: 'sunny',
      health: 100,
      hunger: data.hunger || 100,
      energy: 100,
      dead: false,
      at_garage: true,
      bikes: {
        scooter: { condition: data.condition || 100, fuel: data.fuel || 100, air: 100, tank_level: 1 },
        bicycle: { condition: 100, fuel: 100, air: 100, tank_level: 1 },
        express: { condition: 100, fuel: 100, air: 100, tank_level: 1 },
        ninja: { condition: 100, fuel: 100, air: 100, tank_level: 1 },
        viper: { condition: 100, fuel: 100, air: 100, tank_level: 1 },
      },
      food: { apple: 2, sandwich: 0, meal: 0 },
      carrying_rainkit: false,
      claimed_milestones: data.milestones_claimed || [],
    };
  } catch (err) {
    console.warn('[Supabase Sync] Failed to load profile from cloud:', err);
    return null;
  }
}
