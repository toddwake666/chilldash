import React, { useState, useEffect, useRef } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '@/src/theme';
import { useGame } from '@/src/game/GameContext';
import { BIKES, gameTime } from '@/src/game/world';
import { Button, Coin, Icon, IconButton, Label } from '@/src/components/ui';
import { BikeArt } from '@/src/components/BikeArt';
import { ChillDashBanner, checkProEntitlement } from '@/src/game/monetization';
import * as Haptics from 'expo-haptics';
import { MAX_TANK_LEVELS, TANK_UPGRADE_COSTS, getFullRefuelCost } from '@/src/game/localEngine';
import { playDeliverSound } from '@/src/game/sounds';

const GARAGE_ART = require('@/assets/images/garage-art.jpeg');
export function Garage() {
  const s = useStyles(); const { colors: c } = useTheme(); const g = useGame(); const inset = useSafeAreaInsets(); const { height: screenHeight } = useWindowDimensions();
  const p = g.profile!;
  const hour = g.clock.current / 60;
  const [isPro, setIsPro] = useState(false);
  const [selectedBikeForModal, setSelectedBikeForModal] = useState<typeof BIKES[number] | null>(null);

  const upgradeScaleAnim = useSharedValue(1);
  const upgradeScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: upgradeScaleAnim.value }],
  }));

  const isNewLifeParthoPrompt =
    (p.deliveries === 0 || !p.deliveries) &&
    !p.partho_quest_completed &&
    !p.partho_borrowed_express &&
    (p.partho_chat_stage ?? 0) < 2;

  const isGoOnlinePrompt =
    (!p.deliveries || p.deliveries === 0) &&
    !!p.partho_borrowed_express &&
    !p.online &&
    !g.order;

  const isPhoneHighlighted = isNewLifeParthoPrompt || isGoOnlinePrompt;

  const phoneDotPulse = useSharedValue(1);
  useEffect(() => {
    if (isPhoneHighlighted) {
      phoneDotPulse.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 550 }),
          withTiming(1, { duration: 550 })
        ),
        -1,
        true
      );
    } else {
      phoneDotPulse.value = 1;
    }
  }, [isPhoneHighlighted]);

  const phoneDotPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: phoneDotPulse.value }],
  }));

  useEffect(() => {
    checkProEntitlement().then(setIsPro).catch(() => {});
  }, [p.balance]);

  const isBoosted = !!(p.speed_boost_until && p.minutes < p.speed_boost_until);
  const currentBike = BIKES.find(b => b.id === p.bike) || BIKES[1];
  const baseKmh = Math.round(currentBike.speed * 0.24);
  const boostedKmh = baseKmh + 10;

  return <SafeAreaView edges={['top']} style={s.page}>
    <View style={s.header} testID="garage-header">
      <View style={s.brand}><View style={s.brandIcon}><Icon name="moped" bike size={27} /></View><Label display style={s.brandText}>chill dash<Label style={s.brandDot}>.</Label></Label></View>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <Pressable
          testID="garage-phone-button"
          accessibilityRole="button"
          accessibilityLabel="Open my phone"
          onPress={() => g.openPhone()}
          style={({ pressed }) => [
            s.phoneIconBtn,
            isPhoneHighlighted && s.phoneBtnHighlighted,
            pressed && { opacity: .65 }
          ]}
        >
          <Icon name="phone-portrait-outline" size={20} color={isPhoneHighlighted ? '#E53E3E' : c.teal} />
          {isPhoneHighlighted && (
            <Animated.View style={[s.cornerRedDot, phoneDotPulseStyle]} />
          )}
        </Pressable>
        <Pressable
          testID="garage-profile-button"
          accessibilityRole="button"
          accessibilityLabel="Open account and cloud save"
          onPress={() => g.openPhone('profile')}
          style={({ pressed }) => [s.wallet, pressed && { opacity: .65 }]}
        >
          <Icon name={g.user ? "person-circle" : "person-circle-outline"} size={17} color={g.user ? c.teal : c.onSurface} />
          <Label style={{ fontSize: 9.5, fontWeight: '800' }}>{g.user ? 'Account' : 'Login'}</Label>
        </Pressable>
        <Pressable
          testID="garage-wallet-button"
          accessibilityRole="button"
          accessibilityLabel="Open wallet"
          disabled={isNewLifeParthoPrompt}
          onPress={() => g.openPhone('wallet')}
          style={({ pressed }) => [s.wallet, { flexShrink: 0 }, isNewLifeParthoPrompt && { opacity: 0.35 }, pressed && { opacity: .65 }]}
        >
          <Coin amount={p.balance} small />
          <Icon name="add" size={15} />
        </Pressable>
      </View>
    </View>
    <ScrollView testID="garage-scroll" showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <View style={s.titleRow}><View><Label style={s.eyebrow}>YOUR LITTLE CORNER OF THE CITY</Label><Label testID="garage-title" display style={s.heading}>Good {hour >= 18 || hour < 5 ? 'evening' : hour >= 12 ? 'afternoon' : 'morning'}, rider.</Label></View><IconButton testID="help-button" name="help" disabled={isNewLifeParthoPrompt} onPress={() => g.setPanel('help')} label="How to play" style={s.help} /></View>
        <Label style={s.subtitle}>New streets. Little adventures. Your own pace.</Label>
        <View style={s.artCard} testID="garage-illustration">
          <Image source={GARAGE_ART} style={s.art} contentFit="cover" transition={250} accessibilityLabel="Your sunny garage, delivery boy and yellow scooter" />
          <View style={s.artTop}><View style={s.location}><View style={s.dot} /><Label style={s.locationText}>HOME SWEET GARAGE</Label></View><View style={s.time}><Icon name={hour >= 18 || hour < 5 ? 'moon-outline' : 'sunny-outline'} size={16} /><Label style={s.locationText}>{gameTime(g.clock.current)}</Label></View></View>
          <View style={s.artBottom}><Icon name="location" size={14} color={c.surface} /><Label style={s.artCaption}>Sunnyvale • Your apartment</Label></View>
        </View>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(100).duration(450)}>
        <View style={s.sectionRow}><Label display style={s.sectionTitle}>Pick your ride</Label><Label style={s.sectionNote}>A trusty steed for every street</Label></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.bikesScroll}>
          {BIKES.map(b => {
            const owned = p.owned_bikes.includes(b.id);
            const selected = p.bike === b.id;
            return <Pressable key={b.id} testID={`select-bike-${b.id}`} accessibilityRole="button" accessibilityState={{ selected }} disabled={g.busy || isNewLifeParthoPrompt} onPress={() => setSelectedBikeForModal(b)} style={({ pressed }) => [s.bikeCard, selected && s.bikeSelected, isNewLifeParthoPrompt && { opacity: 0.5 }, pressed && { transform: [{ scale: .96 }] }]}>
            <View style={s.bikeTop}>{selected ? <View style={s.check}><Icon name="checkmark" size={12} /></View> : <View style={s.unchecked}>{!owned && <Icon name="lock-closed" size={12} color={c.muted} />}</View>}{!owned && <Coin amount={b.cost} small />}</View>
            <BikeArt type={b.id} width={96} height={57} />
            <Label display style={s.bikeName} numberOfLines={1}>{b.name}</Label>
            <Label style={s.bikeNote}>{selected ? 'READY TO ROLL' : owned ? b.stat : 'Unlock with coins'}</Label>
          </Pressable>; })}
        </ScrollView>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(140).duration(450)}>
        <View style={s.sectionRow}>
          <Label display style={s.sectionTitle}>Engine Tuning & Speed</Label>
          <Label style={s.sectionNote}>Velocity Overdrive</Label>
        </View>
        <Pressable
          testID="garage-speed-boost-card"
          accessibilityRole="button"
          accessibilityLabel="Open speed boost nitro"
          disabled={isNewLifeParthoPrompt}
          onPress={() => g.openSpeedBoost()}
          style={({ pressed }) => [
            s.boostCard,
            isBoosted && s.boostCardActive,
            isNewLifeParthoPrompt && { opacity: 0.4 },
            pressed && { opacity: 0.75 }
          ]}
        >
          <View style={[s.boostCardIcon, isBoosted && s.boostCardIconActive]}>
            <Icon name="flash" size={22} color={isBoosted ? '#000000' : c.brand} />
          </View>
          <View style={s.boostCardText}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Label style={s.boostCardTitle}>Speed Boost (+10 km/h)</Label>
              {isBoosted && (
                <View style={s.boostActiveTag}>
                  <Label style={s.boostActiveTagText}>ACTIVE</Label>
                </View>
              )}
            </View>
            <Label style={s.boostCardNote}>
              {isBoosted
                ? `${currentBike.name}: ${boostedKmh} km/h (Nitro Engaged)`
                : `${currentBike.name}: ${baseKmh} km/h · Refuel with Pro, Coins or Ad`}
            </Label>
          </View>
          <View style={s.boostActionWrap}>
            <Label style={s.boostActionText}>{isBoosted ? 'MANAGE' : 'REFUEL'}</Label>
            <Icon name="chevron-forward" size={16} color={c.teal} />
          </View>
        </Pressable>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(180).duration(450)}>
        <View style={s.sectionRow}><Label display style={s.sectionTitle}>The essentials</Label><Label style={s.sectionNote}>Look good. Deliver better.</Label></View>
        <Pressable testID="gear-button" disabled={isNewLifeParthoPrompt} onPress={() => g.setPanel('gear')} style={({ pressed }) => [s.gear, isNewLifeParthoPrompt && { opacity: 0.4 }, pressed && { opacity: .7 }]}>
          <View style={s.gearIcon}><Icon name="bag-handle-outline" size={23} color={c.teal} /></View><View style={s.gearText}><Label style={s.gearTitle}>{p.gear === 'raincoat' ? 'Rain-ready kit' : 'Everyday kit'}</Label><Label style={s.gearNote}>{p.gear === 'raincoat' ? 'Helmet, thermal bag & raincoat' : 'Helmet on. Delivery bag packed.'}</Label></View><View style={s.equipped}><Label style={s.equippedText}>Equipped</Label></View><Icon name="chevron-forward" size={16} />
        </Pressable>
      </Animated.View>
      <View style={s.progress} testID="rider-progress"><Icon name="sparkles-outline" size={17} color={c.teal} /><Label style={s.progressLabel}>Level {Math.floor(p.xp / 100) + 1} · {p.deliveries ? 'Finding your rhythm' : 'Every great rider starts somewhere'}</Label><Label style={s.xp}>{p.xp % 100}/100 XP</Label></View>
      <View style={s.supplyRow}>{[{ id: 'food', label: 'Food bag', icon: 'restaurant-outline' }, { id: 'care', label: 'Rider & bike', icon: 'heart-outline' }, { id: 'milestones', label: 'Milestones', icon: 'trophy-outline' }].map(item => <Pressable key={item.id} testID={`garage-${item.id}-button`} disabled={isNewLifeParthoPrompt} style={[s.supply, isNewLifeParthoPrompt && { opacity: 0.4 }]} onPress={() => g.openPhone(item.id as 'food' | 'care' | 'milestones')}><Icon name={item.icon} size={20} color={c.teal} /><Label style={s.supplyLabel}>{item.label}</Label></Pressable>)}</View>
    </ScrollView>
    <View style={[s.footer, { paddingBottom: Math.max(inset.bottom, 14) }]}>
      <ChillDashBanner placement="garage_footer" isPro={isPro} />
      {isNewLifeParthoPrompt ? (
        <View style={s.messageAlertBox}>
          <Pressable
            testID="garage-urgent-phone-button"
            accessibilityRole="button"
            accessibilityLabel="Open Phone to read message"
            onPress={() => g.openPhone()}
            style={({ pressed }) => [s.urgentPhoneBtn, pressed && { opacity: 0.85 }]}
          >
            <View style={s.urgentPhoneIcon}>
              <Icon name="chatbubble-ellipses" size={26} color="#FFFFFF" />
              <Animated.View style={[s.cornerRedDot, phoneDotPulseStyle]} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Label display style={s.urgentPhoneTitle}>MY PHONE</Label>
              <Label style={s.urgentPhoneSubtle}>You got a message.</Label>
            </View>
            <View style={s.urgentPhonePill}>
              <Label style={s.urgentPhonePillText}>OPEN</Label>
              <Icon name="arrow-forward" size={14} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
      ) : isGoOnlinePrompt ? (
        <View style={s.messageAlertBox}>
          <Pressable
            testID="garage-urgent-phone-button"
            accessibilityRole="button"
            accessibilityLabel="Open Phone to go online"
            onPress={() => g.openPhone()}
            style={({ pressed }) => [s.urgentPhoneBtn, pressed && { opacity: 0.85 }]}
          >
            <View style={s.urgentPhoneIcon}>
              <Icon name="radio-outline" size={26} color="#FFFFFF" />
              <Animated.View style={[s.cornerRedDot, phoneDotPulseStyle]} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Label display style={s.urgentPhoneTitle}>MY PHONE</Label>
              <Label style={s.urgentPhoneSubtle}>Go online for orders.</Label>
            </View>
            <View style={s.urgentPhonePill}>
              <Label style={s.urgentPhonePillText}>OPEN</Label>
              <Icon name="arrow-forward" size={14} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
      ) : (
        <Button
          testID="head-out-button"
          title={g.order && g.order.status !== 'offered' ? 'CONTINUE YOUR DELIVERY' : 'LET’S HIT THE STREETS'}
          icon="arrow-forward"
          onPress={g.headOut}
          loading={g.busy}
        />
      )}
      <View style={s.footerNote}><View style={[s.dot, { backgroundColor: c.teal }]} /><Label style={s.footerText}>No rush. The city is yours to explore.</Label></View>
    </View>

    {selectedBikeForModal && (() => {
      const isSelectedOwned = p.bike === selectedBikeForModal.id || p.owned_bikes.includes(selectedBikeForModal.id);
      return (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedBikeForModal(null)}
        >
          <View style={s.modalOverlay}>
            <Pressable
              testID="bike-modal-backdrop"
              style={s.modalBackdrop}
              onPress={() => setSelectedBikeForModal(null)}
            />
            <View style={[s.modalCard, { maxHeight: screenHeight - inset.top - inset.bottom - 48 }]} testID="bike-details-modal">
              {/* Top Header with Close Button */}
              <View style={s.modalHeader}>
                <View style={s.modalTag}>
                  <Icon
                    name={
                      p.bike === selectedBikeForModal.id
                        ? 'checkmark-circle'
                        : isSelectedOwned
                        ? 'home'
                        : 'lock-closed'
                    }
                    size={14}
                    color={p.bike === selectedBikeForModal.id ? c.success : c.teal}
                  />
                  <Label style={s.modalTagText}>
                    {p.bike === selectedBikeForModal.id
                      ? 'CURRENT RIDE'
                      : isSelectedOwned
                      ? 'IN YOUR GARAGE'
                      : 'LOCKED BIKE'}
                  </Label>
                </View>
                <Pressable
                  testID="bike-modal-close-button"
                  accessibilityRole="button"
                  accessibilityLabel="Close bike details"
                  onPress={() => setSelectedBikeForModal(null)}
                  style={({ pressed }) => [s.modalCloseBtn, pressed && { opacity: 0.6 }]}
                >
                  <Icon name="close" size={20} color={c.onSurface} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 6 }}>

            {/* Hero Bike Art */}
            <View style={s.modalArtContainer}>
              <View style={s.modalArtGlow} />
              <BikeArt type={selectedBikeForModal.id} width={175} height={105} />
            </View>

            {/* Title & Notes */}
            <Label display style={s.modalTitle}>
              {selectedBikeForModal.name}
            </Label>
            <Label style={s.modalSubtitle}>{selectedBikeForModal.note}</Label>

            {/* Specs Grid */}
            <View style={s.specsGrid}>
              <View style={s.specItem}>
                <Icon name="speedometer-outline" size={17} color={c.teal} />
                <Label style={s.specValue}>
                  {Math.round(selectedBikeForModal.speed * 0.24)} km/h
                </Label>
                <Label style={s.specLabel}>Top Speed</Label>
              </View>
              <View style={s.specDivider} />
              <View style={s.specItem}>
                <Icon name="hardware-chip-outline" size={17} color={c.teal} />
                <Label style={s.specValue}>{selectedBikeForModal.stat}</Label>
                <Label style={s.specLabel}>Class</Label>
              </View>
              <View style={s.specDivider} />
              <View style={s.specItem}>
                <Icon
                  name={
                    selectedBikeForModal.id === 'bicycle'
                      ? 'bicycle-outline'
                      : 'water-outline'
                  }
                  size={17}
                  color={c.teal}
                />
                <Label style={s.specValue}>
                  {selectedBikeForModal.id === 'bicycle'
                    ? 'Air Tires'
                    : p.owned_bikes.includes(selectedBikeForModal.id)
                    ? `${Math.ceil(p.bikes[selectedBikeForModal.id]?.fuel ?? 100)}%`
                    : 'Gasoline'}
                </Label>
                <Label style={s.specLabel}>
                  {selectedBikeForModal.id === 'bicycle' ? 'Drive' : 'Fuel'}
                </Label>
              </View>
              <View style={s.specDivider} />
              <View style={s.specItem}>
                <Icon
                  name="construct-outline"
                  size={17}
                  color={
                    (p.bikes[selectedBikeForModal.id]?.condition ?? 100) < 25
                      ? c.error
                      : c.teal
                  }
                />
                <Label
                  style={[
                    s.specValue,
                    (p.bikes[selectedBikeForModal.id]?.condition ?? 100) < 25 && {
                      color: c.error,
                    },
                  ]}
                >
                  {p.owned_bikes.includes(selectedBikeForModal.id)
                    ? `${Math.ceil(p.bikes[selectedBikeForModal.id]?.condition ?? 100)}%`
                    : '100%'}
                </Label>
                <Label style={s.specLabel}>Condition</Label>
              </View>
            </View>

            {/* Game-Themed Ride Upgrade Component (matching user mockup) */}
            {selectedBikeForModal.id === 'bicycle' ? (
              <View style={s.gameUpgradeCard}>
                <View style={s.gameUpgradeHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="bicycle-outline" size={24} color="#059669" />
                    <View style={{ marginLeft: 8 }}>
                      <Label display style={s.gameUpgradeTitle}>RIDE SPECS</Label>
                      <Label style={s.gameUpgradeSubtitle}>Bio-pedal drive · Zero fuel required</Label>
                    </View>
                  </View>
                  <Icon name="information-circle-outline" size={20} color="#94A3B8" />
                </View>

                <View style={[s.statComparisonRow, { marginTop: 4 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="leaf-outline" size={22} color="#10B981" />
                    <View style={{ marginLeft: 10 }}>
                      <Label style={s.statRowTitle}>Propulsion</Label>
                      <Label style={s.statRowSubtitle}>100% Human Pedal Power</Label>
                    </View>
                  </View>
                  <View style={s.percentBadge}>
                    <Label style={s.percentBadgeText}>ECO DRIVE</Label>
                  </View>
                </View>

                <View style={[s.statComparisonRow, { marginTop: 8 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="bicycle-outline" size={22} color="#0D9488" />
                    <View style={{ marginLeft: 10 }}>
                      <Label style={s.statRowTitle}>Tire Maintenance</Label>
                      <Label style={s.statRowSubtitle}>Flat rate at gas stations</Label>
                    </View>
                  </View>
                  <Label style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>4 coins / pump</Label>
                </View>
              </View>
            ) : (() => {
              const bikeStats = p.bikes[selectedBikeForModal.id];
              const isOwned = isSelectedOwned;
              const maxLvl = MAX_TANK_LEVELS[selectedBikeForModal.id] || 1;
              const curLvl = bikeStats?.tank_level || 1;
              const nxtLvl = curLvl + 1;
              const upCost = TANK_UPGRADE_COSTS[nxtLvl] || 50;
              const fullCost = getFullRefuelCost(selectedBikeForModal.id, curLvl);
              const hasCoins = p.balance >= upCost;
              const isMax = curLvl >= maxLvl;

              const curRange = (1 + (curLvl - 1) * 0.5).toFixed(1);
              const nxtRange = (1 + curLvl * 0.5).toFixed(1);

              return (
                <View style={s.gameUpgradeCard}>
                  {/* Card Header */}
                  <View style={s.gameUpgradeHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="build" size={24} color="#F59E0B" />
                      <View style={{ marginLeft: 8 }}>
                        <Label display style={s.gameUpgradeTitle}>RIDE UPGRADE</Label>
                        <Label style={s.gameUpgradeSubtitle}>Make this ride go farther on every trip.</Label>
                      </View>
                    </View>
                    <Icon name="information-circle-outline" size={20} color="#94A3B8" />
                  </View>

                  {/* Stage Comparison Row (MK-1 ➔ MK-2) */}
                  <Animated.View style={[s.upgradeStageRow, upgradeScaleStyle]}>
                    {/* Current Stage Box */}
                    <View style={s.stageBoxCurrent}>
                      <Label style={s.stageBoxTitle}>MK-{curLvl}</Label>
                      <View style={s.stageBikeArtWrapper}>
                        <BikeArt type={selectedBikeForModal.id} width={75} height={45} />
                      </View>
                      <View style={s.currentPill}>
                        <Label style={s.currentPillText}>CURRENT</Label>
                      </View>
                    </View>

                    {/* Arrow */}
                    <View style={s.stageArrowWrapper}>
                      <Icon name="arrow-forward" size={20} color="#64748B" />
                    </View>

                    {/* Next Stage Box */}
                    <View style={[s.stageBoxNext, isMax && s.stageBoxMaxed]}>
                      <View style={s.stageNextHeader}>
                        <Label style={[s.stageBoxTitle, { color: isMax ? '#B45309' : '#475569' }]}>
                          MK-{isMax ? maxLvl : nxtLvl}
                        </Label>
                        {!isMax && (
                          <View style={s.stageLockIcon}>
                            <Icon name="lock-closed" size={13} color="#94A3B8" />
                          </View>
                        )}
                      </View>
                      <View style={[s.stageBikeArtWrapper, !isMax && { opacity: 0.5 }]}>
                        <BikeArt type={selectedBikeForModal.id} width={75} height={45} />
                      </View>
                      <Label style={[s.nextPillText, isMax && { color: '#B45309' }]}>
                        {isMax ? 'MAXED' : 'NEXT'}
                      </Label>
                    </View>
                  </Animated.View>

                  {/* Stat Comparison 1: Fuel Range */}
                  <View style={s.statComparisonRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="water-outline" size={22} color="#0D9488" />
                      <View style={{ marginLeft: 10 }}>
                        <Label style={s.statRowTitle}>Fuel Range</Label>
                        <Label style={s.statRowSubtitle}>Go farther before refueling</Label>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Label style={s.statValueOld}>{curRange}x</Label>
                      {!isMax && (
                        <>
                          <Icon name="arrow-forward" size={12} color="#94A3B8" />
                          <Label style={s.statValueNew}>{nxtRange}x</Label>
                          <View style={s.percentBadge}>
                            <Label style={s.percentBadgeText}>+50%</Label>
                          </View>
                        </>
                      )}
                    </View>
                  </View>

                  {/* Stat Comparison 2: Fuel Efficiency */}
                  <View style={[s.statComparisonRow, { marginTop: 8 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="leaf-outline" size={22} color="#10B981" />
                      <View style={{ marginLeft: 10 }}>
                        <Label style={s.statRowTitle}>Fuel Efficiency</Label>
                        <Label style={s.statRowSubtitle}>Less fuel, more rides</Label>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Label style={s.statValueOld}>{curLvl === 1 ? 'Standard' : 'Improved'}</Label>
                      {!isMax && (
                        <>
                          <Icon name="arrow-forward" size={12} color="#94A3B8" />
                          <Label style={s.statValueNew}>Improved</Label>
                        </>
                      )}
                    </View>
                  </View>

                  {/* Action Section */}
                  {isOwned && !isMax && (
                    <Pressable
                      testID="upgrade-fuel-tank-button"
                      accessibilityRole="button"
                      accessibilityLabel={`Upgrade fuel tank to MK ${nxtLvl}`}
                      disabled={!hasCoins || g.busy}
                      onPress={async () => {
                        // Upgradation effects!
                        upgradeScaleAnim.value = withSequence(
                          withTiming(1.12, { duration: 130 }),
                          withTiming(0.95, { duration: 110 }),
                          withTiming(1, { duration: 140 })
                        );
                        playDeliverSound();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                        await g.upgradeTank(selectedBikeForModal.id);
                        g.notify(`🎉 Upgraded ${selectedBikeForModal.name} to MK-${nxtLvl}! Fuel tank fully filled.`);
                      }}
                      style={({ pressed }) => [
                        s.gameUpgradeBtn,
                        !hasCoins && s.gameUpgradeBtnDisabled,
                        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      <View style={s.coinCircle}>
                        <Label style={s.coinCircleText}>C</Label>
                      </View>
                      <Label style={[s.gameUpgradeBtnText, !hasCoins && { color: '#64748B' }]}>
                        {hasCoins
                          ? `UPGRADE TO MK-${nxtLvl} · ${upCost} COINS`
                          : `NEED ${upCost - p.balance} MORE COINS`}
                      </Label>
                      <Icon name="flash" size={17} color={hasCoins ? '#000000' : '#64748B'} />
                    </Pressable>
                  )}

                  {isOwned && isMax && (
                    <View style={s.gameMaxedBadge}>
                      <Icon name="sparkles" size={16} color="#B45309" />
                      <Label style={s.gameMaxedText}>
                        MAX LEVEL REACHED · PEAK PERFORMANCE
                      </Label>
                    </View>
                  )}

                  {!isOwned && (
                    <View style={s.unownedBikeNote}>
                      <Icon name="information-circle-outline" size={14} color="#64748B" />
                      <Label style={s.unownedBikeText}>
                        Upgradable to MK-{maxLvl} (+{(maxLvl - 1) * 50}% range) upon purchase
                      </Label>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Low Condition Warning if applicable */}
            {isSelectedOwned &&
              (p.bikes[selectedBikeForModal.id]?.condition ?? 100) <= 0 && (
                <View
                  style={{
                    backgroundColor: '#FEE2E2',
                    borderColor: '#EF4444',
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: 8,
                    marginBottom: 12,
                  }}
                >
                  <Label
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#B91C1C',
                      textAlign: 'center',
                    }}
                  >
                    ⚠️ 0% Condition (Broken down): Walking / pushing on foot at 29 km/h. Visit a Repair Shop or call roadside help to fix!
                  </Label>
                </View>
              )}

            {/* Balance / Pricing Info */}
            {!isSelectedOwned && (
              <View style={s.priceBox}>
                <Label style={s.priceLabel}>Price:</Label>
                <Coin amount={selectedBikeForModal.cost} />
                <View style={{ flex: 1 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Label style={s.balanceText}>Your balance:</Label>
                  <Coin amount={p.balance} small />
                </View>
              </View>
            )}

            {/* Action Button */}
            <View style={s.modalAction}>
              {p.bike === selectedBikeForModal.id ? (
                <Button
                  testID="bike-equipped-indicator"
                  title="CURRENTLY EQUIPPED"
                  icon="checkmark-circle"
                  disabled
                  onPress={() => {}}
                />
              ) : isSelectedOwned ? (
                <Button
                  testID="modal-equip-bike-button"
                  title="TAKE THE KEYS · EQUIP"
                  icon="key-outline"
                  loading={g.busy}
                  onPress={() => {
                    g.equip(selectedBikeForModal.id, p.gear);
                    setSelectedBikeForModal(null);
                    g.notify(`${selectedBikeForModal.name} equipped! Ready to roll.`);
                  }}
                />
              ) : p.balance >= selectedBikeForModal.cost ? (
                <Button
                  testID="modal-unlock-bike-button"
                  title={`UNLOCK FOR ${selectedBikeForModal.cost} COINS`}
                  icon="lock-open-outline"
                  loading={g.busy}
                  onPress={async () => {
                    await g.purchase(selectedBikeForModal.id);
                    await g.equip(selectedBikeForModal.id, p.gear);
                    setSelectedBikeForModal(null);
                    g.notify(`${selectedBikeForModal.name} unlocked & equipped!`);
                  }}
                />
              ) : (
                <>
                  <Button
                    testID="modal-locked-bike-button"
                    title={`NEED ${selectedBikeForModal.cost - p.balance} MORE COINS`}
                    icon="lock-closed-outline"
                    disabled
                    onPress={() => {}}
                  />
                  <Button
                    testID="modal-get-coins-button"
                    title="GET COINS IN WALLET"
                    secondary
                    icon="wallet-outline"
                    onPress={() => {
                      setSelectedBikeForModal(null);
                      g.openPhone('wallet');
                    }}
                    style={{ marginTop: 8 }}
                  />
                </>
              )}
            </View>
              </ScrollView>
          </View>
        </View>
      </Modal>
      );
    })()}
  </SafeAreaView>;
}
const useStyles = makeStyles(c => ({
  supplyRow: { flexDirection: 'row', gap: 8, marginVertical: 15 }, supply: { flex: 1, minHeight: 63, borderRadius: 14, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center', gap: 6 }, supplyLabel: { fontSize: 10, color: c.teal, fontWeight: '800' },
  page: { flex: 1, backgroundColor: c.surface },
  header: { height: 68, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: c.border },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  brandIcon: { width: 35, height: 33, borderRadius: 11, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }], borderWidth: 1.5, borderColor: c.onSurface },
  brandText: { fontSize: 23, letterSpacing: -.9 },
  brandDot: { color: c.teal, fontSize: 27 },
  phoneIconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, paddingHorizontal: 9, backgroundColor: c.surfaceSecondary, borderRadius: 12, borderWidth: 1, borderColor: c.border },
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 10 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontSize: 8.5, letterSpacing: 1.65, fontWeight: '800', color: c.teal, marginBottom: 7 },
  heading: { fontSize: 30, letterSpacing: -.75 }, help: { height: 32, width: 32, minHeight: 44, backgroundColor: c.transparent, borderWidth: 0 },
  subtitle: { fontSize: 12.5, color: c.muted, marginTop: 5, marginBottom: 18 },
  artCard: { height: 218, borderRadius: 18, overflow: 'hidden', backgroundColor: c.peach, borderWidth: 1, borderColor: c.borderStrong },
  art: { width: '100%', height: '100%' }, artTop: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  location: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: c.glass, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 7 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.success }, locationText: { fontSize: 8, fontWeight: '800', letterSpacing: .4 },
  time: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.glass, borderRadius: 7, paddingHorizontal: 8 },
  artBottom: { position: 'absolute', bottom: 11, left: 12, backgroundColor: c.overlay, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  artCaption: { color: c.surface, fontSize: 9, fontWeight: '700' },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontSize: 21, letterSpacing: -.4 }, sectionNote: { fontSize: 9.5, color: c.muted },
  bikesScroll: { flexDirection: 'row', gap: 10, paddingVertical: 2 }, bikeCard: { width: 132, alignItems: 'center', paddingVertical: 8, borderWidth: 1.5, borderColor: c.border, borderRadius: 14, backgroundColor: c.surfaceSecondary, overflow: 'hidden' },
  bikeSelected: { borderColor: c.onSurface, backgroundColor: c.butter }, bikeTop: { height: 18, alignSelf: 'stretch', marginHorizontal: 7, flexDirection: 'row', justifyContent: 'space-between' },
  check: { width: 17, height: 17, backgroundColor: c.brand, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.onSurface }, unchecked: { width: 17, height: 17 },
  bikeTutorialHighlight: { borderColor: '#F59E0B', borderWidth: 2.5, backgroundColor: c.mint },
  bossBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 },
  bossBadgeText: { fontSize: 7, fontWeight: '800', color: c.surface },
  bikeName: { fontSize: 13, marginTop: 2 },
  bikeNote: { fontSize: 7.5, color: c.muted, marginTop: 4, fontWeight: '700', marginBottom: 2 },
  boostCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, backgroundColor: c.surfaceSecondary, borderRadius: 16, borderWidth: 1.5, borderColor: c.border, marginBottom: 14 },
  boostCardActive: { borderColor: c.onSurface, backgroundColor: c.butter },
  boostCardIcon: { height: 42, width: 42, borderRadius: 12, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' },
  boostCardIconActive: { backgroundColor: c.brand },
  boostCardText: { flex: 1 },
  boostCardTitle: { fontSize: 13, fontWeight: '800' },
  boostActiveTag: { backgroundColor: '#00E676', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  boostActiveTagText: { fontSize: 8, fontWeight: '900', color: '#000000' },
  boostCardNote: { fontSize: 10, color: c.muted, marginTop: 3 },
  boostActionWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  boostActionText: { fontSize: 9, fontWeight: '800', color: c.teal, letterSpacing: 0.5 },
  gear: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: c.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: c.border },
  gearTutorialHighlight: { borderColor: c.teal, borderWidth: 2.5, backgroundColor: c.mint },
  gearIcon: { height: 37, width: 37, borderRadius: 11, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' }, gearText: { flex: 1 }, gearTitle: { fontSize: 12, fontWeight: '800' }, gearNote: { fontSize: 9.5, color: c.muted, marginTop: 3 },
  equipped: { paddingVertical: 4, paddingHorizontal: 7, borderRadius: 5, backgroundColor: c.mint }, equippedText: { fontSize: 8, color: c.teal, fontWeight: '800' },
  progress: { flexDirection: 'row', gap: 6, marginTop: 18, marginBottom: 8, alignItems: 'center' }, progressLabel: { fontSize: 9, flex: 1, color: c.muted }, xp: { fontSize: 9, color: c.teal, fontWeight: '800' },
  footer: { paddingHorizontal: 22, paddingTop: 12, borderTopWidth: 1, borderColor: c.border, backgroundColor: c.surface }, footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 9 }, footerText: { fontSize: 9, color: c.muted },

  // Bike Details Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalCard: { width: '100%', maxWidth: 390, backgroundColor: c.surface, borderRadius: 28, padding: 22, borderWidth: 2, borderBottomWidth: 5, borderColor: c.onSurface, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.mint, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  modalTagText: { fontSize: 9, fontWeight: '800', color: c.teal, letterSpacing: 0.6 },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  modalArtContainer: { height: 125, backgroundColor: c.surfaceSecondary, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border, marginBottom: 14, overflow: 'hidden' },
  modalArtGlow: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: c.mint, opacity: 0.45 },
  modalTitle: { fontSize: 24, letterSpacing: -0.5, textAlign: 'center' },
  modalSubtitle: { fontSize: 12, color: c.muted, textAlign: 'center', marginTop: 3, marginBottom: 14 },
  specsGrid: { flexDirection: 'row', backgroundColor: c.surfaceSecondary, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'space-around', borderWidth: 1, borderColor: c.border, marginBottom: 14 },
  specItem: { alignItems: 'center', flex: 1 },
  specValue: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  specLabel: { fontSize: 8, color: c.muted, marginTop: 2, fontWeight: '700' },
  specDivider: { width: 1, height: 28, backgroundColor: c.border },
  priceBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.butter, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14, borderWidth: 1, borderColor: c.onSurface },
  priceLabel: { fontSize: 11, fontWeight: '800' },
  balanceText: { fontSize: 10, color: c.onSurface, fontWeight: '700' },
  fuelCard: { backgroundColor: c.surfaceSecondary, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: c.border, marginBottom: 14 },

  // Game-Themed Ride Upgrade Component Styles (matching user mockup)
  gameUpgradeCard: {
    backgroundColor: '#FFFDF5',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  gameUpgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gameUpgradeTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: 0.3,
  },
  gameUpgradeSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  upgradeStageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  stageBoxCurrent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  stageBoxNext: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    position: 'relative',
  },
  stageBoxMaxed: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  stageNextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  stageLockIcon: {
    position: 'absolute',
    right: 4,
    top: -2,
  },
  stageBoxTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 4,
  },
  stageBikeArtWrapper: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  stageArrowWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  currentPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    marginTop: 4,
  },
  currentPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  nextPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  statComparisonRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statRowTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  statRowSubtitle: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
  },
  statValueOld: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#475569',
  },
  statValueNew: {
    fontSize: 12,
    fontWeight: '900',
    color: '#15803D',
  },
  percentBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  percentBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#15803D',
  },
  gameUpgradeBtn: {
    marginTop: 10,
    backgroundColor: '#FDE047',
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  gameUpgradeBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderBottomWidth: 2,
  },
  coinCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinCircleText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'Fredoka',
  },
  gameUpgradeBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: 0.3,
  },
  gameMaxedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  gameMaxedText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  unownedBikeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  unownedBikeText: {
    fontSize: 9.5,
    color: '#64748B',
    fontStyle: 'italic',
  },
  modalAction: { marginTop: 2 },
  phoneBtnHighlighted: { borderColor: '#E53E3E', borderWidth: 2, backgroundColor: c.butter },
  cornerRedDot: { position: 'absolute', top: -5, right: -5, width: 15, height: 15, borderRadius: 7.5, backgroundColor: '#E53E3E', borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#E53E3E', shadowOpacity: 0.9, shadowRadius: 6, elevation: 8 },
  messageAlertBox: { marginVertical: 6 },
  urgentPhoneBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E53E3E', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, borderWidth: 2, borderBottomWidth: 5, borderColor: c.onSurface, shadowColor: '#E53E3E', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  urgentPhoneIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  urgentPhoneTitle: { fontSize: 18, color: '#FFFFFF', letterSpacing: 0.5 },
  urgentPhoneSubtle: { fontSize: 11, color: '#FFF5F5', fontWeight: '700', marginTop: 2 },
  urgentPhonePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  urgentPhonePillText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' },
}));