import React, { memo } from 'react';
import { Circle, Ellipse, G, Rect } from 'react-native-svg';
import { useTheme } from '@/src/theme';
import type { Pedestrian } from '@/src/game/pedestrians';
import type { Point } from '@/src/game/api';

export const PedestrianArt = memo(function PedestrianArt({
  pedestrians,
  player,
  cx,
  cy,
  isRaining = false,
}: {
  pedestrians: Pedestrian[];
  player?: Point;
  cx?: number;
  cy?: number;
  isRaining?: boolean;
}) {
  const { colors: c } = useTheme();
  const ox = cx ?? player?.x ?? 0;
  const oy = cy ?? player?.y ?? 0;

  // Frustum culling: Only render pedestrians currently near the camera viewport
  const visible = pedestrians.filter(
    p => Math.abs(p.x - ox) < 380 && Math.abs(p.y - oy) < 520
  );

  if (visible.length === 0) return null;

  return (
    <G testID="city-pedestrians">
      {visible.map(p => {
        const rx = Math.round(p.x * 2) / 2;
        const ry = Math.round(p.y * 2) / 2;
        const rh = Math.round(p.heading);
        const swing = Math.sin(p.walkPhase) * 3.5;
        const legSwing = Math.sin(p.walkPhase) * 4.5;

        return (
          <G
            key={p.id}
            testID={`pedestrian-${p.id}`}
            transform={`translate(${rx},${ry}) rotate(${rh})`}
          >
            {/* Ground Soft Drop Shadow */}
            <Ellipse cx="0.8" cy="2.2" rx="8.5" ry="5.5" fill={c.shadow} opacity={0.35} />

            {/* Alternating Walking Feet */}
            <Circle cx="-4.2" cy={legSwing} r="2.4" fill={p.pantsColor} />
            <Circle cx="4.2" cy={-legSwing} r="2.4" fill={p.pantsColor} />

            {/* Torso / Shoulders with colorful shirt */}
            <Rect
              x="-7.5"
              y="-4"
              width="15"
              height="8"
              rx="3.5"
              fill={p.shirtColor}
              stroke={c.onSurface}
              strokeWidth="0.8"
            />

            {/* Hands swinging back and forth with walk cycle */}
            <Circle cx="-8.5" cy={swing} r="2.0" fill={p.skinColor} />
            <Circle cx="8.5" cy={-swing} r="2.0" fill={p.skinColor} />

            {/* Head and Styled Hair */}
            <Circle cx="0" cy="0" r="5.5" fill={p.skinColor} />
            <Circle cx="0" cy="-0.8" r="5.0" fill={p.hairColor} />

            {/* Accessories / Umbrella in Rainy Weather */}
            {isRaining ? (
              <G testID={`pedestrian-umbrella-${p.id}`}>
                {/* Colorful protective umbrella */}
                <Circle
                  cx="0"
                  cy="0"
                  r="17"
                  fill={p.shirtColor}
                  stroke={c.surface}
                  strokeWidth="1.6"
                  opacity={0.92}
                />
                <Circle cx="0" cy="0" r="3.2" fill={c.onSurface} />
              </G>
            ) : p.accessory === 'bag' ? (
              <Rect
                x="7.2"
                y={-swing - 3}
                width="4.8"
                height="6.5"
                rx="1.5"
                fill="#F59E0B"
                stroke="#92400E"
                strokeWidth="0.7"
              />
            ) : p.accessory === 'phone' ? (
              <Rect
                x="-2.2"
                y="-5.5"
                width="4.4"
                height="5.5"
                rx="0.8"
                fill="#38BDF8"
              />
            ) : null}
          </G>
        );
      })}
    </G>
  );
});
