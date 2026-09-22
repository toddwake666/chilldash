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
      </> : type === 'ninja' ? <>
        {/* Shadow Ninja: 500cc Twin Sportbike (Emerald Green / Dark Stealth) */}
        <Path d="M33 63 L66 52 M104 22 L119 63" fill="none" stroke={c.onSurface} strokeWidth="3.5" />
        <Path d="M58 56 L42 49 L25 43" fill="none" stroke={c.onSurface} strokeWidth="4.5" />
        <Path d="M42 49 L25 43" fill="none" stroke={c.muted} strokeWidth="2.5" />
        <Path d="M26 34 Q36 32 46 36 L62 42 Q74 27 94 27 Q105 27 114 18 L126 23 L132 35 L121 44 L110 44 L90 59 L68 59 L54 50 Z" fill="#059669" />
        <Path d="M68 56 L88 56 L104 46 L76 46 Z" fill="#1F2937" />
        <Path d="M106 20 L118 11 L124 19 Z" fill={c.sky} opacity={0.85} stroke={c.onSurface} strokeWidth="1.5" />
        <Path d="M104 19 L97 22" fill="none" stroke={c.onSurface} strokeWidth="2.5" />
        <Path d="M125 31 L131 35 L126 38" fill="none" stroke={c.brand} strokeWidth="2" />
        <Rect x="50" y="37" width="22" height="6" rx="3" fill={c.onSurface} />
      </> : type === 'viper' ? <>
        {/* Viper RR: 1000cc Racing Superbike (Crimson / Gold Inverted Forks) */}
        <Path d="M33 63 L65 50" fill="none" stroke={c.onSurface} strokeWidth="4" />
        <Path d="M104 19 L119 63" fill="none" stroke="#F59E0B" strokeWidth="3.5" />
        <Path d="M54 53 L38 43 L20 37" fill="none" stroke={c.onSurface} strokeWidth="5" />
        <Path d="M38 43 L20 37" fill="none" stroke="#DC2626" strokeWidth="2" />
        <Path d="M22 27 Q34 26 44 32 L58 40 Q70 24 95 24 Q106 24 116 16 L128 21 L135 32 L124 42 L112 43 L94 58 L70 58 L54 48 Z" fill="#DC2626" />
        <Path d="M70 55 L92 55 L108 44 L78 44 Z" fill="#111827" />
        <Path d="M117 33 L126 36 L122 39" fill="#111827" stroke={c.onSurface} strokeWidth="1.5" />
        <Path d="M108 18 L120 9 L126 18 Z" fill="#FEE2E2" opacity={0.8} stroke={c.onSurface} strokeWidth="1.5" />
        <Path d="M105 17 L98 20" fill="none" stroke={c.onSurface} strokeWidth="2.5" />
        <Path d="M128 28 L134 32 L129 35" fill="none" stroke="#FDE047" strokeWidth="2" />
        <Path d="M22 27 L44 32 L40 37 L22 34 Z" fill="#991B1B" />
        <Rect x="48" y="35" width="20" height="5" rx="2.5" fill={c.onSurface} />
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