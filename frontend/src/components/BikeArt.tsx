import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/src/theme';

export function BikeArt({ type = 'scooter', width = 105, height = 66 }: { type?: string; width?: number; height?: number }) {
  const { colors: c } = useTheme();
  const color = type === 'express' ? c.coral : c.brand;
  return <Svg width={width} height={height} viewBox="0 0 150 90">
    <Ellipse cx="77" cy="78" rx="59" ry="6" fill={c.shadow} />
    <G stroke={c.onSurface} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
      <Circle cx="33" cy="63" r="19" fill={c.onSurface} /><Circle cx="119" cy="63" r="19" fill={c.onSurface} />
      <Circle cx="33" cy="63" r="11" fill={c.surface} /><Circle cx="119" cy="63" r="11" fill={c.surface} />
      {type === 'bicycle' ? <>
        <Path d="M33 63 L55 29 L78 63 Z M55 29 L103 29 L78 63 M96 16 L119 63 M48 25 L65 25 M94 16 L108 16" fill="none" stroke={c.teal} strokeWidth="4" />
        <Circle cx="78" cy="63" r="5" fill={c.onSurface} /><Path d="M78 63L84 71L91 71" fill="none" />
      </> : <>
        <Path d="M14 58 Q20 32 52 40 L62 58 L89 58 L103 26 L109 16 L120 18 L115 43 Q135 44 139 57 L123 56 L105 64 L59 65 L53 52 L23 59 Z" fill={color} />
        <Path d="M58 45 L81 45 L95 23 L103 26" fill="none" />
        <Rect x="36" y="34" width="42" height="8" rx="4" fill={c.wood} />
        <Path d="M105 17L100 9L90 9" fill="none" /><Circle cx="118" cy="23" r="5" fill={c.surface} />
        <Rect x="12" y="15" width="31" height="24" rx="4" fill={type === 'express' ? c.lavender : c.sky} />
        <Path d="M21 15L21 10L34 10L34 15 M26 24L32 24 M107 43L117 45" fill="none" strokeWidth="2" />
      </>}
    </G>
  </Svg>;
}