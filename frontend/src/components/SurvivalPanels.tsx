import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { makeStyles, useTheme } from '@/src/theme';
import { useGame } from '@/src/game/GameContext';
import { Button, Coin, Icon, Label } from './ui';
import { BikeArt } from './BikeArt';
import { BIKES } from '@/src/game/world';
import { getFullRefuelCost, MAX_TANK_LEVELS, TANK_UPGRADE_COSTS } from '@/src/game/localEngine';
import { playDeliverSound } from '@/src/game/sounds';

export function StatusPanel() {
  const g = useGame(), s = useStyles(), { colors: c } = useTheme();
  return <View testID="online-status-instructions"><View style={s.art}><Icon name="phone-portrait-outline" size={53} color={c.teal} /></View><Label display style={s.title}>Your phone runs the show.</Label><Label style={s.body}>You’re currently {g.profile!.online ? 'online' : 'offline'}. To change this, open your phone and tap the online/offline switch at the bottom. This indicator only shows your status.</Label><Button testID="status-open-phone-button" title="OPEN MY PHONE" icon="phone-portrait-outline" onPress={() => g.openPhone()} /></View>;
}
export function ServicePanel() {
  const g = useGame(), s = useStyles(), { colors: c } = useTheme(), stop = g.serviceStop!, p = g.profile!, stats = p.bikes[p.bike];
  const isBicycle = p.bike === 'bicycle';
  const fullTankCost = getFullRefuelCost(p.bike, stats?.tank_level);
  const missingFuel = Math.max(0, 100 - (stats?.fuel ?? 100));
  const fullFillCost = Math.max(1, Math.ceil((missingFuel / 100) * fullTankCost));

  // Determine selectable coin amounts for partial or full refueling (minimum 6 coins)
  const coinOptions: number[] = [];
  if (fullFillCost <= 6) {
    coinOptions.push(fullFillCost);
  } else {
    coinOptions.push(6);
    if (fullFillCost > 12) coinOptions.push(12);
    if (!coinOptions.includes(fullFillCost)) coinOptions.push(fullFillCost);
  }

  const [selectedCoins, setSelectedCoins] = useState<number>(fullFillCost);

  return (
    <View testID="service-stop-detail">
      {stop.kind === 'bike_shop' ? (
        <View testID="akash-wheels-showroom">
          {/* Header Banner */}
          <View style={s.shopBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={s.shopBannerIcon}>
                  <Icon name="bicycle" size={26} color={c.teal} />
                </View>
                <View>
                  <Label display style={s.shopBannerTitle}>AKASH WHEELS</Label>
                  <Label style={s.shopBannerSub}>Whispering Pines · Bike Showroom</Label>
                </View>
              </View>
              <View style={s.shopBalanceBadge}>
                <Coin amount={p.balance} small />
              </View>
            </View>
            <Label style={s.shopBannerDesc}>
              Test rides, new superbike purchases, and instant tank upgrades on the spot. All synced to your garage.
            </Label>
          </View>

          {/* Bike Fleet Cards */}
          <View style={{ marginTop: 16, gap: 16 }}>
            {BIKES.map(b => {
              const isCurrent = p.bike === b.id;
              const isOwned = isCurrent || p.owned_bikes.includes(b.id);
              const bikeStats = p.bikes[b.id];
              const maxLvl = MAX_TANK_LEVELS[b.id] || 1;
              const curLvl = bikeStats?.tank_level || 1;
              const canUpgradeTank = isOwned && b.id !== 'bicycle' && curLvl < maxLvl;
              const nxtLvl = curLvl + 1;
              const upgradeCost = TANK_UPGRADE_COSTS[nxtLvl] || 50;
              const canAffordBuy = p.balance >= b.cost;
              const canAffordUpgrade = p.balance >= upgradeCost;

              return (
                <View
                  key={b.id}
                  testID={`shop-bike-${b.id}`}
                  style={[s.bikeCard, isCurrent && s.bikeCardCurrent]}
                >
                  {/* Top Bar: Name, Stat, and Status Badge */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View>
                      <Label display style={s.bikeName}>{b.name}</Label>
                      <Label style={s.bikeSubtitle}>{b.stat} · {Math.round(b.speed * 0.24)} km/h</Label>
                    </View>
                    <View style={[
                      s.statusPill,
                      isCurrent ? s.statusPillCurrent : isOwned ? s.statusPillOwned : s.statusPillBuy
                    ]}>
                      <Label style={[
                        s.statusPillText,
                        isCurrent ? { color: '#059669' } : isOwned ? { color: '#0284C7' } : { color: '#B45309' }
                      ]}>
                        {isCurrent ? '✓ CURRENT RIDE' : isOwned ? 'IN GARAGE' : `${b.cost} COINS`}
                      </Label>
                    </View>
                  </View>

                  {/* Bike Hero Artwork */}
                  <View style={s.bikeArtContainer}>
                    <BikeArt type={b.id} width={130} height={75} />
                  </View>

                  {/* Spec Row */}
                  <View style={s.specRow}>
                    <View style={s.specChip}>
                      <Icon name="speedometer-outline" size={13} color="#0D9488" />
                      <Label style={s.specChipText}>{Math.round(b.speed * 0.24)} km/h</Label>
                    </View>
                    <View style={s.specChip}>
                      <Icon name={b.id === 'bicycle' ? 'leaf-outline' : 'water-outline'} size={13} color="#0D9488" />
                      <Label style={s.specChipText}>
                        {b.id === 'bicycle'
                          ? 'Zero Fuel'
                          : `Tank MK-${curLvl} (${(1 + (curLvl - 1) * 0.5).toFixed(1)}x)`}
                      </Label>
                    </View>
                    <View style={s.specChip}>
                      <Icon name="construct-outline" size={13} color="#0D9488" />
                      <Label style={s.specChipText}>
                        {isOwned ? `${Math.ceil(bikeStats?.condition ?? 100)}% Cond` : 'Brand New'}
                      </Label>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {isCurrent ? (
                      <View style={s.equippedBanner}>
                        <Icon name="checkmark-circle" size={17} color="#059669" />
                        <Label style={s.equippedBannerText}>EQUIPPED & READY TO ROLL</Label>
                      </View>
                    ) : isOwned ? (
                      <Pressable
                        testID={`shop-equip-${b.id}`}
                        accessibilityRole="button"
                        onPress={async () => {
                          playDeliverSound();
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                          await g.equip(b.id, p.gear);
                          g.notify(`Equipped ${b.name}! Ready to ride.`);
                        }}
                        style={({ pressed }) => [s.equipBtn, pressed && { opacity: 0.85 }]}
                      >
                        <Icon name="arrow-forward-circle" size={18} color="#FFFFFF" />
                        <Label style={s.equipBtnText}>EQUIP & RIDE THIS BIKE</Label>
                      </Pressable>
                    ) : (
                      <Pressable
                        testID={`shop-buy-${b.id}`}
                        accessibilityRole="button"
                        disabled={!canAffordBuy || g.busy}
                        onPress={async () => {
                          try {
                            playDeliverSound();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                            await g.purchase(b.id);
                            g.notify(`🎉 You purchased ${b.name}! Added to your garage.`);
                          } catch (err: any) {
                            g.notify(err.message || 'Purchase failed.');
                          }
                        }}
                        style={({ pressed }) => [
                          s.buyBtn,
                          !canAffordBuy && s.buyBtnDisabled,
                          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
                        ]}
                      >
                        <View style={s.coinSmallCircle}>
                          <Label style={s.coinSmallText}>C</Label>
                        </View>
                        <Label style={[s.buyBtnText, !canAffordBuy && { color: '#64748B' }]}>
                          {canAffordBuy ? `BUY ${b.name.toUpperCase()} · ${b.cost} COINS` : `NEED ${b.cost - p.balance} MORE COINS`}
                        </Label>
                      </Pressable>
                    )}

                    {/* Fuel Tank Upgrade Option (if owned & upgradeable) */}
                    {canUpgradeTank && (
                      <Pressable
                        testID={`shop-upgrade-tank-${b.id}`}
                        accessibilityRole="button"
                        disabled={!canAffordUpgrade || g.busy}
                        onPress={async () => {
                          try {
                            playDeliverSound();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                            await g.upgradeTank(b.id);
                            g.notify(`🎉 Upgraded ${b.name} to Tank MK-${nxtLvl}!`);
                          } catch (err: any) {
                            g.notify(err.message || 'Upgrade failed.');
                          }
                        }}
                        style={({ pressed }) => [
                          s.upgradeTankBtn,
                          !canAffordUpgrade && { opacity: 0.5 },
                          pressed && { opacity: 0.85 }
                        ]}
                      >
                        <Icon name="build" size={15} color="#B45309" />
                        <Label style={s.upgradeTankBtnText}>
                          {canAffordUpgrade
                            ? `UPGRADE TANK TO MK-${nxtLvl} · ${upgradeCost} COINS`
                            : `NEED ${upgradeCost - p.balance} MORE COINS FOR MK-${nxtLvl}`}
                        </Label>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <>
          <View style={s.art}>
            <Icon
              name={stop.kind === 'repair' ? 'construct-outline' : stop.kind === 'garage' ? 'home-outline' : 'water-outline'}
              size={53}
              color={c.teal}
            />
          </View>
          <Label style={s.kicker}>A PIT STOP, NOT A SETBACK</Label>
          <Label display style={s.title}>{stop.name}</Label>
          <Label style={s.body}>{stop.address}</Label>

          {stop.kind === 'garage' ? (
            <>
              <Label style={s.body}>
                Rest at home for free. Restore health and energy, and grab a small pantry snack if you’re hungry. Your bike still needs fuel and professional repairs.
              </Label>
              <Button testID="service-enter-garage-button" title="GO HOME & REST" onPress={g.returnGarage} loading={g.busy} />
            </>
          ) : stop.kind === 'repair' ? (
            <>
              <Label style={s.body}>
                Bike condition: {Math.ceil(stats.condition)}%. A full repair costs {Math.max(2, Math.ceil((100 - stats.condition) * .25))} coins.
              </Label>
              <Button testID="service-repair-button" title="PAY & REPAIR BIKE" onPress={() => g.useService('repair')} disabled={stats.condition >= 99.9} loading={g.busy} />
            </>
          ) : isBicycle ? (
            <>
              <Label style={s.body}>
                Tire air: {Math.ceil(stats.air)}%. Fill your bicycle tires for 4 coins.
              </Label>
              <Button
                testID="service-refill-button"
                title="PUMP TIRES · 4 COINS"
                onPress={() => g.useService('pump')}
                disabled={stats.air >= 99.9}
                loading={g.busy}
              />
            </>
          ) : (
            <>
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Label style={{ fontSize: 13, fontWeight: '700' }}>
                    Fuel: {Math.ceil(stats.fuel)}%
                  </Label>
                  <Label style={{ fontSize: 11, color: c.teal, fontWeight: '800' }}>
                    Tank Level {stats.tank_level || 1} (Full: {fullTankCost} coins)
                  </Label>
                </View>

                {stats.fuel < 99.9 && coinOptions.length > 1 && (
                  <View style={{ marginVertical: 6 }}>
                    <Label style={{ fontSize: 11, color: c.muted, marginBottom: 8 }}>
                      Choose Refuel Amount (Min 6 Coins):
                    </Label>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {coinOptions.map(amt => {
                        const isSelected = selectedCoins === amt;
                        const fuelGain = Math.min(missingFuel, Math.round((amt / fullTankCost) * 100));
                        const isFull = amt === fullFillCost;
                        return (
                          <Pressable
                            key={amt}
                            onPress={() => setSelectedCoins(amt)}
                            style={{
                              flex: 1,
                              paddingVertical: 9,
                              paddingHorizontal: 6,
                              borderRadius: 12,
                              backgroundColor: isSelected ? c.teal : c.surface,
                              borderWidth: 1.5,
                              borderColor: isSelected ? c.teal : c.border,
                              alignItems: 'center',
                            }}
                          >
                            <Label style={{ fontSize: 12, fontWeight: '800', color: isSelected ? '#FFFFFF' : c.onSurface }}>
                              {isFull ? 'Full Tank' : `${amt}c`}
                            </Label>
                            <Label style={{ fontSize: 9, fontWeight: '600', color: isSelected ? '#FFFFFF' : c.muted, marginTop: 3 }}>
                              +{fuelGain}%
                            </Label>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              <Button
                testID="service-refill-button"
                title={stats.fuel >= 99.9 ? 'TANK IS FULL' : `REFUEL · ${selectedCoins} COINS`}
                onPress={() => g.useService('refuel', selectedCoins)}
                disabled={stats.fuel >= 99.9 || p.balance < selectedCoins}
                loading={g.busy}
              />
            </>
          )}

          <Label style={s.body}>Your balance: {p.balance} coins</Label>
        </>
      )}
    </View>
  );
}
export function RecoveryPanel() {
  const g = useGame(), s = useStyles(), { colors: c } = useTheme(); const [confirm, setConfirm] = useState(false);
  const isPro = !!g.profile?.is_pro;
  return <View testID="death-recovery-modal" style={s.recovery}><View style={s.art}><Icon name="heart-dislike-outline" size={55} color={c.coral} /></View><Label style={s.kicker}>YOUR HEALTH REACHED ZERO</Label><Label display style={s.title}>{confirm ? 'Start from zero?' : 'The ride ends here… for now.'}</Label><Label style={s.body}>{confirm ? 'This erases your coins, deliveries, milestones, food and upgrades. You will restart at the garage with the starter bikes and supplies.' : (isPro ? 'Your active order is cancelled. As a Chill Dash Pro VIP, your garage recovery is 100% FREE (0 coins)! Recover safely at your garage.' : 'Your active order is cancelled. Pay 15 coins to recover at your garage and keep your progress. If you cannot or choose not to pay, restart from zero.')}</Label>{confirm ? <><Button testID="confirm-restart-button" title="ERASE SAVE & RESTART" onPress={() => g.recover('restart')} loading={g.busy} /><Button testID="cancel-restart-button" title="GO BACK" secondary onPress={() => setConfirm(false)} style={{ marginTop: 12 }} /></> : <><Button testID="pay-recovery-button" title={isPro ? "FREE RECOVERY (PRO VIP) · 0 COINS" : "RECOVER · 15 COINS"} onPress={() => g.recover('pay')} disabled={!isPro && g.profile!.balance < 15} loading={g.busy} /><Label style={s.body}>{isPro ? 'Chill Dash Pro VIP: Free Emergency Recovery' : `You have ${g.profile!.balance} coins.${g.profile!.balance < 15 ? ' Not enough for recovery.' : ''}`}</Label><Button testID="restart-choice-button" title="RESTART FROM ZERO" secondary onPress={() => setConfirm(true)} /></>}</View>;
}
const useStyles = makeStyles(c => ({
  art: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: c.mint, alignSelf: 'center', marginBottom: 23 },
  title: { fontSize: 28, marginBottom: 12 },
  kicker: { fontSize: 9, letterSpacing: 1.2, color: c.teal, fontWeight: '800', marginBottom: 10 },
  body: { fontSize: 13, lineHeight: 21, color: c.muted, marginBottom: 20, marginTop: 8 },
  recovery: { backgroundColor: c.surface, padding: 26, borderRadius: 28, width: '90%', maxWidth: 410, borderWidth: 2, borderBottomWidth: 5, borderColor: c.onSurface },
  // Akash Wheels Showroom Styles
  shopBanner: {
    backgroundColor: c.butter,
    borderRadius: 22,
    padding: 16,
    borderWidth: 2,
    borderBottomWidth: 4.5,
    borderColor: c.onSurface,
  },
  shopBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: c.onSurface,
  },
  shopBannerTitle: {
    fontSize: 22,
    color: c.onSurface,
    letterSpacing: 0.5,
  },
  shopBannerSub: {
    fontSize: 11,
    color: c.teal,
    fontWeight: '800',
    marginTop: 1,
  },
  shopBalanceBadge: {
    backgroundColor: c.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.onSurface,
  },
  shopBannerDesc: {
    fontSize: 12,
    color: c.wood,
    marginTop: 10,
    lineHeight: 17,
  },
  bikeCard: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    borderColor: c.onSurface,
  },
  bikeCardCurrent: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  bikeName: {
    fontSize: 19,
    color: c.onSurface,
  },
  bikeSubtitle: {
    fontSize: 11,
    color: c.muted,
    marginTop: 2,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  statusPillCurrent: {
    backgroundColor: '#DCFCE7',
    borderColor: '#10B981',
  },
  statusPillOwned: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  statusPillBuy: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  bikeArtContainer: {
    height: 85,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  specRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  specChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.surfaceSecondary,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    justifyContent: 'center',
  },
  specChipText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: c.onSurface,
  },
  equippedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  equippedBannerText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.5,
  },
  equipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderBottomWidth: 3.5,
    borderColor: '#000000',
  },
  equipBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderBottomWidth: 3.5,
    borderColor: '#000000',
  },
  buyBtnDisabled: {
    backgroundColor: '#E2E8F0',
    borderColor: '#94A3B8',
  },
  buyBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  coinSmallCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#000000',
  },
  coinSmallText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
  },
  upgradeTankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  upgradeTankBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
}));