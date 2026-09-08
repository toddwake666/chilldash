import React, { MutableRefObject } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { makeStyles } from '@/src/theme';
import { Icon, Label } from './ui';
import type { Point } from '@/src/game/api';

// Keep the gesture instances mounted while the game redraws its world every frame.
export const RideControls = React.memo(function RideControls({ direction }: { direction: MutableRefObject<Point> }) {
  const s = useStyles();
  const stop = () => { direction.current = { x: 0, y: 0 }; };
  const pan = Gesture.Pan().runOnJS(true).onUpdate(e => { direction.current = { x: Math.max(-1, Math.min(1, e.translationX / 25)), y: Math.max(-1, Math.min(1, e.translationY / 25)) }; }).onFinalize(stop);
  const buttons = [{ id: 'up', x: 0, y: -1, icon: 'chevron-up', style: s.up }, { id: 'down', x: 0, y: 1, icon: 'chevron-down', style: s.down }, { id: 'left', x: -1, y: 0, icon: 'chevron-back', style: s.left }, { id: 'right', x: 1, y: 0, icon: 'chevron-forward', style: s.right }];
  return <View style={s.wrap}><View style={s.pad} testID="directional-controls">
    {buttons.map(b => <Pressable key={b.id} testID={`ride-${b.id}-button`} accessibilityRole="button" accessibilityLabel={`Ride ${b.id}`} onPressIn={() => { direction.current = { x: b.x, y: b.y }; }} onPressOut={stop} style={({ pressed }) => [s.arrow, b.style, pressed && s.pressed]}><Icon name={b.icon} size={26} /></Pressable>)}
    <GestureDetector gesture={pan}><View testID="ride-joystick" style={s.center}><View style={s.nub} /></View></GestureDetector>
  </View><Label style={s.label}>HOLD TO RIDE</Label></View>;
});
const useStyles = makeStyles(c => ({
  wrap: { alignItems: 'center' }, pad: { width: 156, height: 156, borderRadius: 78, backgroundColor: c.glass, borderWidth: 2, borderColor: c.surface, shadowColor: c.onSurface, shadowOpacity: .16, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  arrow: { position: 'absolute', width: 49, height: 49, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, up: { left: 52, top: 0 }, down: { left: 52, bottom: 0 }, left: { left: 0, top: 52 }, right: { right: 0, top: 52 },
  pressed: { backgroundColor: c.brand, transform: [{ scale: .92 }] }, center: { position: 'absolute', top: 54, left: 54, height: 44, width: 44, borderRadius: 22, backgroundColor: c.surfaceTertiary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border }, nub: { width: 16, height: 16, borderRadius: 8, backgroundColor: c.teal, borderWidth: 3, borderColor: c.mint },
  label: { fontSize: 8, letterSpacing: 1.8, marginTop: 8, color: c.onSurface, backgroundColor: c.glass, borderRadius: 5, paddingVertical: 3, paddingHorizontal: 9, fontWeight: '800' },
}));