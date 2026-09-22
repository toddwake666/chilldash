import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { useGame } from '@/src/game/GameContext';
import { makeStyles, useTheme } from '@/src/theme';
import { Button, Icon, Label } from './ui';
import {
  getLiveProductPrices,
  buyProPlan,
  presentCustomerCenter,
  ProTier,
  LiveProPrices,
} from '@/src/game/monetization';

const BENEFITS: { icon: string; text: string }[] = [
  { icon: 'shield-checkmark', text: '100% Ad-Free Experience' },
  { icon: 'trending-up',      text: '+25% Bonus Coins & XP on every delivery' },
  { icon: 'medkit',           text: 'Free Emergency Recovery (0 coins on breakdown)' },
  { icon: 'flash',            text: '2 Free Speed Boosts every 7 in-game days' },
  { icon: 'ribbon',           text: 'Pro VIP Badge on profile & cloud save' },
];

export function ProPaywallCard() {
  const g = useGame();
  const s = useStyles();
  const { colors: c } = useTheme();

  const { isPro, billingIssue, tier, expiresAt } = g.proStatus;

  const [selectedTier, setSelectedTier] = useState<ProTier>('yearly');
  const [prices, setPrices] = useState<LiveProPrices | null>(null);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    getPrices();
  }, []);

  async function getPrices() {
    setPricesLoading(true);
    try {
      const { pro } = await getLiveProductPrices();
      setPrices(pro);
      if (pro.yearlyPrice) {
        setSelectedTier('yearly');
      } else if (pro.monthlyPrice) {
        setSelectedTier('monthly');
      } else if (pro.lifetimePrice) {
        setSelectedTier('lifetime');
      }
    } catch {
      setPrices(null);
    } finally {
      setPricesLoading(false);
    }
  }

  async function handlePurchase() {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const res = await buyProPlan(selectedTier);
      if (res.success && res.status) {
        g.refreshProStatus('post_purchase').catch(() => {});
      }
      g.notify(res.message);
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    if (restoring) return;
    setRestoring(true);
    try {
      await g.restorePurchases();
    } finally {
      setRestoring(false);
    }
  }

  function priceFor(t: ProTier): string | null {
    if (!prices) return null;
    if (t === 'monthly') return prices.monthlyPrice;
    if (t === 'yearly') return prices.yearlyPrice;
    return prices.lifetimePrice;
  }

  function tierAvailable(t: ProTier): boolean {
    return !!priceFor(t);
  }

  function ctaLabel(): string {
    if (purchasing) return 'Opening Google Play...';
    const price = priceFor(selectedTier);
    if (!price) return 'Not Available Yet';
    if (selectedTier === 'monthly') return `Subscribe Monthly · ${price}/mo`;
    if (selectedTier === 'yearly') return `Subscribe Yearly · ${price}/yr`;
    return `Unlock Lifetime · ${price}`;
  }

  function tierLabel(): string {
    if (!tier) return '';
    if (tier === 'monthly') return 'Monthly subscription';
    if (tier === 'yearly') return 'Yearly subscription';
    return 'Lifetime — never expires';
  }

  // ─── Grace Period / Billing Issue ──────────────────────────────────────────
  if (billingIssue) {
    return (
      <View style={s.card}>
        <View style={s.headerRow}>
          <View style={s.titleWrap}>
            <Label style={s.cardTitle}>CHILL DASH PRO</Label>
            <Label style={s.cardSubtitle}>Benefits active during grace period.</Label>
          </View>
          <View style={[s.badge, s.badgeWarning]}>
            <Label style={s.badgeText}>PAYMENT ISSUE</Label>
          </View>
        </View>
        <Label style={s.graceCopy}>
          Your payment could not be processed. Benefits remain active while you fix it. Please update your billing method in Google Play.
        </Label>
        <Pressable
          style={({ pressed }) => [s.ctaBtn, s.ctaBtnWarning, pressed && { opacity: 0.8 }]}
          onPress={() => Linking.openURL('market://details?id=com.toddwake.chilldash').catch(() => {})}
        >
          <Label style={s.ctaBtnText}>Fix Payment in Google Play</Label>
        </Pressable>
      </View>
    );
  }

  // ─── Active Pro ─────────────────────────────────────────────────────────────
  if (isPro) {
    return (
      <View style={s.card}>
        <View style={s.headerRow}>
          <View style={s.titleWrap}>
            <Label style={s.cardTitle}>CHILL DASH PRO</Label>
            <Label style={s.cardSubtitle}>{tierLabel()}</Label>
          </View>
          <View style={[s.badge, s.badgeActive]}>
            <Icon name="star" size={10} color="#1C3F3A" />
            <Label style={[s.badgeText, { color: '#1C3F3A' }]}>ACTIVE</Label>
          </View>
        </View>

        <View style={s.benefitsList}>
          {BENEFITS.map((b) => (
            <View key={b.icon} style={s.benefitRow}>
              <Icon name={b.icon as any} size={14} color={c.teal} />
              <Label style={s.benefitText}>{b.text}</Label>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [s.manageBtn, pressed && { opacity: 0.8 }]}
          onPress={() => presentCustomerCenter()}
        >
          <Icon name="settings-outline" size={14} color={c.teal} />
          <Label style={s.manageBtnText}>Manage Subscription</Label>
        </Pressable>
      </View>
    );
  }

  // ─── Subscribe / Upgrade ─────────────────────────────────────────────────────
  const TIERS: { id: ProTier; label: string; badge?: string }[] = [
    { id: 'monthly',  label: 'MONTHLY' },
    { id: 'yearly',   label: 'YEARLY',   badge: 'BEST VALUE' },
    { id: 'lifetime', label: 'LIFETIME', badge: 'ONE-TIME' },
  ];

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <View style={s.crownBadge}>
            <Icon name="sparkles" size={16} color="#F59E0B" />
          </View>
          <View style={s.titleWrap}>
            <Label style={s.cardTitle}>CHILL DASH PRO</Label>
            <Label style={s.cardSubtitle}>Ride faster · Earn +25% · Zero ads</Label>
          </View>
        </View>
        <View style={s.badgeUpgrade}>
          <Label style={s.badgeUpgradeText}>VIP PASS</Label>
        </View>
      </View>

      {/* Tier Selector */}
      <View style={s.tierRow}>
        {TIERS.map((t) => {
          const price = priceFor(t.id);
          const available = !!price;
          const selected = selectedTier === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => available && setSelectedTier(t.id)}
              style={({ pressed }) => [
                s.tierPill,
                selected && s.tierPillSelected,
                !available && s.tierPillDisabled,
                pressed && available && { opacity: 0.85 },
              ]}
            >
              {t.badge ? (
                <View style={[s.tierBadge, selected && s.tierBadgeSelected]}>
                  <Label style={[s.tierBadgeText, selected && s.tierBadgeTextSelected]}>
                    {t.badge}
                  </Label>
                </View>
              ) : (
                <View style={s.tierBadgePlaceholder} />
              )}
              <Label style={[s.tierLabel, selected && s.tierLabelSelected]}>{t.label}</Label>
              {pricesLoading ? (
                <ActivityIndicator size="small" color={selected ? '#2DD4BF' : '#94A3B8'} style={{ marginTop: 4 }} />
              ) : (
                <Label style={[s.tierPrice, selected && s.tierPriceSelected]}>
                  {price ?? 'Coming soon'}
                </Label>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Benefits */}
      <View style={s.benefitsList}>
        {BENEFITS.map((b) => (
          <View key={b.icon} style={s.benefitRow}>
            <View style={s.benefitIconWrap}>
              <Icon name={b.icon as any} size={13} color="#34D399" />
            </View>
            <Label style={s.benefitText}>{b.text}</Label>
          </View>
        ))}
      </View>

      {/* CTA */}
      <Pressable
        onPress={handlePurchase}
        disabled={purchasing || !tierAvailable(selectedTier)}
        style={({ pressed }) => [
          s.ctaBtn,
          (!tierAvailable(selectedTier) || purchasing) && s.ctaBtnDisabled,
          pressed && tierAvailable(selectedTier) && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        ]}
      >
        {purchasing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Label style={s.ctaBtnText}>{ctaLabel()}</Label>
        )}
      </Pressable>

      {/* Restore */}
      <Pressable onPress={handleRestore} disabled={restoring} style={s.restoreBtn}>
        {restoring ? (
          <ActivityIndicator size="small" color="#94A3B8" />
        ) : (
          <Label style={s.restoreBtnText}>Restore Purchase</Label>
        )}
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: '#0F172A', // Deep Midnight Obsidian
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1E293B',
    padding: 18,
    marginVertical: 12,
    gap: 15,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  crownBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1 },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  badgeUpgrade: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeUpgradeText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#000000',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeActive: { backgroundColor: '#10B981' },
  badgeWarning: { backgroundColor: '#F59E0B' },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#000000',
  },
  graceCopy: {
    fontSize: 12.5,
    color: '#F8FAFC',
    lineHeight: 19,
    fontWeight: '500',
  },

  // Tier selector
  tierRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tierPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
    gap: 4,
    minHeight: 84,
    justifyContent: 'center',
  },
  tierPillSelected: {
    borderColor: '#2DD4BF',
    backgroundColor: '#0F3E38',
    borderWidth: 2,
  },
  tierPillDisabled: {
    opacity: 0.4,
  },
  tierBadge: {
    backgroundColor: '#334155',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  tierBadgeSelected: {
    backgroundColor: '#FDE047',
  },
  tierBadgePlaceholder: { height: 16 },
  tierBadgeText: {
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#CBD5E1',
  },
  tierBadgeTextSelected: {
    color: '#000000',
    fontWeight: '900',
  },
  tierLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#94A3B8',
  },
  tierLabelSelected: {
    color: '#2DD4BF',
    fontWeight: '900',
  },
  tierPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  tierPriceSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13.5,
  },

  // Benefits
  benefitsList: {
    gap: 8,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
    flex: 1,
    lineHeight: 16,
  },

  // CTA
  ctaBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: '#10B981',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnWarning: { backgroundColor: '#D97706', borderColor: '#F59E0B' },
  ctaBtnDisabled: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaBtnText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Restore
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  restoreBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#94A3B8',
    textDecorationLine: 'underline',
  },

  // Manage (Active state)
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#2DD4BF',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 12,
  },
  manageBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#2DD4BF',
  },
}));

