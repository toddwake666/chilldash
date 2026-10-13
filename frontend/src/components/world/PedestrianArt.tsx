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
        const swing = Math.sin(p.walkPhase) * 2.8;
        const legSwing = Math.sin(p.walkPhase) * 3.6;

        return (
          <G
            key={p.id}
            testID={`pedestrian-${p.id}`}
            transform={`translate(${rx},${ry}) rotate(${rh})`}
          >
            {/* Ground Soft Drop Shadow */}
            <Ellipse cx="0.5" cy="1.5" rx="5.2" ry="3.4" fill={c.shadow} opacity={0.38} />

            {/* Alternating Walking Feet */}
            <Circle cx="-2.6" cy={legSwing} r="1.6" fill={p.pantsColor} />
            <Circle cx="2.6" cy={-legSwing} r="1.6" fill={p.pantsColor} />

            {/* Torso / Shoulders with colorful shirt */}
            <Rect
              x="-4.5"
              y="-2.5"
              width="9"
              height="5"
              rx="2"
              fill={p.shirtColor}
              stroke={c.onSurface}
              strokeWidth="0.6"
            />

            {/* Hands swinging back and forth with walk cycle */}
            <Circle cx="-5.4" cy={swing} r="1.3" fill={p.skinColor} />
            <Circle cx="5.4" cy={-swing} r="1.3" fill={p.skinColor} />

            {/* Head and Styled Hair */}
            <Circle cx="0" cy="0" r="3.5" fill={p.skinColor} />
            <Circle cx="0" cy="-0.6" r="3.1" fill={p.hairColor} />

            {/* Accessories / Umbrella in Rainy Weather */}
            {isRaining ? (
              <G testID={`pedestrian-umbrella-${p.id}`}>
                {/* Colorful protective umbrella */}
                <Circle
                  cx="0"
                  cy="0"
                  r="11"
                  fill={p.shirtColor}
                  stroke={c.surface}
                  strokeWidth="1.2"
                  opacity={0.88}
                />
                <Circle cx="0" cy="0" r="2.2" fill={c.onSurface} />
              </G>
            ) : p.accessory === 'bag' ? (
              <Rect
                x="4.6"
                y={-swing - 2}
                width="3.2"
                height="4.4"
                rx="1"
                fill="#F59E0B"
                stroke="#92400E"
                strokeWidth="0.5"
              />
            ) : p.accessory === 'phone' ? (
              <Rect
                x="-1.4"
                y="-3.8"
                width="2.8"
                height="3.8"
                rx="0.5"
                fill="#38BDF8"
              />
            ) : null}
          </G>
        );
      })}
    </G>
  );
});
