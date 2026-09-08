import React from 'react';
import { View } from 'react-native';
import { useGame } from '@/src/game/GameContext';
import { makeStyles, useTheme } from '@/src/theme';
import { Icon, Label } from './ui';

/** Full stats are intentionally restricted to Phone → Care. */
export function Vitals() {
  const g = useGame(), s = useStyles(), { colors: c } = useTheme();
  const p = g.profile!, bike = p.bikes[p.bike];
  const rows = [{ id: 'health', label: 'Health', icon: 'heart', value: p.health }, { id: 'energy', label: 'Energy', icon: 'flash', value: p.energy }, { id: 'hunger', label: 'Hunger', icon: 'restaurant', value: p.hunger }, { id: 'condition', label: 'Bike', icon: 'construct', value: bike.condition }, { id: 'resource', label: p.bike === 'bicycle' ? 'Air' : 'Fuel', icon: p.bike === 'bicycle' ? 'speedometer' : 'water', value: p.bike === 'bicycle' ? bike.air : bike.fuel }];
  return <View testID="care-detailed-stats" style={s.card}>
    {rows.map(r => <View key={r.id} style={s.row}><Icon name={r.icon} size={17} color={r.value <= 20 ? c.error : c.teal} /><Label style={s.name}>{r.label}</Label><View style={s.track}><View style={[s.fill, { width: `${Math.max(0, Math.min(100, r.value))}%`, backgroundColor: r.value <= 20 ? c.error : r.value <= 40 ? c.brand : c.teal }]} /></View><Label testID={`stat-${r.id}`} style={s.value}>{Math.ceil(r.value)}</Label></View>)}
  </View>;
}
const useStyles = makeStyles(c => ({ card: { padding: 15, gap: 12, backgroundColor: c.surfaceSecondary, borderRadius: 17, borderWidth: 1, borderColor: c.border }, row: { flexDirection: 'row', alignItems: 'center', gap: 6 }, name: { fontSize: 12, width: 46 }, track: { flex: 1, height: 5, borderRadius: 4, backgroundColor: c.surfaceTertiary, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 4 }, value: { fontSize: 12, width: 24, textAlign: 'right', fontWeight: '800' } }));