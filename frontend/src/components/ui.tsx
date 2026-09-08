import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { makeStyles, useTheme } from '@/src/theme';

export function Label({ children, style, testID, display = false, numberOfLines }: { children: React.ReactNode; style?: StyleProp<TextStyle>; testID?: string; display?: boolean; numberOfLines?: number }) {
  const s = useStyles();
  return <Text testID={testID} numberOfLines={numberOfLines} style={[s.text, display && s.display, style]}>{children}</Text>;
}
export function Icon({ name, size = 22, color, bike = false }: { name: string; size?: number; color?: string; bike?: boolean }) {
  const { colors } = useTheme();
  return bike ? <MaterialCommunityIcons name={name as any} size={size} color={color || colors.onSurface} /> : <Ionicons name={name as any} size={size} color={color || colors.onSurface} />;
}
export function Button({ title, onPress, testID, icon, secondary, disabled, loading, style }: { title: string; onPress: () => void; testID: string; icon?: string; secondary?: boolean; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle> }) {
  const s = useStyles(); const { colors } = useTheme();
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, style, (disabled || loading) && s.disabled, pressed && s.pressed]}>
    {loading ? <ActivityIndicator color={colors.onSurface} /> : <><Label style={s.buttonText}>{title}</Label>{icon && <Icon name={icon} size={22} />}</>}
  </Pressable>;
}
export function IconButton({ name, onPress, testID, style, label }: { name: string; onPress: () => void; testID: string; style?: StyleProp<ViewStyle>; label?: string }) {
  const s = useStyles();
  return <Pressable testID={testID} accessibilityLabel={label || name} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.iconButton, style, pressed && s.pressed]}><Icon name={name} /></Pressable>;
}
export function Coin({ amount, small = false }: { amount: number | string; small?: boolean }) {
  const s = useStyles();
  return <View style={s.coinRow}><View style={[s.coin, small && s.coinSmall]}><Label style={s.coinSymbol}>C</Label></View><Label display style={{ fontSize: small ? 15 : 20 }}>{amount}</Label></View>;
}
const useStyles = makeStyles(c => ({
  text: { fontFamily: 'Nunito', fontSize: 14, color: c.onSurface },
  display: { fontFamily: 'Fredoka' },
  button: { minHeight: 56, borderRadius: 18, backgroundColor: c.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 20, borderWidth: 1.5, borderBottomWidth: 4, borderColor: c.borderStrong },
  buttonText: { fontSize: 16, fontWeight: '800', letterSpacing: .5, flexShrink: 1, textAlign: 'center' },
  secondary: { backgroundColor: c.surface, borderColor: c.border },
  disabled: { opacity: .5 },
  pressed: { opacity: .75, transform: [{ scale: .97 }] },
  iconButton: { height: 44, width: 44, borderRadius: 15, backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
  coinRow: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  coin: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.onSurface },
  coinSmall: { width: 18, height: 18 },
  coinSymbol: { fontFamily: 'Fredoka', fontSize: 13 },
}));