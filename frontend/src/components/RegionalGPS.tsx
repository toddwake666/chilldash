import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useGame } from '@/src/game/GameContext';
import { MAP, getRoute, region } from '@/src/game/world';
import { makeStyles, useTheme } from '@/src/theme';
import { MiniMap } from './CityWorld';
import { Button, Icon, Label } from './ui';

const landmarkIcon: Record<string, string> = {
  cinema: 'film-outline',
  mall: 'bag-outline',
  stadium: 'football-outline',
  station: 'train-outline',
  forest_dept: 'leaf-outline',
  park: 'happy-outline',
  barracks: 'flag-outline',
};

const TOWN_BOUNDS: Record<string, { vb: string; name: string; desc: string; highlights: string[] }> = {
  all: {
    vb: '0 -80 6300 4620',
    name: 'All Region',
    desc: 'The complete five-town county connected by highways, bridges, and railways.',
    highlights: ['3 Railway Stations', 'Ichhamati Railway Bridge', 'Jessore Forest Corridor', 'Bongaon Modern Apartments', 'Habra Residential Colony'],
  },
  habra: {
    vb: '1750 2200 2000 1950',
    name: 'Habra Town',
    desc: 'Thriving town featuring abundant residential houses, railway crossing gates, and active markets.',
    highlights: ['Habra Railway Station', 'Abhirup Residency', 'Habra Town Colony', 'Jessore Road Enclave', 'Station Road Crossings'],
  },
  bongaon: {
    vb: '3750 150 2400 1700',
    name: 'Bongaon Town',
    desc: 'Bustling commercial hub with multistory apartments, football stadium, and junction station.',
    highlights: ['Bongaon Junction Station', 'Shimultala Heights Apartments', 'Ichhamati Residency', 'Bongaon Football Stadium', 'Stadium Riverwalk'],
  },
  petrapole: {
    vb: '4250 2500 2050 1900',
    name: 'Petrapole Border',
    desc: 'Dynamic border zone featuring the international railway terminal, amusement park, and army barracks.',
    highlights: ['Petrapole Railway Station', 'Amusement Park & Ferris Wheel', 'Army Barracks Compound', 'Petrapole Garden Ring'],
  },
  forest: {
    vb: '4950 1600 1250 1250',
    name: 'Jessore Forest Highway',
    desc: 'Dense Sal & Banyan forest sanctuary flanking the scenic highway between Bongaon and Petrapole.',
    highlights: ['Bibhutibhushan Forest Sanctuary', 'Bongaon Forest Department', 'Lookout Watchtower', 'Highway Fuel & Air'],
  },
  pinecrest: {
    vb: '2100 50 1450 1450',
    name: 'Pinecrest',
    desc: 'Quiet cedar town nestled along the mountain foothills with shopping at Diamond Plaza.',
    highlights: ['Diamond Plaza Mall', 'Cedar Kitchen & Spoke House', 'Pine Trail', 'Riverside Drive'],
  },
  sunnyvale: {
    vb: '50 50 1350 1450',
    name: 'Sunnyvale',
    desc: 'Cozy coastal starter district where your home garage, Picturehouse cinema, and sunny cafés reside.',
    highlights: ['Your Garage', 'Sunshine Fuel & Air', 'Milo’s Bike Workshop', 'Sunnyvale Picturehouse', 'Sunshine Park'],
  },
};

function belongsToTown(
  place: { town?: string; address?: string; name?: string; id?: string },
  townKey: string
): boolean {
  if (townKey === 'all') return true;
  const str = `${place.town || ''} ${place.address || ''} ${place.name || ''} ${place.id || ''}`.toLowerCase();
  if (townKey === 'habra') {
    return str.includes('habra');
  }
  if (townKey === 'bongaon') {
    return (
      (str.includes('bongaon') ||
        str.includes('stadium') ||
        str.includes('junction') ||
        str.includes('riverbank') ||
        str.includes('revcat')) &&
      !str.includes('forest')
    );
  }
  if (townKey === 'petrapole') {
    return str.includes('petrapole') || str.includes('fairground');
  }
  if (townKey === 'forest') {
    return str.includes('forest') || str.includes('bibhutibhushan');
  }
  if (townKey === 'pinecrest') {
    return str.includes('pine') || str.includes('cedar') || str.includes('diamond');
  }
  if (townKey === 'sunnyvale') {
    return (
      str.includes('sunny') ||
      str.includes('garage') ||
      str.includes('palm street') ||
      str.includes('sunset road') ||
      str.includes('garden avenue')
    );
  }
  return false;
}

export function RegionalGPS() {
  const g = useGame(), s = useStyles(), { colors: c } = useTheme(), { width } = useWindowDimensions();
  const [selectedTown, setSelectedTown] = useState<string>('all');
  const [confirmTravel, setConfirmTravel] = useState<{ id: string; name: string; x: number; y: number; town: string } | null>(null);

  const target =
    g.destination ||
    (g.order?.status === 'accepted'
      ? g.order.pickup
      : g.order?.status === 'picked_up'
      ? g.order.dropoff
      : null);
  const activeTown = TOWN_BOUNDS[selectedTown] || TOWN_BOUNDS.all;

  const filteredServices = useMemo(() => {
    return (g.catalog?.services || []).filter(stop => belongsToTown(stop, selectedTown));
  }, [g.catalog?.services, selectedTown]);

  const filteredLandmarks = useMemo(() => {
    return (MAP?.landmarks || []).filter(l => belongsToTown(l, selectedTown));
  }, [selectedTown]);

  const filteredBridges = useMemo(() => {
    if (selectedTown === 'all') return MAP?.bridges || [];
    return (MAP?.bridges || []).filter(b => belongsToTown(b, selectedTown));
  }, [selectedTown]);

  const filteredGates = useMemo(() => {
    if (selectedTown === 'all') return MAP?.railway?.gates || [];
    return (MAP?.railway?.gates || []).filter(gate => belongsToTown(gate, selectedTown));
  }, [selectedTown]);

  return (
    <View testID="regional-gps-screen">
      <Label style={s.eyebrow}>INTERACTIVE GPS NAVIGATION · REGIONAL MAP</Label>
      <Label display style={s.title}>The open road ahead.</Label>
      <Label testID="gps-region-name" style={s.subtitle}>
        Current Location: {region(g.position.current)} · Viewing: {activeTown.name}
      </Label>

      {/* Town Quick-Focus Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillScroll}>
        {Object.entries(TOWN_BOUNDS).map(([key, info]) => {
          const active = selectedTown === key;
          return (
            <Pressable
              key={key}
              testID={`gps-filter-${key}`}
              style={[s.pill, active && s.pillActive]}
              onPress={() => setSelectedTown(key)}
            >
              <Label style={[s.pillText, active && s.pillTextActive]}>{info.name}</Label>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Map Container */}
      <View style={s.map}>
        <MiniMap
          large
          player={g.position.current}
          target={target}
          route={target ? getRoute(g.position.current, target) : []}
          size={Math.min(width - 108, 340)}
          viewBoxOverride={activeTown.vb}
        />
      </View>

      {/* Legend */}
      <View style={s.legend}>
        <View style={s.legendItem}><View style={s.dot} /><Label style={s.tiny}>You</Label></View>
        <View style={s.legendItem}><View style={[s.dot, { backgroundColor: c.brand }]} /><Label style={s.tiny}>Destination</Label></View>
        <View style={s.legendItem}><Icon name="train-outline" size={14} color={c.teal} /><Label style={s.tiny}>Railway & Gates</Label></View>
        <View style={s.legendItem}><Icon name="leaf-outline" size={14} color={c.teal} /><Label style={s.tiny}>Forest Corridor</Label></View>
      </View>

      {target && (
        <View style={s.route}>
          <Icon name="navigate-outline" color={c.teal} size={20} />
          <View style={{ flex: 1 }}>
            <Label style={s.placeName}>{target.name}</Label>
            <Label style={s.tiny}>{target.address}</Label>
          </View>
        </View>
      )}

      <Button
        testID="gps-back-to-ride-button"
        title={g.screen === 'garage' ? 'HEAD OUT & EXPLORE' : 'BACK TO THE RIDE'}
        icon="arrow-forward"
        onPress={() => {
          g.setPhone(false);
          if (g.screen === 'garage') g.headOut();
        }}
      />
      {g.destination && (
        <Button
          testID="clear-service-route-button"
          title="CLEAR EXPLORATION ROUTE"
          secondary
          onPress={() => g.setDestination(null)}
          style={{ marginTop: 10 }}
        />
      )}

      {/* Services (Fuel, Workshop, Garage) */}
      {filteredServices.length > 0 && (
        <>
          <Label display style={s.section}>
            {selectedTown === 'all' ? 'Fuel, fixes & a little rest' : `Fuel & Services in ${activeTown.name}`}
          </Label>
          {filteredServices.map(stop => (
            <Pressable
              testID={`gps-service-${stop.id}`}
              key={stop.id}
              style={({ pressed }) => [s.place, pressed && s.pressed]}
              onPress={() => g.navigateTo(stop)}
            >
              <View style={s.icon}>
                <Icon
                  name={stop.kind === 'garage' ? 'home-outline' : stop.kind === 'fuel' ? 'water-outline' : 'construct-outline'}
                  color={c.teal}
                  size={21}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label style={s.placeName}>{stop.name}</Label>
                <Label style={s.tiny}>{stop.address}</Label>
              </View>
              <Icon name="navigate-outline" size={17} color={c.teal} />
            </Pressable>
          ))}
        </>
      )}

      {/* Major Landmarks & Stations */}
      {filteredLandmarks.length > 0 && (
        <>
          <Label display style={s.section}>
            {selectedTown === 'all' ? 'Places worth the detour' : `Landmarks & Stations in ${activeTown.name}`}
          </Label>
          <Label style={s.subtitle}>
            {g.profile?.online
              ? '🔒 Quick Travel is locked while online. Toggle offline in your phone to fast-travel.'
              : '⚡ Quick Travel available! Tap Travel to instantly ride to any landmark.'}
          </Label>
          {filteredLandmarks.map(l => (
            <Pressable
              testID={`gps-landmark-${l.id}`}
              key={l.id}
              style={({ pressed }) => [s.place, pressed && s.pressed]}
              onPress={() => g.navigateTo({ id: l.id, name: l.name, kind: l.kind, address: `${l.town} · ${l.description}`, ...l.entrance })}
            >
              <View style={s.icon}>
                <Icon name={landmarkIcon[l.kind] || 'star-outline'} color={c.teal} size={21} />
              </View>
              <View style={{ flex: 1 }}>
                <Label style={s.placeName}>{l.name}</Label>
                <Label style={s.tiny}>
                  {l.town} · {l.kind === 'station' ? 'Railway Station' : l.kind === 'forest_dept' ? 'Forest Range Post' : l.kind.toUpperCase()}
                </Label>
              </View>
              <View style={s.actionRow}>
                <Pressable
                  testID={`quick-travel-${l.id}`}
                  style={[s.quickTravelBtn, g.profile?.online && s.quickTravelBtnLocked]}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (g.profile?.online) {
                      g.notify('Quick Travel is offline-only. Toggle offline in your phone.');
                    } else {
                      setConfirmTravel({ id: l.id, name: l.name, x: l.entrance.x, y: l.entrance.y, town: l.town });
                    }
                  }}
                >
                  <Icon
                    name={g.profile?.online ? 'lock-closed' : 'flash'}
                    size={11}
                    color={g.profile?.online ? c.muted : c.onSurface}
                  />
                  <Label style={[s.quickTravelText, g.profile?.online && s.quickTravelTextLocked]}>
                    {g.profile?.online ? 'OFFLINE ONLY' : 'TRAVEL · 30 🪙'}
                  </Label>
                </Pressable>
                <Icon name="navigate-outline" size={17} color={c.teal} />
              </View>
            </Pressable>
          ))}
        </>
      )}

      {/* Railway Crossings & Gates */}
      {filteredGates.length > 0 && (
        <>
          <Label display style={s.section}>
            {selectedTown === 'all' ? 'Railway Crossings & Gates' : `Railway Gates in ${activeTown.name}`}
          </Label>
          <Label style={s.subtitle}>Gates close before trains arrive. Riders, cars and bikes all wait until the train clears.</Label>
          {filteredGates.map(gate => (
            <Pressable
              testID={`gps-gate-${gate.id}`}
              key={gate.id}
              style={({ pressed }) => [s.place, pressed && s.pressed]}
              onPress={() => g.navigateTo({ id: gate.id, name: gate.name, kind: 'railway', address: 'Wait behind the barrier · Railway Gate', x: gate.x + 48, y: gate.y - 135 })}
            >
              <View style={s.icon}>
                <Icon name="train-outline" color={c.teal} size={21} />
              </View>
              <View style={{ flex: 1 }}>
                <Label style={s.placeName}>{gate.name}</Label>
                <Label style={s.tiny}>Automatic boom barriers · Flashing warning signal</Label>
              </View>
              <Icon name="navigate-outline" size={17} color={c.teal} />
            </Pressable>
          ))}
        </>
      )}

      {/* River Crossings */}
      {filteredBridges.length > 0 && (
        <>
          <Label display style={s.section}>
            {selectedTown === 'all' ? 'Across Ichhamati River' : `River Crossings near ${activeTown.name}`}
          </Label>
          {filteredBridges.map(b => (
            <Pressable
              testID={`gps-bridge-${b.id}`}
              key={b.id}
              style={({ pressed }) => [s.place, pressed && s.pressed]}
              onPress={() => g.navigateTo({ id: b.id, name: b.name, kind: 'bridge', address: 'Crossing · Ichhamati River', x: b.x, y: b.y + 48 })}
            >
              <View style={s.icon}>
                <Icon name={b.kind === 'railway_bridge' ? 'train-outline' : 'git-merge-outline'} color={c.teal} size={21} />
              </View>
              <View style={{ flex: 1 }}>
                <Label style={s.placeName}>{b.name}</Label>
                <Label style={s.tiny}>
                  {b.kind === 'railway_bridge' ? 'Steel truss rail crossing connecting Habra to Petrapole' : 'A safe road crossing over the winding river'}
                </Label>
              </View>
              <Icon name="navigate-outline" size={17} color={c.teal} />
            </Pressable>
          ))}
        </>
      )}

      {/* Quick Travel Confirmation Modal */}
      {confirmTravel && (
        <Modal transparent animationType="fade" visible={true} onRequestClose={() => setConfirmTravel(null)}>
          <Pressable style={s.modalOverlay} onPress={() => setConfirmTravel(null)}>
            <Pressable style={s.modalCard} onPress={e => e.stopPropagation()}>
              <View style={s.modalHeader}>
                <View style={s.modalIconWrap}>
                  <Icon name="flash" size={24} color={c.onSurface} />
                </View>
                <View style={{ flex: 1 }}>
                  <Label display style={s.modalTitle}>Quick Travel</Label>
                  <Label style={s.modalSubtitle}>{confirmTravel.name}</Label>
                </View>
              </View>

              <View style={s.modalBody}>
                <Label style={s.modalDesc}>
                  Transport directly to the nearest road entrance of {confirmTravel.name} in {confirmTravel.town.toUpperCase()}.
                </Label>

                <View style={s.modalCostRow}>
                  <View style={s.modalCostItem}>
                    <Label style={s.modalCostCaption}>TRIP FARE</Label>
                    <Label display style={s.modalCostValue}>30 Coins</Label>
                  </View>
                  <View style={s.modalCostDivider} />
                  <View style={s.modalCostItem}>
                    <Label style={s.modalCostCaption}>YOUR BALANCE</Label>
                    <Label display style={[s.modalCostValue, (g.profile?.balance || 0) < 30 && { color: c.error }]}>
                      {g.profile?.balance || 0} Coins
                    </Label>
                  </View>
                </View>

                {g.profile?.online && (
                  <View style={s.modalWarn}>
                    <Icon name="lock-closed" size={14} color="#DC2626" />
                    <Label style={s.modalWarnText}>Quick Travel is offline-only. Toggle offline in your phone.</Label>
                  </View>
                )}

                {(g.profile?.balance || 0) < 30 && !g.profile?.online && (
                  <View style={s.modalWarn}>
                    <Icon name="alert-circle" size={14} color="#DC2626" />
                    <Label style={s.modalWarnText}>Not enough coins. You need at least 30 coins for Quick Travel.</Label>
                  </View>
                )}
              </View>

              <View style={s.modalActions}>
                <Pressable
                  testID="cancel-quick-travel-button"
                  style={s.modalCancelBtn}
                  onPress={() => setConfirmTravel(null)}
                >
                  <Label style={s.modalCancelText}>CANCEL</Label>
                </Pressable>
                <Pressable
                  testID="confirm-quick-travel-button"
                  style={[
                    s.modalConfirmBtn,
                    (g.profile?.online || (g.profile?.balance || 0) < 30) && s.modalBtnDisabled,
                  ]}
                  disabled={g.profile?.online || (g.profile?.balance || 0) < 30}
                  onPress={() => {
                    const target = confirmTravel;
                    setConfirmTravel(null);
                    g.quickTravel(target);
                  }}
                >
                  <Icon name="flash" size={16} color={c.onSurface} />
                  <Label style={s.modalConfirmText}>TRAVEL · 30 COINS</Label>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const useStyles = makeStyles(c => ({
  eyebrow: { fontSize: 8, letterSpacing: 1, color: c.teal, fontWeight: '800', marginBottom: 7 },
  title: { fontSize: 25, marginBottom: 4 },
  subtitle: { fontSize: 11, lineHeight: 18, color: c.muted, marginBottom: 12 },
  pillScroll: { gap: 8, paddingBottom: 10 },
  pill: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.border },
  pillActive: { backgroundColor: c.teal, borderColor: c.teal },
  pillText: { fontSize: 11, fontWeight: '700', color: c.onSurface },
  pillTextActive: { color: c.surface },
  map: { borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: c.onSurface, alignItems: 'center', backgroundColor: c.treeLight, position: 'relative' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickTravelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.brand, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: c.onSurface },
  quickTravelBtnLocked: { backgroundColor: c.surfaceTertiary, borderColor: c.border },
  quickTravelText: { fontSize: 9, fontWeight: '800', color: c.onSurface },
  quickTravelTextLocked: { color: c.muted },
  legend: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'space-between', marginVertical: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.teal },
  tiny: { fontSize: 9, lineHeight: 15, color: c.muted },
  section: { fontSize: 21, marginTop: 23, marginBottom: 9 },
  place: { minHeight: 62, flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border },
  placeName: { fontSize: 12, fontWeight: '800', marginBottom: 3 },
  icon: { height: 35, width: 35, borderRadius: 12, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' },
  route: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  pressed: { opacity: 0.65 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: c.surface, borderRadius: 24, padding: 22, borderWidth: 2, borderColor: c.onSurface, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  modalIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: c.onSurface },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalSubtitle: { fontSize: 12, color: c.teal, fontWeight: '700' },
  modalBody: { gap: 12, marginBottom: 20 },
  modalDesc: { fontSize: 12, lineHeight: 18, color: c.muted },
  modalCostRow: { flexDirection: 'row', backgroundColor: c.surfaceSecondary, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
  modalCostItem: { flex: 1, alignItems: 'center' },
  modalCostCaption: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: c.muted, marginBottom: 2 },
  modalCostValue: { fontSize: 16, fontWeight: '800', color: c.onSurface },
  modalCostDivider: { width: 1, height: 28, backgroundColor: c.border },
  modalWarn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  modalWarnText: { fontSize: 10.5, color: '#DC2626', fontWeight: '700', flex: 1 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: c.border, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceSecondary },
  modalCancelText: { fontSize: 12, fontWeight: '800', color: c.muted },
  modalConfirmBtn: { flex: 1.6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: c.onSurface, backgroundColor: c.brand },
  modalConfirmText: { fontSize: 12, fontWeight: '900', color: c.onSurface },
  modalBtnDisabled: { opacity: 0.45, backgroundColor: c.surfaceTertiary, borderColor: c.border },
}));