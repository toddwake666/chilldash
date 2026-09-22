import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/src/theme';
import type { Point } from '@/src/game/api';

export function RiderSprite({ player, heading, bike, gear }: { player: Point; heading: number; bike: string; gear: string }) {
  const { colors: c } = useTheme();
  return <G testID={`player-rider-${bike}`} transform={`translate(${player.x},${player.y}) rotate(${heading})`}>
    <Ellipse cx="4" cy="5" rx="15" ry="21" fill={c.shadow} />
    {bike === 'bicycle' ? <>
      <Rect x="-2.5" y="-25" width="5" height="15" rx="2" fill={c.onSurface} />
      <Rect x="-2.5" y="12" width="5" height="15" rx="2" fill={c.onSurface} />
      <Path d="M0 -16V19 M-8 7H8 M-12 -14H12" stroke={c.teal} strokeWidth="4" />
      <Rect x="-8" y="6" width="4" height="9" rx="2" fill={c.onSurface} />
      <Rect x="4" y="-2" width="4" height="9" rx="2" fill={c.onSurface} />
    </> : (bike === 'ninja' || bike === 'viper') ? <>
      {/* Sportbike: Long slim tires & aerodynamic fairings */}
      <Rect x="-3" y="-26" width="6" height="17" rx="3" fill={c.onSurface} />
      <Rect x="-3.5" y="13" width="7" height="17" rx="3.5" fill={c.onSurface} />
      <Path
        d="M0 -22 L9 -12 L7 4 L5 23 L0 27 L-5 23 L-7 4 L-9 -12 Z"
        fill={bike === 'viper' ? '#DC2626' : '#059669'}
        stroke={c.onSurface}
        strokeWidth="1.5"
      />
      {bike === 'viper' && <Path d="M-13 -9 L-8 -11 M13 -9 L8 -11" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />}
      <Path d="M-6 -17 L-2 -19 M2 -19 L6 -17" stroke={bike === 'viper' ? '#FDE047' : '#6EE7B7'} strokeWidth="1.5" strokeLinecap="round" />
      <Rect x="6" y="8" width="3.5" height="13" rx="1.5" fill={c.onSurface} />
    </> : <>
      <Rect x="-4" y="-23" width="8" height="43" rx="4" fill={c.onSurface} />
      <Rect x="-9" y="-16" width="18" height="31" rx="8" fill={bike === 'express' ? c.coral : c.brand} stroke={c.onSurface} strokeWidth="1.5" />
      <Rect x="-11" y="8" width="22" height="16" rx="3" fill={bike === 'express' ? c.lavender : c.sky} stroke={c.onSurface} strokeWidth="1.5" />
    </>}
    <Path d="M-13 -9H13" stroke={c.onSurface} strokeWidth="3" strokeLinecap="round" />
    <Ellipse cx="0" cy="1" rx="10" ry="9" fill={gear === 'raincoat' ? c.brand : c.coral} />
    {bike === 'bicycle' && <Rect x="-6" y="0" width="12" height="10" rx="2" fill={c.sky} stroke={c.onSurface} strokeWidth="1" />}
    <Circle cx="0" cy="-7" r="8" fill={c.teal} stroke={c.onSurface} strokeWidth="1.5" />
    <Path d="M-5 -11Q0 -15 5 -11" stroke={c.mint} strokeWidth="2" fill="none" />
  </G>;
}