import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';

export const POSTHOG_API_KEY =
  process.env.EXPO_PUBLIC_POSTHOG_API_KEY || 'phc_y9et3wuwFCUC3aTuWRUqupr8WeYt2zPDCxbGp49vfEGY';
export const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

// Singleton instance for imperative tracking across game loop & context
export const posthog = new PostHog(POSTHOG_API_KEY, {
  host: POSTHOG_HOST,
  captureAppLifecycleEvents: true,
  enablePersistSessionIdAcrossRestart: true,
});

/**
 * Identify the current player in PostHog
 */
export function identifyRider(identity: {
  userId?: string | null;
  email?: string | null;
  playGamesId?: string | null;
  displayName?: string | null;
  deliveries?: number;
  balance?: number;
  currentBike?: string;
}) {
  const distinctId = identity.userId || identity.playGamesId;
  if (!distinctId) return;

  try {
    const props: Record<string, string | number | boolean> = {
      deliveries_completed: identity.deliveries ?? 0,
      coin_balance: identity.balance ?? 0,
      platform: Platform.OS,
    };
    if (identity.email) props.email = identity.email;
    if (identity.displayName) props.name = identity.displayName;
    if (identity.playGamesId) props.play_games_id = identity.playGamesId;
    if (identity.currentBike) props.current_bike = identity.currentBike;

    posthog.identify(distinctId, props);
  } catch (e) {
    // Non-blocking telemetry
  }
}

/**
 * General event tracker with safe non-blocking execution
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  try {
    posthog.capture(eventName, {
      timestamp: Date.now(),
      platform: Platform.OS,
      ...properties,
    });
  } catch (err) {
    // Non-blocking telemetry
  }
}

/**
 * Delivery Lifecycle Events
 */
export function trackDeliveryEvent(
  action: 'offered' | 'accepted' | 'declined' | 'picked_up' | 'completed' | 'cancelled',
  order: {
    id: string;
    item?: string;
    customer?: string;
    reward?: number;
    xp?: number;
    pickup?: { name: string; address?: string };
    dropoff?: { name: string; address?: string };
  },
  extra?: {
    duration_sec?: number;
    health_remaining?: number;
    fuel_remaining?: number;
    reason?: string;
  }
) {
  trackEvent(`delivery_${action}`, {
    order_id: order.id,
    item: order.item,
    customer: order.customer,
    reward: order.reward,
    xp: order.xp,
    pickup_name: order.pickup?.name,
    dropoff_name: order.dropoff?.name,
    ...extra,
  });
}

/**
 * Economy & Shop Events
 */
export function trackEconomyEvent(
  action: 'food_bought' | 'food_eaten' | 'gear_bought' | 'service_used' | 'bike_bought' | 'bike_upgraded' | 'reward_claimed',
  details: {
    category?: string;
    item_id?: string;
    item_name?: string;
    cost?: number;
    balance_after?: number;
    stats_restored?: Record<string, number>;
  }
) {
  trackEvent(`economy_${action}`, details);
}

/**
 * Tutorial & Onboarding Events
 */
export function trackTutorialEvent(
  step: 'partho_chat_stage' | 'borrow_express' | 'return_express' | 'first_delivery_done',
  details?: Record<string, any>
) {
  trackEvent(`tutorial_${step}`, details);
}

/**
 * UI Navigation
 */
export function trackTabSwitch(tab: string) {
  trackEvent('phone_tab_switched', { tab });
}
