import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '@/src/game/GameContext';
import { Garage } from '@/src/screens/Garage';
import { City } from '@/src/screens/City';
import { Overlays } from '@/src/components/Overlays';
import { Button, Icon, Label } from '@/src/components/ui';
import { makeStyles, useTheme } from '@/src/theme';

export default function Index() {
  const g = useGame(); const s = useStyles(); const { colors: c } = useTheme();
  if (g.loading || g.error || !g.profile) return <SafeAreaView style={s.loading}><View style={s.logo}><Icon name="moped" bike size={56} /></View><Label display style={s.title}>chill dash.</Label>{g.loading ? <><ActivityIndicator testID="game-loading" color={c.teal} style={s.spinner} /><Label style={s.note}>Opening your little corner of the city…</Label></> : <View style={s.error}><Label testID="game-load-error" style={s.note}>{g.error || 'Your save could not be loaded.'}</Label><Button testID="game-retry-button" title="LET’S TRY AGAIN" icon="refresh" onPress={g.initialize} /></View>}</SafeAreaView>;
  return <View style={s.root}>{g.screen === 'garage' ? <Garage /> : <City />}<Overlays /></View>;
}
const useStyles = makeStyles(c => ({ root: { flex: 1, backgroundColor: c.surface }, loading: { flex: 1, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', padding: 30 }, logo: { height: 100, width: 100, borderRadius: 30, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderBottomWidth: 5, borderColor: c.onSurface, transform: [{ rotate: '-5deg' }] }, title: { fontSize: 40, marginTop: 23, letterSpacing: -1.5 }, spinner: { marginTop: 25, marginBottom: 12 }, note: { fontSize: 13, lineHeight: 20, color: c.muted, textAlign: 'center', marginBottom: 20 }, error: { gap: 16, marginTop: 20 } }));