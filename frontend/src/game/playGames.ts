import { NativeModules, Platform } from 'react-native';

const { PlayGamesModule } = NativeModules;

export interface PlayGamesPlayer {
  playerId: string;
  displayName: string;
  title?: string;
  iconUri?: string;
}

export interface PlayGamesAuthResult {
  isAuthenticated: boolean;
  player?: PlayGamesPlayer;
  error?: string;
}

/**
 * Default Achievement IDs mapping.
 * In Google Play Console under Play Games Services -> Achievements, you create achievements
 * and paste the generated IDs here or configure them via setPlayGamesIds().
 */
export const PLAY_GAMES_ACHIEVEMENTS = {
  FIRST_SMILE: 'CggIhva1gGwQAhAC',                 // 1 delivery completed (First Delivery)
  RHYTHM: 'CgkI_chilldash_rhythm',                   // 5 deliveries completed
  NEIGHBORHOOD_FAVORITE: 'CgkI_chilldash_neighbor',  // 10 deliveries completed
  TWO_TOWN_LEGEND: 'CgkI_chilldash_legend',          // 25 deliveries completed
  LONG_WAY_HOME: 'CgkI_chilldash_long_way',          // 50 deliveries completed
  BRIDGE_CROSSER: 'CgkI_chilldash_bridge',           // Visit RevenueCat Grand Bridge
  NIGHT_RIDER: 'CgkI_chilldash_night_rider',         // Complete a delivery at night
  BIG_SAVER: 'CgkI_chilldash_big_saver',             // 500+ coins in wallet
};

/**
 * Default Leaderboard IDs mapping.
 * In Google Play Console under Play Games Services -> Leaderboards, you create leaderboards
 * and paste the generated IDs here or configure them via setPlayGamesIds().
 */
export const PLAY_GAMES_LEADERBOARDS = {
  TOP_DELIVERIES: 'CggIhva1gGwQAhAB',                // Top Deliveries
  LIFETIME_EARNED: 'CgkI_chilldash_leaderboard_earned',
  TOTAL_XP: 'CgkI_chilldash_leaderboard_xp',
};

type AchievementKey = keyof typeof PLAY_GAMES_ACHIEVEMENTS;
type LeaderboardKey = keyof typeof PLAY_GAMES_LEADERBOARDS;

let customAchievementMap: Partial<Record<AchievementKey, string>> = {};
let customLeaderboardMap: Partial<Record<LeaderboardKey, string>> = {};

/**
 * Allows dynamic configuration of Play Console generated IDs.
 */
export function setPlayGamesIds(config: {
  achievements?: Partial<Record<AchievementKey, string>>;
  leaderboards?: Partial<Record<LeaderboardKey, string>>;
}) {
  if (config.achievements) {
    customAchievementMap = { ...customAchievementMap, ...config.achievements };
  }
  if (config.leaderboards) {
    customLeaderboardMap = { ...customLeaderboardMap, ...config.leaderboards };
  }
}

export function isRealPlayGamesId(id?: string): boolean {
  if (!id) return false;
  if (id.startsWith('CgkI_chilldash_')) return false;
  return true;
}

function resolveAchievementId(keyOrId: AchievementKey | string): string | undefined {
  let id: string;
  if (keyOrId in PLAY_GAMES_ACHIEVEMENTS) {
    const key = keyOrId as AchievementKey;
    id = customAchievementMap[key] || PLAY_GAMES_ACHIEVEMENTS[key];
  } else {
    id = keyOrId;
  }
  return isRealPlayGamesId(id) ? id : undefined;
}

function resolveLeaderboardId(keyOrId?: LeaderboardKey | string): string | undefined {
  if (!keyOrId) return undefined;
  let id: string;
  if (keyOrId in PLAY_GAMES_LEADERBOARDS) {
    const key = keyOrId as LeaderboardKey;
    id = customLeaderboardMap[key] || PLAY_GAMES_LEADERBOARDS[key];
  } else {
    id = keyOrId;
  }
  return isRealPlayGamesId(id) ? id : undefined;
}

/**
 * Checks whether the current player is authenticated with Google Play Games.
 */
export async function checkPlayGamesAuth(): Promise<PlayGamesAuthResult> {
  if (Platform.OS !== 'android' || !PlayGamesModule) {
    return { isAuthenticated: false, error: 'Platform not supported' };
  }
  try {
    const res = await PlayGamesModule.isAuthenticated();
    if (res && res.isAuthenticated) {
      return {
        isAuthenticated: true,
        player: {
          playerId: res.playerId || '',
          displayName: res.displayName || 'Courier',
          title: res.title,
          iconUri: res.iconUri,
        },
      };
    }
    return { isAuthenticated: false, error: res?.error };
  } catch (err: any) {
    return { isAuthenticated: false, error: err?.message || 'Failed to check auth' };
  }
}

/**
 * Initiates the Google Play Games sign in flow manually.
 */
export async function signInPlayGames(): Promise<PlayGamesAuthResult> {
  if (Platform.OS !== 'android' || !PlayGamesModule) {
    return { isAuthenticated: false, error: 'Platform not supported' };
  }
  try {
    const res = await PlayGamesModule.signIn();
    if (res && res.isAuthenticated) {
      return {
        isAuthenticated: true,
        player: {
          playerId: res.playerId || '',
          displayName: res.displayName || 'Courier',
          title: res.title,
          iconUri: res.iconUri,
        },
      };
    }
    return { isAuthenticated: false, error: res?.error || 'Sign in canceled' };
  } catch (err: any) {
    return { isAuthenticated: false, error: err?.message || 'Sign in failed' };
  }
}

/**
 * Opens the official native Google Play Games overlay for Achievements.
 */
export async function showPlayGamesAchievements(): Promise<boolean> {
  if (Platform.OS !== 'android' || !PlayGamesModule) return false;
  try {
    const res = await PlayGamesModule.showAchievements();
    return !!res?.success;
  } catch (err) {
    console.log('[PlayGames] Failed to open achievements overlay:', err);
    return false;
  }
}

/**
 * Opens the official native Google Play Games overlay for Leaderboards.
 */
export async function showPlayGamesLeaderboards(leaderboardKeyOrId?: LeaderboardKey | string): Promise<boolean> {
  if (Platform.OS !== 'android' || !PlayGamesModule) return false;
  try {
    const id = resolveLeaderboardId(leaderboardKeyOrId || 'TOP_DELIVERIES');
    const res = await PlayGamesModule.showLeaderboard(id || null);
    return !!res?.success;
  } catch (err) {
    console.log('[PlayGames] Failed to open leaderboards overlay:', err);
    return false;
  }
}

/**
 * Unlocks an achievement in Google Play Games.
 */
export async function unlockPlayGamesAchievement(keyOrId: AchievementKey | string): Promise<boolean> {
  if (Platform.OS !== 'android' || !PlayGamesModule) return false;
  try {
    const id = resolveAchievementId(keyOrId);
    if (!id) return false;
    const res = await PlayGamesModule.unlockAchievement(id);
    return !!res?.success;
  } catch (err) {
    // Normal when Play Games is not configured or offline
    return false;
  }
}

/**
 * Increments an incremental achievement in Google Play Games.
 */
export async function incrementPlayGamesAchievement(keyOrId: AchievementKey | string, steps = 1): Promise<boolean> {
  if (Platform.OS !== 'android' || !PlayGamesModule) return false;
  try {
    const id = resolveAchievementId(keyOrId);
    if (!id) return false;
    const res = await PlayGamesModule.incrementAchievement(id, steps);
    return !!res?.success;
  } catch (err) {
    return false;
  }
}

/**
 * Submits a player score to a Google Play Games leaderboard.
 */
export async function submitPlayGamesScore(leaderboardKeyOrId: LeaderboardKey | string, score: number): Promise<boolean> {
  if (Platform.OS !== 'android' || !PlayGamesModule) return false;
  try {
    const id = resolveLeaderboardId(leaderboardKeyOrId);
    if (!id) return false;
    const res = await PlayGamesModule.submitScore(id, score);
    return !!res?.success;
  } catch (err) {
    return false;
  }
}

/**
 * Automatically syncs Chill Dash rider accomplishments to Google Play Games:
 * - Submits high scores to leaderboards (Deliveries, Earned coins, XP)
 * - Checks and unlocks milestones / achievements
 */
export async function syncPlayGamesProgress(profile: {
  deliveries: number;
  earned: number;
  xp: number;
  balance?: number;
  visited_revenuecat_bridge?: boolean;
}): Promise<void> {
  if (Platform.OS !== 'android' || !PlayGamesModule) return;

  try {
    // 1. Leaderboard scores
    if (profile.deliveries > 0) {
      submitPlayGamesScore('TOP_DELIVERIES', profile.deliveries).catch(() => {});
    }
    if (profile.earned > 0) {
      submitPlayGamesScore('LIFETIME_EARNED', profile.earned).catch(() => {});
    }
    if (profile.xp > 0) {
      submitPlayGamesScore('TOTAL_XP', profile.xp).catch(() => {});
    }

    // 2. Milestone achievements
    if (profile.deliveries >= 1) {
      unlockPlayGamesAchievement('FIRST_SMILE').catch(() => {});
    }
    if (profile.deliveries >= 5) {
      unlockPlayGamesAchievement('RHYTHM').catch(() => {});
    }
    if (profile.deliveries >= 10) {
      unlockPlayGamesAchievement('NEIGHBORHOOD_FAVORITE').catch(() => {});
    }
    if (profile.deliveries >= 25) {
      unlockPlayGamesAchievement('TWO_TOWN_LEGEND').catch(() => {});
    }
    if (profile.deliveries >= 50) {
      unlockPlayGamesAchievement('LONG_WAY_HOME').catch(() => {});
    }

    // 3. Special event achievements
    if (profile.visited_revenuecat_bridge) {
      unlockPlayGamesAchievement('BRIDGE_CROSSER').catch(() => {});
    }
    if ((profile.balance || 0) >= 500) {
      unlockPlayGamesAchievement('BIG_SAVER').catch(() => {});
    }
  } catch (e) {
    // Non-blocking background sync
  }
}
