import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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

export const ADMOB_CONFIG = {
  APP_ID: 'ca-app-pub-1245254576744368~6447332692',
  BANNER_AD_UNIT_ID: 'ca-app-pub-1245254576744368/4449523618',
  REWARDED_AD_UNIT_ID: 'ca-app-pub-1245254576744368/3092692413',
  NATIVE_AD_UNIT_ID: 'ca-app-pub-1245254576744368/5397974901',
};

export function getBannerAdUnitId(): string {
  return ADMOB_CONFIG.BANNER_AD_UNIT_ID;
}

export function getRewardedAdUnitId(): string {
  return ADMOB_CONFIG.REWARDED_AD_UNIT_ID;
}

export const DEFAULT_REVENUECAT_API_KEY = 'goog_beeAEmOrcXKJcJbEuWyRslxtWKR';
export const PRO_ENTITLEMENT_ID = 'chilldash_pro';

export async function initMonetization(revenueCatApiKey?: string) {
  console.log('[Monetization Web] Initialized (web mock).');
}

export type ProTier = 'monthly' | 'yearly' | 'lifetime';

export interface ProStatus {
  isPro: boolean;
  tier: ProTier | null;
  expirationDate: string | null;
  willRenew: boolean;
  isActive: boolean;
}

export interface LiveProPrices {
  monthly: string;
  yearly: string;
  lifetime: string;
}

export function resolveProFromCustomerInfo(customerInfo: any): ProStatus {
  return {
    isPro: false,
    tier: null,
    expirationDate: null,
    willRenew: false,
    isActive: false,
  };
}

export async function checkProEntitlement(): Promise<boolean> {
  return false;
}

export async function checkProStatusFull(): Promise<ProStatus | null> {
  return null;
}

export async function getLiveProductPrices(): Promise<{ coinPacks: CoinPack[]; pro: LiveProPrices }> {
  return {
    coinPacks: COIN_PACKS,
    pro: {
      monthly: '$2.99 / mo',
      yearly: '$19.99 / yr',
      lifetime: '$39.99 once',
    },
  };
}

export async function buyProPlan(
  tier: ProTier
): Promise<{ success: boolean; status: ProStatus | null; message: string }> {
  return {
    success: false,
    status: null,
    message: 'Purchases are enabled in the mobile Android/iOS build.',
  };
}

export async function restoreProPurchases(): Promise<{ status: ProStatus | null; message: string }> {
  return {
    status: null,
    message: 'In-app purchase restores are available on mobile.',
  };
}

export async function linkRevenueCatUser(supabaseUserId: string): Promise<void> {}

export async function presentCustomerCenter(): Promise<void> {}

export async function buyCoinPack(pack: CoinPack): Promise<{ success: boolean; coins: number; message: string }> {
  return {
    success: false,
    coins: 0,
    message: 'Coin purchases are available on the Android release.',
  };
}

export async function trackAdEvent(
  action: 'loaded' | 'displayed' | 'opened' | 'closed' | 'revenue',
  details?: Record<string, any>
) {}

export function playRewardedAd(options: {
  onRewarded: (reward: { amount: number; type: string }) => void;
  onClosed?: () => void;
  onError?: (error: any) => void;
  onAdLoaded?: () => void;
  rewardType?: string;
  adUnitId?: string;
  placement?: string;
}): void {
  // On web, immediately reward the player
  setTimeout(() => {
    options.onRewarded({ amount: 15, type: options.rewardType || 'coins' });
    options.onClosed?.();
  }, 500);
}

export function playBillboardSponsorAd(
  billboardName: string,
  onReward: (reward: { amount: number; type: string }) => void,
  onClose?: () => void,
  onError?: (err: any) => void
): void {
  playRewardedAd({
    placement: `billboard_${billboardName}`,
    rewardType: 'coins',
    onRewarded: onReward,
    onClosed: onClose,
    onError: onError,
  });
}

export function playSpeedBoostAd(
  onBoostGranted: () => void,
  onClose?: () => void,
  onError?: (err: any) => void
): void {
  playRewardedAd({
    placement: 'speed_boost_reward',
    rewardType: 'speed_boost',
    onRewarded: () => onBoostGranted(),
    onClosed: onClose,
    onError: onError,
  });
}

export function ChillDashBanner({
  placement = 'garage_footer',
  isPro = false,
}: {
  placement?: string;
  isPro?: boolean;
}) {
  if (isPro) return null;

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
  fallbackContainer: {
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  fallbackBody: {
    flex: 1,
  },
  fallbackTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fallbackSub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
});
