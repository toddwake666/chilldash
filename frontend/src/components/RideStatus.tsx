import React, { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { useGame } from '@/src/game/GameContext';
import { makeStyles, useTheme } from '@/src/theme';
import { Icon, Label } from './ui';

/** Only the two essentials live on the road; the complete breakdown lives in Care. */
export function RideStatus() {
  const g = useGame(), s = useStyles(), { colors: c } = useTheme();
  const p = g.profile!, bike = p.bikes[p.bike], bicycle = p.bike === 'bicycle';
  const resource = bicycle ? bike.air : bike.fuel;
  const rainRisk = p.weather === 'rainy' && p.gear !== 'raincoat';
  const healthAttention = p.health < 25 || p.hunger < 15 || p.energy < 20 || rainRisk;
  const bikeAttention = resource < 20 || bike.condition < 25;
  const warning = p.dead ? '' : p.health < 25 ? 'Health is low. Tap the heart for food or directions home.'
    : p.hunger < 15 ? 'Your rider is hungry. Tap the heart to open Care.'
    : p.energy < 20 ? 'Energy is low. Tap the heart for food or a rest stop.'
    : bike.condition < 25 ? 'Your bike needs repairs. Tap the fuel/air indicator for help.'
    : resource < 20 ? `${bicycle ? 'Tire air' : 'Fuel'} is low. Tap its indicator to find a station.`
    : rainRisk ? 'Rain is draining health. Put on your rain kit from the phone.' : '';
  const lastWarning = useRef('');
  useEffect(() => {
    if (warning && warning !== lastWarning.current) g.notify(warning);
    lastWarning.current = warning;
  }, [warning, g.notify]);
  return <View testID="ride-status-indicators" style={s.row}>
    <Pressable testID="hud-health-button" accessibilityRole="button" accessibilityLabel={`Health ${Math.ceil(p.health)} percent. Open detailed stats.`} onPress={() => g.openPhone('care')} style={({ pressed }) => [s.indicator, pressed && s.pressed]}>
      <Icon name="heart" size={17} color={p.health < 25 ? c.error : c.teal} />
      <Label testID="hud-health-value" style={[s.value, p.health < 25 && s.low]}>{Math.ceil(p.health)}<Label style={s.percent}>%</Label></Label>
      {healthAttention && <View testID="hud-health-warning" style={s.warningDot} />}
    </Pressable>
    <Pressable testID="hud-resource-button" accessibilityRole="button" accessibilityLabel={`${bicycle ? 'Tire air' : 'Fuel'} ${Math.ceil(resource)} percent. Open detailed stats.`} onPress={() => g.openPhone('care')} style={({ pressed }) => [s.indicator, pressed && s.pressed]}>
      <Icon name={bicycle ? 'speedometer-outline' : 'gas-station-outline'} bike={!bicycle} size={17} color={resource < 20 ? c.error : c.teal} />
      <Label testID="hud-resource-value" style={[s.value, resource < 20 && s.low]}>{Math.ceil(resource)}<Label style={s.percent}>%</Label></Label>
      {bikeAttention && <View testID="hud-resource-warning" style={s.warningDot} />}
    </Pressable>
  </View>;
}
const useStyles = makeStyles(c => ({
  row: { flexDirection: 'row', gap: 6 },
  indicator: { height: 44, minWidth: 65, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 8, borderRadius: 14, backgroundColor: c.glass, borderWidth: 1.5, borderColor: c.surface },
  value: { fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  percent: { fontSize: 8, color: c.muted }, low: { color: c.error },
  warningDot: { position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: 3, backgroundColor: c.error },
  pressed: { opacity: .7, transform: [{ scale: .95 }] },
}));