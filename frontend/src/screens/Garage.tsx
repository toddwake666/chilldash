import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '@/src/theme';
import { useGame } from '@/src/game/GameContext';
import { BIKES, gameTime } from '@/src/game/world';
import { Button, Coin, Icon, IconButton, Label } from '@/src/components/ui';
import { BikeArt } from '@/src/components/BikeArt';

const GARAGE_ART = 'https://static.prod-images.emergentagent.com/jobs/75111ac8-73b5-4504-aea4-61f6ed4fc578/images/722a433e5622312b920fdc673a8f805df227e52de43f8e8e6023b9858499e8a7.jpeg';
export function Garage() {
  const s = useStyles(); const { colors: c } = useTheme(); const g = useGame(); const inset = useSafeAreaInsets();
  const p = g.profile!;
  const hour = g.clock.current / 60;
  return <SafeAreaView edges={['top']} style={s.page}>
    <View style={s.header} testID="garage-header">
      <View style={s.brand}><View style={s.brandIcon}><Icon name="moped" bike size={27} /></View><Label display style={s.brandText}>chill dash<Label style={s.brandDot}>.</Label></Label></View>
      <Pressable testID="garage-wallet-button" accessibilityRole="button" accessibilityLabel="Open wallet" onPress={() => g.openPhone('wallet')} style={({ pressed }) => [s.wallet, pressed && { opacity: .65 }]}><Coin amount={p.balance} small /><Icon name="add" size={16} /></Pressable>
    </View>
    <ScrollView testID="garage-scroll" showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <View style={s.titleRow}><View><Label style={s.eyebrow}>YOUR LITTLE CORNER OF THE CITY</Label><Label testID="garage-title" display style={s.heading}>Good {hour >= 18 || hour < 5 ? 'evening' : hour >= 12 ? 'afternoon' : 'morning'}, rider.</Label></View><IconButton testID="help-button" name="help" onPress={() => g.setPanel('help')} label="How to play" style={s.help} /></View>
        <Label style={s.subtitle}>New streets. Little adventures. Your own pace.</Label>
        <View style={s.artCard} testID="garage-illustration">
          <Image source={{ uri: GARAGE_ART }} style={s.art} contentFit="cover" transition={250} accessibilityLabel="Your sunny garage, delivery boy and yellow scooter" />
          <View style={s.artTop}><View style={s.location}><View style={s.dot} /><Label style={s.locationText}>HOME SWEET GARAGE</Label></View><View style={s.time}><Icon name={hour >= 18 || hour < 5 ? 'moon-outline' : 'sunny-outline'} size={16} /><Label style={s.locationText}>{gameTime(g.clock.current)}</Label></View></View>
          <View style={s.artBottom}><Icon name="location" size={14} color={c.surface} /><Label style={s.artCaption}>Sunnyvale • Your apartment</Label></View>
        </View>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(100).duration(450)}>
        <View style={s.sectionRow}><Label display style={s.sectionTitle}>Pick your ride</Label><Label style={s.sectionNote}>A trusty steed for every street</Label></View>
        <View style={s.bikes}>
          {BIKES.map(b => { const owned = p.owned_bikes.includes(b.id); const selected = p.bike === b.id; return <Pressable key={b.id} testID={`select-bike-${b.id}`} accessibilityRole="button" accessibilityState={{ selected }} disabled={g.busy} onPress={() => owned ? g.equip(b.id, p.gear) : g.purchase(b.id)} style={({ pressed }) => [s.bikeCard, selected && s.bikeSelected, pressed && { transform: [{ scale: .96 }] }]}>
            <View style={s.bikeTop}>{selected ? <View style={s.check}><Icon name="checkmark" size={12} /></View> : <View style={s.unchecked}>{!owned && <Icon name="lock-closed" size={12} color={c.muted} />}</View>}{!owned && <Coin amount={b.cost} small />}</View>
            <BikeArt type={b.id} width={96} height={57} />
            <Label display style={s.bikeName} numberOfLines={1}>{b.name}</Label>
            <Label style={s.bikeNote}>{selected ? 'READY TO ROLL' : owned ? b.stat : 'Unlock with coins'}</Label>
          </Pressable>; })}
        </View>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(180).duration(450)}>
        <View style={s.sectionRow}><Label display style={s.sectionTitle}>The essentials</Label><Label style={s.sectionNote}>Look good. Deliver better.</Label></View>
        <Pressable testID="gear-button" onPress={() => g.setPanel('gear')} style={({ pressed }) => [s.gear, pressed && { opacity: .7 }]}>
          <View style={s.gearIcon}><Icon name="bag-handle-outline" size={23} color={c.teal} /></View><View style={s.gearText}><Label style={s.gearTitle}>{p.gear === 'raincoat' ? 'Rain-ready kit' : 'Everyday kit'}</Label><Label style={s.gearNote}>{p.gear === 'raincoat' ? 'Helmet, thermal bag & raincoat' : 'Helmet on. Delivery bag packed.'}</Label></View><View style={s.equipped}><Label style={s.equippedText}>Equipped</Label></View><Icon name="chevron-forward" size={16} />
        </Pressable>
      </Animated.View>
      <View style={s.progress} testID="rider-progress"><Icon name="sparkles-outline" size={17} color={c.teal} /><Label style={s.progressLabel}>Level {Math.floor(p.xp / 100) + 1} · {p.deliveries ? 'Finding your rhythm' : 'Every great rider starts somewhere'}</Label><Label style={s.xp}>{p.xp % 100}/100 XP</Label></View>
    </ScrollView>
    <View style={[s.footer, { paddingBottom: Math.max(inset.bottom, 14) }]}>
      <Button testID="head-out-button" title={g.order && g.order.status !== 'offered' ? 'CONTINUE YOUR DELIVERY' : 'LET’S HIT THE STREETS'} icon="arrow-forward" onPress={g.headOut} loading={g.busy} />
      <View style={s.footerNote}><View style={[s.dot, { backgroundColor: c.teal }]} /><Label style={s.footerText}>No rush. The city is yours to explore.</Label></View>
    </View>
  </SafeAreaView>;
}
const useStyles = makeStyles(c => ({
  page: { flex: 1, backgroundColor: c.surface },
  header: { height: 70, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: c.border },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 }, brandIcon: { width: 39, height: 37, borderRadius: 12, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }], borderWidth: 1.5, borderColor: c.onSurface },
  brandText: { fontSize: 26, letterSpacing: -.9 }, brandDot: { color: c.teal, fontSize: 30 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 40, paddingHorizontal: 11, backgroundColor: c.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: c.border },
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
  bikes: { flexDirection: 'row', gap: 9 }, bikeCard: { flex: 1, alignItems: 'center', paddingVertical: 8, borderWidth: 1.5, borderColor: c.border, borderRadius: 14, backgroundColor: c.surfaceSecondary, overflow: 'hidden' },
  bikeSelected: { borderColor: c.onSurface, backgroundColor: c.butter }, bikeTop: { height: 18, alignSelf: 'stretch', marginHorizontal: 7, flexDirection: 'row', justifyContent: 'space-between' },
  check: { width: 17, height: 17, backgroundColor: c.brand, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.onSurface }, unchecked: { width: 17, height: 17 },
  bikeName: { fontSize: 13, marginTop: 2 }, bikeNote: { fontSize: 7.5, color: c.muted, marginTop: 4, fontWeight: '700', marginBottom: 2 },
  gear: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: c.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: c.border },
  gearIcon: { height: 37, width: 37, borderRadius: 11, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' }, gearText: { flex: 1 }, gearTitle: { fontSize: 12, fontWeight: '800' }, gearNote: { fontSize: 9.5, color: c.muted, marginTop: 3 },
  equipped: { paddingVertical: 4, paddingHorizontal: 7, borderRadius: 5, backgroundColor: c.mint }, equippedText: { fontSize: 8, color: c.teal, fontWeight: '800' },
  progress: { flexDirection: 'row', gap: 6, marginTop: 18, marginBottom: 8, alignItems: 'center' }, progressLabel: { fontSize: 9, flex: 1, color: c.muted }, xp: { fontSize: 9, color: c.teal, fontWeight: '800' },
  footer: { paddingHorizontal: 22, paddingTop: 12, borderTopWidth: 1, borderColor: c.border, backgroundColor: c.surface }, footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 9 }, footerText: { fontSize: 9, color: c.muted },
}));