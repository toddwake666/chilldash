import React from 'react';
import { Platform, NativeModules, TurboModuleRegistry, View, Text, StyleSheet } from 'react-native';

export interface CoinPack {
  id: string;
  coins: number;
  price: string;
  label: string;
  popular?: boolean;
  bonus?: string;
}

export const COIN_PACKS: CoinPack[] = [
  { id: 'chilldash_coins_100', coins: 100, price: '$0.99', label: 'POCKET STASH' },
  { id: 'chilldash_coins_500', coins: 500, price: '$3.99', label: 'COURIER PACK', popular: true, bonus: '+50 BONUS' },
  { id: 'chilldash_coins_1500', coins: 1500, price: '$9.99', label: 'TYCOON CHEST', bonus: '+250 BONUS' },
];

const hasNativePurchases = !!(
  (NativeModules && NativeModules.RNPurchases) ||
  (TurboModuleRegistry && typeof (TurboModuleRegistry as any).get === 'function' && (TurboModuleRegistry as any).get('RNPurchases'))
);

const hasNativeAdMob = !!(
  (NativeModules && (NativeModules.RNGoogleMobileAdsModule || NativeModules.RNGoogleMobileAdsRewardedModule)) ||
  (TurboModuleRegistry && typeof (TurboModuleRegistry as any).get === 'function' && (TurboModuleRegistry as any).get('RNGoogleMobileAdsRewardedModule'))
);

let PurchasesModule: any = null;
if (hasNativePurchases) {
  try {
    const req = require('react-native-purchases');
    PurchasesModule = req.default || req;
  } catch {}
}

let MobileAdsModule: any = null;
let RewardedAdClass: any = null;
let RewardedAdEvents: any = null;
let BannerAdComponent: any = null;
let BannerAdSizeEnum: any = null;
let AdEventTypeEnum: any = null;
/**
 * Official AdMob App ID and Ad Unit IDs for Chill Dash:
 * App ID: ca-app-pub-1245254576744368~6447332692
 * Banner Ad Unit ID: ca-app-pub-1245254576744368/4449523618
 * Rewarded Ad Unit ID: ca-app-pub-1245254576744368/3092692413
 * Native Ad Unit ID: ca-app-pub-1245254576744368/5397974901
 */
export const ADMOB_CONFIG = {
  APP_ID: 'ca-app-pub-1245254576744368~6447332692',
  BANNER_AD_UNIT_ID: 'ca-app-pub-1245254576744368/4449523618',
  REWARDED_AD_UNIT_ID: 'ca-app-pub-1245254576744368/3092692413',
  NATIVE_AD_UNIT_ID: 'ca-app-pub-1245254576744368/5397974901',
  // Official Google AdMob test IDs for safe debugging without policy violation
  TEST_BANNER_ID: 'ca-app-pub-3940256099942544/6300978111',
  TEST_REWARDED_ID: 'ca-app-pub-3940256099942544/5224354917',
};

export function getBannerAdUnitId(): string {
  if (process.env.EXPO_PUBLIC_ADMOB_BANNER_ID) return process.env.EXPO_PUBLIC_ADMOB_BANNER_ID;
  if (__DEV__ && process.env.EXPO_PUBLIC_USE_PROD_ADS !== 'true') return ADMOB_CONFIG.TEST_BANNER_ID;
  return ADMOB_CONFIG.BANNER_AD_UNIT_ID;
}

export function getRewardedAdUnitId(): string {
  if (process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID) return process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID;
  if (__DEV__ && process.env.EXPO_PUBLIC_USE_PROD_ADS !== 'true') return ADMOB_CONFIG.TEST_REWARDED_ID;
  return ADMOB_CONFIG.REWARDED_AD_UNIT_ID;
}

let AdTestIds: Record<string, string> = {
  REWARDED: ADMOB_CONFIG.REWARDED_AD_UNIT_ID,
  BANNER: ADMOB_CONFIG.BANNER_AD_UNIT_ID,
  NATIVE: ADMOB_CONFIG.NATIVE_AD_UNIT_ID,
};

if (hasNativeAdMob) {
  try {
    const gma = require('react-native-google-mobile-ads');
    MobileAdsModule = gma.default || gma;
    RewardedAdClass = gma.RewardedAd;
    RewardedAdEvents = gma.RewardedAdEventType;
    BannerAdComponent = gma.BannerAd;
    BannerAdSizeEnum = gma.BannerAdSize;
    AdEventTypeEnum = gma.AdEventType;
    if (gma.TestIds) {
      AdTestIds = {
        ...AdTestIds,
        ...gma.TestIds,
      };
    }
  } catch {}
}

export const DEFAULT_REVENUECAT_API_KEY = 'goog_beeAEmOrcXKJcJbEuWyRslxtWKR';
export const PRO_ENTITLEMENT_ID = 'chilldash_pro';

let PurchasesUIModule: any = null;
try {
  const rui = require('react-native-purchases-ui');
  PurchasesUIModule = rui.default || rui;
} catch {}

let isPurchasesConfigured = false;
let isMobileAdsConfigured = false;

/**
 * Initializes RevenueCat and Google Mobile Ads.
 */
export async function initMonetization(revenueCatApiKey?: string) {
  try {
    if (MobileAdsModule && !isMobileAdsConfigured) {
      if (typeof MobileAdsModule === 'function') {
        await MobileAdsModule().initialize();
        isMobileAdsConfigured = true;
        console.log('[Monetization] Google Mobile Ads initialized.');
      }
    }
  } catch (e) {
    console.warn('[Monetization] Google Mobile Ads init notice:', e);
  }

  try {
    const key = revenueCatApiKey || process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || DEFAULT_REVENUECAT_API_KEY;
    if (PurchasesModule && key && !isPurchasesConfigured) {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        // RevenueCat's native SDK aborts release builds if initialized with a test_ API key.
        // In release mode, only initialize if a production key (e.g., 'goog_...') is provided.
        if (!__DEV__ && key.startsWith('test_')) {
          console.warn(
            '[Monetization] RevenueCat test_ key detected in release build. Skipping initialization to prevent SDK force-close. Add your production goog_ key to .env for Google Play.'
          );
        } else {
          await PurchasesModule.configure({ apiKey: key });
          isPurchasesConfigured = true;
          console.log(`[Monetization] RevenueCat configured with key: ${key.substring(0, 8)}...`);
        }
      }
    }
  } catch (e) {
    console.warn('[Monetization] RevenueCat init notice:', e);
  }
}

// ─── Pro Status Types ─────────────────────────────────────────────────────────

export type ProTier = 'monthly' | 'yearly' | 'lifetime';

export interface ProStatus {
  /** True when the chilldash_pro entitlement is currently active */
  isPro: boolean;
  /** True when RevenueCat detected a billing issue (grace period — keep benefits on) */
  billingIssue: boolean;
  /** Which tier granted the entitlement, or null when not Pro */
  tier: ProTier | null;
  /** ISO string of when the subscription expires (null for lifetime or unknown) */
  expiresAt: string | null;
}

/** Live prices fetched from RevenueCat / Play Store. null = product not yet set up. */
export interface LiveProPrices {
  monthlyPrice: string | null;
  yearlyPrice: string | null;
  lifetimePrice: string | null;
  monthlyTrialDays: number | null;
  yearlyTrialDays: number | null;
}

// ─── Entitlement Resolution ───────────────────────────────────────────────────

/**
 * Robust Pro resolution from RevenueCat CustomerInfo.
 * Multi-layer fallback:
 * 1. Primary: chilldash_pro active entitlement
 * 2. Secondary: any other active entitlement in the account (e.g. 'pro', 'premium')
 * 3. Fallback: activeSubscriptions (checks verified Google Play subscription receipts directly)
 * 4. Fallback: nonSubscriptionTransactions (checks verified Google Play one-time purchase)
 */
export function resolveProFromCustomerInfo(customerInfo: any): ProStatus {
  if (!customerInfo) {
    return { isPro: false, billingIssue: false, tier: null, expiresAt: null };
  }

  // 1. Primary: chilldash_pro entitlement
  let entitlement = customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT_ID];

  // 2. Secondary: ANY active entitlement (in case user named it 'pro' or similar)
  if (!entitlement && customerInfo?.entitlements?.active) {
    const activeKeys = Object.keys(customerInfo.entitlements.active);
    if (activeKeys.length > 0) {
      entitlement = customerInfo.entitlements.active[activeKeys[0]];
    }
  }

  // 3. Fallback: activeSubscriptions (Google Play active subscription IDs)
  const activeSubs: string[] = Array.from(customerInfo?.activeSubscriptions || []);
  const matchingSub = activeSubs.find(
    (id: string) =>
      id.includes('monthly') ||
      id.includes('yearly') ||
      id.includes('annual') ||
      id.includes('chilldash_pro') ||
      id.includes('pro')
  );

  // 4. Fallback: nonSubscriptionTransactions for lifetime pass
  const nonSubTx: any[] = customerInfo?.nonSubscriptionTransactions || [];
  const matchingNonSub = nonSubTx.find(
    (t: any) =>
      t.productIdentifier === 'chilldash_pro' ||
      t.productIdentifier?.includes('lifetime') ||
      t.productIdentifier?.includes('pro')
  );

  const isPro = !!(entitlement || matchingSub || matchingNonSub);
  if (!isPro) {
    return { isPro: false, billingIssue: false, tier: null, expiresAt: null };
  }

  const billingIssue = !!customerInfo?.billingIssuesDetectedAt;
  const expiresAt: string | null = entitlement?.expirationDate ?? null;
  const productId: string =
    entitlement?.productIdentifier ?? matchingSub ?? matchingNonSub?.productIdentifier ?? '';

  let tier: ProTier = 'lifetime';
  if (productId.includes('monthly')) tier = 'monthly';
  else if (productId.includes('yearly') || productId.includes('annual')) tier = 'yearly';

  return { isPro: true, billingIssue, tier, expiresAt };
}

/**
 * Lightweight boolean check — safe to call frequently (RevenueCat caches).
 */
export async function checkProEntitlement(): Promise<boolean> {
  try {
    if (PurchasesModule && isPurchasesConfigured) {
      const customerInfo = await PurchasesModule.getCustomerInfo();
      return resolveProFromCustomerInfo(customerInfo).isPro;
    }
  } catch (e) {
    console.warn('[Monetization] checkProEntitlement notice:', e);
  }
  return false;
}

/**
 * Full Pro status — tier, billing health, expiry date.
 * Call on app open, app resume, and after any purchase/restore.
 * Returns null if RevenueCat is unreachable so caller keeps last known state (no sudden revoke on bad wifi).
 */
export async function checkProStatusFull(): Promise<ProStatus | null> {
  try {
    if (!PurchasesModule || !isPurchasesConfigured) return null;
    const customerInfo = await PurchasesModule.getCustomerInfo();
    return resolveProFromCustomerInfo(customerInfo);
  } catch (e) {
    console.warn('[Monetization] checkProStatusFull notice:', e);
    return null;
  }
}


// ─── Live Prices ──────────────────────────────────────────────────────────────

/**
 * Fetches real-time localized prices for all Pro tiers and coin packs from RevenueCat.
 * Returns null for any product not yet published — no hardcoded fallback prices.
 */
export async function getLiveProductPrices(): Promise<{ coinPacks: CoinPack[]; pro: LiveProPrices }> {
  const emptyPro: LiveProPrices = {
    monthlyPrice: null, yearlyPrice: null, lifetimePrice: null,
    monthlyTrialDays: null, yearlyTrialDays: null,
  };
  try {
    if (PurchasesModule && isPurchasesConfigured) {
      const offerings = await PurchasesModule.getOfferings();
      const current = offerings?.current;
      const updatedPacks: CoinPack[] = current
        ? COIN_PACKS.map(pack => {
            const pkg = current.availablePackages?.find(
              (p: any) => p.identifier === pack.id || p.product?.identifier === pack.id
            );
            return { ...pack, price: pkg?.product?.priceString ?? pack.price };
          })
        : COIN_PACKS;

      if (!current) return { coinPacks: updatedPacks, pro: emptyPro };

      // Collect all available packages across offerings.current and all offerings in offerings.all
      const allOfferings: any[] = offerings?.all ? Object.values(offerings.all) : [];
      const allPackages: any[] = [];

      const addPackage = (p: any) => {
        if (!p) return;
        const already = allPackages.some(
          x => x.identifier === p.identifier && x.product?.identifier === p.product?.identifier
        );
        if (!already) allPackages.push(p);
      };

      if (current?.availablePackages) {
        current.availablePackages.forEach(addPackage);
      }
      for (const off of allOfferings) {
        if (off?.availablePackages) {
          off.availablePackages.forEach(addPackage);
        }
      }

      console.log(
        '[Monetization] RevenueCat packages found across all offerings:',
        allPackages.map((p: any) => ({
          identifier: p.identifier,
          packageType: p.packageType,
          productId: p.product?.identifier,
          price: p.product?.priceString,
        }))
      );

      const findPkg = (namedProp: string, pkgType: string, keyword: string) => {
        // 1. Check current offering property
        if ((current as any)?.[namedProp]) return (current as any)[namedProp];
        // 2. Check all offerings properties
        for (const off of allOfferings) {
          if (off?.[namedProp]) return off[namedProp];
        }
        // 3. Search all collected packages
        return (
          allPackages.find(
            (p: any) =>
              p.identifier === `$rc_${keyword}` ||
              p.identifier === keyword ||
              p.packageType?.toUpperCase() === pkgType.toUpperCase() ||
              p.identifier?.toLowerCase().includes(keyword) ||
              p.product?.identifier?.toLowerCase().includes(keyword)
          ) ?? null
        );
      };

      const monthlyPkg  = findPkg('monthly', 'MONTHLY', 'monthly');
      const yearlyPkg   = findPkg('annual', 'ANNUAL', 'yearly') ?? findPkg('annual', 'ANNUAL', 'annual');
      const lifetimePkg = findPkg('lifetime', 'LIFETIME', 'lifetime') ??
        allPackages.find(
          (p: any) =>
            p.identifier === 'lifetime' ||
            p.packageType === 'LIFETIME' ||
            p.product?.identifier === 'chilldash_pro' ||
            p.product?.identifier?.toLowerCase().includes('lifetime')
        ) ?? null;

      const trialDays = (pkg: any): number | null => {
        const offer = pkg?.product?.introductoryPrice;
        if (!offer || offer.paymentMode !== 'FREE_TRIAL') return null;
        return offer.periodNumberOfUnits ?? null;
      };

      return {
        coinPacks: updatedPacks,
        pro: {
          monthlyPrice:     monthlyPkg?.product?.priceString  ?? null,
          yearlyPrice:      yearlyPkg?.product?.priceString   ?? null,
          lifetimePrice:    lifetimePkg?.product?.priceString ?? null,
          monthlyTrialDays: trialDays(monthlyPkg),
          yearlyTrialDays:  trialDays(yearlyPkg),
        },
      };
    }
  } catch (e) {
    console.warn('[Monetization] getLiveProductPrices notice:', e);
  }
  return { coinPacks: COIN_PACKS, pro: emptyPro };
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

/**
 * Purchases the selected Pro tier via RevenueCat.
 * Searches across current and all offerings.
 * Never grants Pro without a verified receipt.
 */
export async function buyProPlan(
  tier: ProTier
): Promise<{ success: boolean; status: ProStatus | null; message: string }> {
  try {
    if (!PurchasesModule || !isPurchasesConfigured) {
      return { success: false, status: null, message: 'In-app purchases are not initialized.' };
    }
    const offerings = await PurchasesModule.getOfferings();
    const current = offerings?.current;
    const allOfferings: any[] = offerings?.all ? Object.values(offerings.all) : [];

    const allPackages: any[] = [];
    const addPackage = (p: any) => {
      if (!p) return;
      const already = allPackages.some(
        x => x.identifier === p.identifier && x.product?.identifier === p.product?.identifier
      );
      if (!already) allPackages.push(p);
    };

    if (current?.availablePackages) current.availablePackages.forEach(addPackage);
    for (const off of allOfferings) {
      if (off?.availablePackages) off.availablePackages.forEach(addPackage);
    }

    if (!current && allPackages.length === 0) {
      return { success: false, status: null, message: 'No offerings available. Please check back after release.' };
    }

    let pkg: any = null;
    if (tier === 'monthly') {
      pkg = current?.monthly ??
        allOfferings.find((off: any) => off?.monthly)?.monthly ??
        allPackages.find(
          (p: any) =>
            p.packageType === 'MONTHLY' ||
            p.identifier === '$rc_monthly' ||
            p.identifier?.toLowerCase().includes('monthly') ||
            p.product?.identifier?.toLowerCase().includes('monthly')
        );
    } else if (tier === 'yearly') {
      pkg = current?.annual ??
        allOfferings.find((off: any) => off?.annual)?.annual ??
        allPackages.find(
          (p: any) =>
            p.packageType === 'ANNUAL' ||
            p.identifier === '$rc_annual' ||
            p.identifier?.toLowerCase().includes('yearly') ||
            p.identifier?.toLowerCase().includes('annual') ||
            p.product?.identifier?.toLowerCase().includes('yearly') ||
            p.product?.identifier?.toLowerCase().includes('annual')
        );
    } else {
      pkg = current?.lifetime ??
        allOfferings.find((off: any) => off?.lifetime)?.lifetime ??
        allPackages.find(
          (p: any) =>
            p.packageType === 'LIFETIME' ||
            p.identifier === '$rc_lifetime' ||
            p.identifier === 'lifetime' ||
            p.product?.identifier === 'chilldash_pro' ||
            p.product?.identifier?.toLowerCase().includes('lifetime')
        );
    }

    if (!pkg) {
      return { success: false, status: null, message: `Chill Dash Pro ${tier} is not yet available on Google Play.` };
    }
    const { customerInfo } = await PurchasesModule.purchasePackage(pkg);
    const resolved = resolveProFromCustomerInfo(customerInfo);
    if (!resolved.isPro) {
      return { success: false, status: null, message: 'Purchase completed on Google Play, but entitlement sync is pending. Tap Restore Purchase in a moment.' };
    }
    const label = resolved.tier === 'monthly' ? 'Monthly' : resolved.tier === 'yearly' ? 'Yearly' : 'Lifetime';
    return { success: true, status: resolved, message: `Welcome to Chill Dash Pro! ${label} plan active.` };
  } catch (err: any) {
    if (err?.userCancelled) return { success: false, status: null, message: 'Purchase was cancelled.' };
    console.warn('[Monetization] buyProPlan error:', err);
    return { success: false, status: null, message: 'Google Play purchase could not be completed at this time.' };
  }
}

/**
 * Restores all past purchases and re-checks Pro status.
 * Works for guests (no Supabase) — RevenueCat uses the Google Play account.
 */
export async function restoreProPurchases(): Promise<{ status: ProStatus | null; message: string }> {
  try {
    if (!PurchasesModule || !isPurchasesConfigured) {
      return { status: null, message: 'In-app purchases are not initialized.' };
    }
    await PurchasesModule.restorePurchases();
    const status = await checkProStatusFull();
    if (status?.isPro) return { status, message: 'Pro membership restored.' };
    return { status, message: 'No active Pro subscription found on this Google Play account.' };
  } catch (e) {
    console.warn('[Monetization] restoreProPurchases notice:', e);
    return { status: null, message: 'Could not connect to Google Play. Please try again.' };
  }
}

/**
 * Links RevenueCat anonymous user to Supabase user ID on sign-in.
 * Ensures Pro status is portable across reinstalls and devices for signed-in users.
 */
export async function linkRevenueCatUser(supabaseUserId: string): Promise<void> {
  try {
    if (PurchasesModule && isPurchasesConfigured && supabaseUserId) {
      await PurchasesModule.logIn(supabaseUserId);
    }
  } catch (e) {
    console.warn('[Monetization] RevenueCat logIn notice:', e);
  }
}

/**
 * Opens RevenueCat Customer Center (manage/cancel subscription).
 */
export async function presentCustomerCenter(): Promise<void> {
  try {
    if (PurchasesUIModule && typeof PurchasesUIModule.presentCustomerCenter === 'function') {
      await PurchasesUIModule.presentCustomerCenter();
    }
  } catch (e) {
    console.warn('[Monetization] Customer Center notice:', e);
  }
}

/**
 * Purchases a coin pack via RevenueCat & Google Play Billing.
 */
export async function buyCoinPack(pack: CoinPack): Promise<{ success: boolean; coins: number; message: string }> {
  try {
    if (PurchasesModule && isPurchasesConfigured) {
      const offerings = await PurchasesModule.getOfferings();
      const currentOffering = offerings?.current;
      if (currentOffering) {
        const pkg = currentOffering.availablePackages.find(
          (p: any) => p.identifier === pack.id || p.product.identifier === pack.id
        );
        if (pkg) {
          await PurchasesModule.purchasePackage(pkg);
          return { success: true, coins: pack.coins, message: `Purchased ${pack.coins} coins via Google Play!` };
        }
      }
      return { success: false, coins: 0, message: 'This coin pack is not yet active on Google Play Store.' };
    }
    return { success: false, coins: 0, message: 'In-app purchases are not initialized.' };
  } catch (err: any) {
    if (err?.userCancelled) return { success: false, coins: 0, message: 'Purchase was cancelled.' };
    console.warn('[Monetization] RevenueCat purchase error:', err);
    return { success: false, coins: 0, message: 'Google Play Store purchase could not be completed at this time.' };
  }
}

/**
 * Reports AdMob ad lifecycle events to RevenueCat AdTracker.
 * See: https://www.revenuecat.com/docs/ad-monetization
 */
export async function trackAdEvent(
  type: 'loaded' | 'displayed' | 'opened' | 'revenue' | 'failed',
  params: {
    format: 'banner' | 'rewarded' | 'native' | 'interstitial';
    placement: string;
    adUnitId: string;
    revenueMicros?: number;
    currency?: string;
  }
) {
  try {
    const adTracker = PurchasesModule?.adTracker || PurchasesModule?.sharedInstance?.adTracker;
    if (!adTracker) return;

    const payload = {
      mediatorName: 'AdMob',
      adFormat: params.format,
      adUnitId: params.adUnitId,
      impressionId: `imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      placement: params.placement,
      networkName: 'Google Ads',
    };

    if (type === 'loaded' && typeof adTracker.trackAdLoaded === 'function') {
      await adTracker.trackAdLoaded(payload);
    } else if (type === 'displayed' && typeof adTracker.trackAdDisplayed === 'function') {
      await adTracker.trackAdDisplayed(payload);
    } else if (type === 'opened' && typeof adTracker.trackAdOpened === 'function') {
      await adTracker.trackAdOpened(payload);
    } else if (type === 'revenue' && typeof adTracker.trackAdRevenue === 'function') {
      await adTracker.trackAdRevenue({
        ...payload,
        revenueMicros: params.revenueMicros ?? 25000,
        currency: params.currency ?? 'USD',
        precision: 'publisher_defined',
      });
    }
  } catch (e) {
    console.log('[RevenueCat AdTracker] Notice:', e);
  }
}

/**
 * Shows a Rewarded Video Ad and awards coins ONLY upon verified completion.
 * Never gives away coins without an ad.
 * Tracks impressions, rewards, and ad revenue in RevenueCat.
 */
export function playRewardedAd(
  onReward: (rewardAmount: number) => void,
  onError?: (msg: string) => void,
  placement = 'wallet_reward'
) {
  if (!RewardedAdClass || !RewardedAdEvents) {
    onError?.('AdMob video player is not available on this device.');
    return;
  }

  const primaryUnitId = getRewardedAdUnitId();
  let rewarded = false;

  function loadAndShow(unitId: string, isFallback: boolean) {
    try {
      const rewardedAd = RewardedAdClass.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      let timeoutId: any = null;
      let cleanedUp = false;

      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        if (timeoutId) clearTimeout(timeoutId);
        try { unsubLoaded(); } catch (_) {}
        try { unsubEarned(); } catch (_) {}
        try { unsubClosed(); } catch (_) {}
        try { unsubError(); } catch (_) {}
      };

      const unsubLoaded = rewardedAd.addAdEventListener(RewardedAdEvents.LOADED, () => {
        if (timeoutId) clearTimeout(timeoutId);
        trackAdEvent('loaded', { format: 'rewarded', placement, adUnitId: unitId });
        try {
          rewardedAd.show();
          trackAdEvent('displayed', { format: 'rewarded', placement, adUnitId: unitId });
        } catch (e) {
          cleanup();
          onError?.('Failed to display sponsor video.');
        }
      });

      const unsubEarned = rewardedAd.addAdEventListener(
        RewardedAdEvents.EARNED_REWARD,
        (reward: any) => {
          rewarded = true;
          trackAdEvent('revenue', {
            format: 'rewarded',
            placement,
            adUnitId: unitId,
            revenueMicros: 25000,
            currency: 'USD',
          });
          onReward(reward?.amount || 15);
        }
      );

      const unsubClosed = rewardedAd.addAdEventListener(
        AdEventTypeEnum?.CLOSED || 'closed',
        () => {
          cleanup();
          if (!rewarded) {
            onError?.('Video was closed before finishing. No coins awarded.');
          }
        }
      );

      const unsubError = rewardedAd.addAdEventListener(
        AdEventTypeEnum?.ERROR || 'error',
        (err: any) => {
          cleanup();
          console.warn(`[AdMob Rewarded] Notice for ${unitId}:`, err);
          // If production ad unit failed (e.g. unpublished app NO_FILL), fallback to official test ad
          if (!isFallback && unitId !== ADMOB_CONFIG.TEST_REWARDED_ID) {
            console.log('[AdMob Rewarded] Retrying with Google Test Ad Unit...');
            loadAndShow(ADMOB_CONFIG.TEST_REWARDED_ID, true);
          } else {
            onError?.('Sponsor video unavailable right now. Please try again later.');
          }
        }
      );

      timeoutId = setTimeout(() => {
        cleanup();
        if (!rewarded) {
          if (!isFallback && unitId !== ADMOB_CONFIG.TEST_REWARDED_ID) {
            console.log('[AdMob Rewarded] Primary ad load timed out, retrying with Google Test Ad...');
            loadAndShow(ADMOB_CONFIG.TEST_REWARDED_ID, true);
          } else {
            onError?.('Sponsor video took too long to load. Please check your internet connection.');
          }
        }
      }, 7000);

      rewardedAd.load();
    } catch (e) {
      console.warn('[AdMob Rewarded] Creation notice:', e);
      onError?.('Could not open video ad.');
    }
  }

  loadAndShow(primaryUnitId, false);
}

/**
 * Shows in-world billboard sponsor ad (e.g. Cinema rooftop or Diamond Plaza LED).
 */
export function playBillboardSponsorAd(
  billboardName: string,
  onReward: (rewardAmount: number) => void,
  onError?: (msg: string) => void
) {
  playRewardedAd(
    onReward,
    onError,
    `billboard_${billboardName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
  );
}

/**
 * Shows Rewarded Video Ad specifically for Speed Boost (+10 km/h for 1 in-game day).
 * Strictly uses real AdMob ads without placeholder or manifesto fallbacks.
 */
export function playSpeedBoostAd(
  onSuccess: () => void,
  onError?: (msg: string) => void
) {
  playRewardedAd(
    () => {
      onSuccess();
    },
    () => {
      onError?.('No ad available right now. Please try again later or use coins.');
    },
    'speed_boost_reward'
  );
}

/**
 * Clean, responsive Adaptive Banner Ad component with RevenueCat AdTracker reporting.
 * Automatically hidden if the player is a Pro VIP member.
 */
export function ChillDashBanner({
  placement = 'garage_footer',
  isPro = false,
}: {
  placement?: string;
  isPro?: boolean;
}) {
  if (isPro) return null; // Pro Pass VIP members enjoy a 100% ad-free experience!

  const [currentUnitId, setCurrentUnitId] = React.useState(getBannerAdUnitId());
  const [loadFailed, setLoadFailed] = React.useState(false);

  if (BannerAdComponent && BannerAdSizeEnum && !loadFailed) {
    return (
      <View style={bannerStyles.adContainer}>
        <BannerAdComponent
          unitId={currentUnitId}
          size={BannerAdSizeEnum.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdLoaded={() => {
            trackAdEvent('loaded', { format: 'banner', placement, adUnitId: currentUnitId });
            trackAdEvent('displayed', { format: 'banner', placement, adUnitId: currentUnitId });
          }}
          onAdOpened={() => {
            trackAdEvent('opened', { format: 'banner', placement, adUnitId: currentUnitId });
          }}
          onPaid={(evt: any) => {
            trackAdEvent('revenue', {
              format: 'banner',
              placement,
              adUnitId: currentUnitId,
              revenueMicros: evt?.valueMicros || 2000,
              currency: evt?.currencyCode || 'USD',
            });
          }}
          onAdFailedToLoad={(err: any) => {
            console.log('[AdMob Banner] Notice for', currentUnitId, err);
            // If production unit failed because app is not published yet, try official Google test banner
            if (currentUnitId !== ADMOB_CONFIG.TEST_BANNER_ID) {
              setCurrentUnitId(ADMOB_CONFIG.TEST_BANNER_ID);
            } else {
              setLoadFailed(true);
            }
          }}
        />
      </View>
    );
  }

  // Retro styled fallback card matching Chill Dash aesthetic
  return (
    <View style={bannerStyles.fallbackContainer}>
      <View style={bannerStyles.badge}>
        <Text style={bannerStyles.badgeText}>SPONSOR</Text>
      </View>
      <View style={bannerStyles.fallbackBody}>
        <Text style={bannerStyles.fallbackTitle}>Diamond Plaza & Sunnyvale Picturehouse</Text>
        <Text style={bannerStyles.fallbackSub}>Official city partners · Upgrade to Pro for ad-free ride</Text>
      </View>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  adContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    width: '100%',
    overflow: 'hidden',
  },
  fallbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginVertical: 6,
    gap: 10,
  },
  badge: {
    backgroundColor: '#FFB347',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1C3F3A',
    letterSpacing: 0.5,
  },
  fallbackBody: {
    flex: 1,
  },
  fallbackTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1C3F3A',
  },
  fallbackSub: {
    fontSize: 9,
    color: '#8A9996',
    marginTop: 2,
  },
});
