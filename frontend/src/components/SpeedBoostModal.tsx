import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useGame } from '@/src/game/GameContext';
import { makeStyles, useTheme } from '@/src/theme';
import { Button, Coin, Icon, IconButton, Label } from './ui';
import { BIKES } from '@/src/game/world';
import { BikeArt } from './BikeArt';
import { playSpeedBoostAd } from '@/src/game/monetization';

interface SpeedBoostModalProps {
  onClose?: () => void;
}

export function SpeedBoostModal({ onClose }: SpeedBoostModalProps) {
  const g = useGame();
  const s = useStyles();
  const { colors: c } = useTheme();

  const [adLoading, setAdLoading] = useState(false);
  const [adError, setAdError] = useState('');
  const [activatingMethod, setActivatingMethod] = useState<'pro' | 'coins' | 'ad' | null>(null);

  const p = g.profile;
  if (!p) return null;

  const currentBike = BIKES.find(b => b.id === p.bike) || BIKES[1];
  const baseKmh = Math.round(currentBike.speed * 0.24);
  const boostedKmh = baseKmh + 10;

  // Active check
  const isBoostActive = !!(p.speed_boost_until && p.minutes < p.speed_boost_until);
  const remainingMins = isBoostActive ? Math.max(0, p.speed_boost_until! - p.minutes) : 0;
  
  // Format to at most 2 decimal places
  const inGameHours = Math.floor(remainingMins / 60);
  const inGameRemainderMins = (remainingMins % 60).toFixed(2);
  const realMinsLeft = (remainingMins / 120).toFixed(2);

  const isPro = !!p.is_pro;
  const proFreeBoosts = p.pro_free_boosts ?? (isPro ? 2 : 0);
  const resetMins = Math.max(0, (p.pro_boost_reset_at ?? 0) - p.minutes);
  const resetDays = Math.max(1, Math.ceil(resetMins / 1440));

  const hasEnoughCoins = p.balance >= 10;

  const handleActivatePro = async () => {
    if (isBoostActive) return;
    try {
      setActivatingMethod('pro');
      setAdError('');
      await g.activateSpeedBoost('pro');
    } catch (err: any) {
      // handled in context
    } finally {
      setActivatingMethod(null);
    }
  };

  const handleActivateCoins = async () => {
    if (isBoostActive) return;
    try {
      setActivatingMethod('coins');
      setAdError('');
      await g.activateSpeedBoost('coins');
    } catch (err: any) {
      // handled in context
    } finally {
      setActivatingMethod(null);
    }
  };

  const handleWatchAd = () => {
    if (isBoostActive) return;
    setAdLoading(true);
    setAdError('');
    playSpeedBoostAd(
      async () => {
        try {
          setActivatingMethod('ad');
          await g.activateSpeedBoost('ad');
        } catch (err: any) {
          setAdError(err?.message || 'Failed to activate speed boost.');
        } finally {
          setAdLoading(false);
          setActivatingMethod(null);
        }
      },
      (errMsg: string) => {
        setAdLoading(false);
        setAdError(errMsg || 'No ad available right now. Please try again later or use coins.');
      }
    );
  };

  return (
    <View testID="speed-boost-panel" style={s.container}>
      {/* Top Header Row with Icon, Title, and Close Button */}
      <View style={s.topRow}>
        <View style={s.mainIconBadge}>
          <Icon name="flash" size={32} color="#000000" />
        </View>
        <View style={s.titleWrap}>
          <Label display style={s.title}>Speed Boost</Label>
          <Label style={s.subtitle}>
            Inject nitro power to gain +10 km/h across all city roads and highways.
          </Label>
        </View>
        {onClose && (
          <Pressable
            testID="speed-boost-modal-close-button"
            accessibilityRole="button"
            accessibilityLabel="Close speed boost modal"
            onPress={onClose}
            style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.7 }]}
          >
            <Icon name="close" size={20} color="#374151" />
          </Pressable>
        )}
      </View>

      {/* Card 1: Current Bike & Velocity Comparison */}
      <View style={s.bikeCard} testID="speed-boost-telemetry">
        <Label style={s.bikeMetaTag}>CURRENT BIKE</Label>
        <Label display style={s.bikeName}>{currentBike.name.toUpperCase()}</Label>

        <View style={s.speedAndArtRow}>
          <View style={s.speedBoxesContainer}>
            <View style={s.speedBoxBase}>
              <Label style={s.speedBoxLabel}>BASE SPEED</Label>
              <View style={s.speedValueRow}>
                <Label display style={s.speedValueText}>{baseKmh}</Label>
                <Label style={s.speedUnitText}>km/h</Label>
              </View>
            </View>

            <Icon name="arrow-forward" size={18} color="#9CA3AF" />

            <View style={s.speedBoxBoosted}>
              <Label style={s.speedBoxLabelBoosted}>BOOSTED SPEED</Label>
              <View style={s.speedValueRow}>
                <Label display style={s.speedValueTextBoosted}>{boostedKmh}</Label>
                <Label style={s.speedUnitTextBoosted}>km/h</Label>
              </View>
            </View>
          </View>

          {/* Current Bike Art */}
          <View style={s.bikeArtWrapper}>
            <BikeArt type={p.bike} width={108} height={66} />
          </View>
        </View>

        <View style={s.cardDivider} />

        {/* Protection / Duration Telemetry strip */}
        <View style={s.telemetryStrip}>
          <View style={s.telemetryItem}>
            <View style={s.telemetryIconBadge}>
              <Icon name="time-outline" size={16} color="#15803D" />
            </View>
            <View style={{ flex: 1 }}>
              <Label style={s.telemetryTitle}>Duration: 1 in-game day</Label>
              <Label style={s.telemetrySub}>(12 active minutes)</Label>
            </View>
          </View>

          <View style={s.verticalSeparator} />

          <View style={s.telemetryItem}>
            <View style={s.telemetryIconBadge}>
              <Icon name="shield-checkmark-outline" size={16} color="#15803D" />
            </View>
            <View style={{ flex: 1 }}>
              <Label style={s.telemetryTitle}>Paused time and</Label>
              <Label style={s.telemetrySub}>garage rest are protected</Label>
            </View>
          </View>
        </View>
      </View>

      {/* Card 2: Speed Boost Active Banner (Only if active) */}
      {isBoostActive && (
        <View style={s.activeBanner} testID="boost-status-active">
          <View style={s.activeIconBadge}>
            <Icon name="flash" size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Label style={s.activeTitle}>Speed Boost Active (+10 km/h)</Label>
            <Label style={s.activeTimeText}>
              {inGameHours > 0 ? `${inGameHours}h ` : ''}{inGameRemainderMins}m left (in-game time)
            </Label>
            <Label style={s.activeRealText}>
              (~{realMinsLeft} real riding minutes)
            </Label>
          </View>
        </View>
      )}

      {/* Card 3: Pro VIP Allocation */}
      <View style={s.actionCard} testID="boost-option-pro">
        <View style={s.cardHeaderRow}>
          <View style={s.crownIconWrap}>
            <Icon name="trophy-outline" size={22} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Label style={s.cardTitle}>Pro VIP Allocation</Label>
            <Label style={s.cardDesc}>
              {isPro
                ? `2 free speed boosts every 7 in-game days. Available: ${proFreeBoosts} / 2.`
                : 'Pro VIP members receive 2 free speed boosts every 7 in-game days.'}
            </Label>
          </View>
          <Icon name="chevron-forward" size={18} color="#9CA3AF" />
        </View>

        <View style={s.btnWrap}>
          {isBoostActive ? (
            <Pressable disabled style={[s.lockedBtn, s.proBtn]}>
              <Icon name="lock-closed-outline" size={16} color="#9CA3AF" />
              <Label style={s.lockedBtnText}>Boost Active · Injections Locked</Label>
            </Pressable>
          ) : isPro ? (
            proFreeBoosts > 0 ? (
              <Pressable
                testID="activate-pro-boost-button"
                accessibilityRole="button"
                onPress={handleActivatePro}
                style={({ pressed }) => [s.primaryYellowBtn, pressed && { opacity: 0.85 }]}
              >
                {activatingMethod === 'pro' ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <View style={s.btnContentRow}>
                    <Icon name="flash" size={18} color="#000000" />
                    <Label style={s.primaryYellowBtnText}>Activate Free Pro Boost ({proFreeBoosts} Left)</Label>
                  </View>
                )}
              </Pressable>
            ) : (
              <View style={s.quotaBox}>
                <Icon name="timer-outline" size={16} color="#6B7280" />
                <Label style={s.quotaText}>
                  Quota used. Next 2 free boosts in {resetDays} {resetDays === 1 ? 'day' : 'days'}.
                </Label>
              </View>
            )
          ) : (
            <Pressable
              testID="get-pro-pass-button"
              accessibilityRole="button"
              onPress={() => {
                onClose?.();
                g.openPhone('profile');
              }}
              style={({ pressed }) => [s.proPassBtn, pressed && { opacity: 0.85 }]}
            >
              <Label style={s.proPassBtnText}>Get Pro Pass</Label>
            </Pressable>
          )}
        </View>
      </View>

      {/* Card 4: Standard Refuel (10 Coins) */}
      <View style={s.actionCard} testID="boost-option-coins">
        <View style={s.cardHeaderRow}>
          <View style={s.coinsIconWrap}>
            <Icon name="cash-outline" size={22} color="#15803D" />
          </View>
          <View style={{ flex: 1 }}>
            <Label style={s.cardTitle}>Standard Refuel</Label>
            <Label style={s.cardDesc}>
              Spend 10 coins from your delivery earnings.{'\n'}Current balance: {p.balance} coins.
            </Label>
          </View>
          <View style={s.coinPillBadge}>
            <Coin amount={10} small />
          </View>
        </View>

        <View style={s.btnWrap}>
          {isBoostActive ? (
            <Pressable disabled style={s.lockedBtn}>
              <Icon name="lock-closed-outline" size={16} color="#9CA3AF" />
              <Label style={s.lockedBtnText}>Boost Active · Injections Locked</Label>
            </Pressable>
          ) : (
            <Pressable
              testID="activate-coins-boost-button"
              accessibilityRole="button"
              disabled={!hasEnoughCoins || activatingMethod === 'coins'}
              onPress={handleActivateCoins}
              style={({ pressed }) => [
                s.primaryYellowBtn,
                !hasEnoughCoins && s.btnDisabled,
                pressed && { opacity: 0.85 }
              ]}
            >
              {activatingMethod === 'coins' ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Label style={s.primaryYellowBtnText}>
                  {hasEnoughCoins ? 'Activate with 10 Coins' : `Need 10 Coins (Have ${p.balance})`}
                </Label>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Card 5: Sponsored Refuel (AdMob Video Ad) */}
      <View style={s.actionCard} testID="boost-option-ad">
        <View style={s.cardHeaderRow}>
          <View style={s.videoIconWrap}>
            <Icon name="videocam-outline" size={22} color="#4338CA" />
          </View>
          <View style={{ flex: 1 }}>
            <Label style={s.cardTitle}>Sponsored Refuel</Label>
            <Label style={s.cardDesc}>
              Watch a short Google sponsor video to refuel your nitro speed boost.
            </Label>
          </View>
        </View>

        {adError ? (
          <View style={s.adErrorBox} testID="ad-error-message">
            <Icon name="alert-circle-outline" size={18} color="#DC2626" />
            <Label style={s.adErrorText}>{adError}</Label>
          </View>
        ) : null}

        <View style={s.btnWrap}>
          {isBoostActive ? (
            <Pressable disabled style={s.lockedBtn}>
              <Icon name="lock-closed-outline" size={16} color="#9CA3AF" />
              <Label style={s.lockedBtnText}>Boost Active · Injections Locked</Label>
            </Pressable>
          ) : (
            <Pressable
              testID="watch-ad-boost-button"
              accessibilityRole="button"
              disabled={adLoading || activatingMethod === 'ad'}
              onPress={handleWatchAd}
              style={({ pressed }) => [s.sponsorBtn, pressed && { opacity: 0.85 }]}
            >
              {adLoading || activatingMethod === 'ad' ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <View style={s.btnContentRow}>
                  <Icon name="videocam-outline" size={17} color="#111827" />
                  <Label style={s.sponsorBtnText}>Watch Sponsor Video</Label>
                </View>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles(c => ({
  container: {
    paddingBottom: 28,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  mainIconBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FFCC00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: '#111827',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#6B7280',
    lineHeight: 17,
    marginTop: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bike Card
  bikeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bikeMetaTag: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#9CA3AF',
  },
  bikeName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginTop: 2,
    marginBottom: 12,
  },
  speedAndArtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedBoxesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  speedBoxBase: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  speedBoxBoosted: {
    backgroundColor: '#FEF08A',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  speedBoxLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#6B7280',
    marginBottom: 2,
  },
  speedBoxLabelBoosted: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#854D0E',
    marginBottom: 2,
  },
  speedValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  speedValueText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
  },
  speedUnitText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 3,
  },
  speedValueTextBoosted: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
  },
  speedUnitTextBoosted: {
    fontSize: 11,
    fontWeight: '700',
    color: '#854D0E',
    marginLeft: 3,
  },
  bikeArtWrapper: {
    width: 112,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },
  telemetryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  telemetryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  telemetryIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#166534',
  },
  telemetrySub: {
    fontSize: 9.5,
    color: '#6B7280',
    marginTop: 1,
  },
  verticalSeparator: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },

  // Active Banner
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF08A',
    borderWidth: 1.5,
    borderColor: '#FDE047',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  activeIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
  },
  activeTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  activeRealText: {
    fontSize: 10.5,
    color: '#4B5563',
    marginTop: 1,
  },

  // Action Cards
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  crownIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
  },
  cardDesc: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15.5,
    marginTop: 3,
  },
  coinPillBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnWrap: {
    marginTop: 2,
  },

  // Buttons
  primaryYellowBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FDD602',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#EAB308',
  },
  primaryYellowBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#111827',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proPassBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FEF9C3',
    borderWidth: 1.5,
    borderColor: '#FDE047',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proPassBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#854D0E',
  },
  sponsorBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsorBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // Locked State when Speed Boost is Active
  lockedBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  proBtn: {},
  lockedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.3,
  },

  quotaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quotaText: {
    fontSize: 11,
    color: '#6B7280',
  },
  adErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 10,
  },
  adErrorText: {
    flex: 1,
    fontSize: 11,
    color: '#DC2626',
    lineHeight: 16,
    fontWeight: '600',
  },
}));
