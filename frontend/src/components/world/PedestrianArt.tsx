import React from 'react';
import { Circle, Ellipse, G, Rect } from 'react-native-svg';
import { useTheme } from '@/src/theme';
import type { Pedestrian } from '@/src/game/pedestrians';
import type { Point } from '@/src/game/api';

export function PedestrianArt({
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

  // Frustum culling: Only render pedestrians currently inside the active camera viewport
  const visible = pedestrians.filter(
    p => Math.abs(p.x - ox) < 250 && Math.abs(p.y - oy) < 360
  );

  return (
    <G testID="city-pedestrians">
      {visible.map(p => {
        const rx = Math.round(p.x);
        const ry = Math.round(p.y);
        const rh = Math.round(p.heading);

        return (
          <G
            key={p.id}
            testID={`pedestrian-${p.id}`}
            transform={`translate(${rx},${ry}) rotate(${rh})`}
          >
            {/* Ground Soft Drop Shadow */}
            <Ellipse cx="1" cy="2" rx="7.5" ry="4.5" fill={c.shadow} opacity={0.3} />

            {/* Torso / Shoulders with colorful shirt (Static child geometry: zero JNI view mutation thrash) */}
            <Rect
              x="-6.5"
              y="-3.5"
              width="13"
              height="7"
              rx="3"
              fill={p.shirtColor}
              stroke={c.onSurface}
              strokeWidth="0.8"
            />

            {/* Head and Styled Hair */}
            <Circle cx="0" cy="0" r="4.2" fill={p.skinColor} />
            <Circle cx="0" cy="-0.8" r="3.8" fill={p.hairColor} />

            {/* Accessories / Umbrella in Rainy Weather */}
            {isRaining ? (
              <Circle
                cx="0"
                cy="0"
                r="14"
                fill={p.shirtColor}
                stroke={c.surface}
                strokeWidth="1.4"
                opacity={0.92}
              />
            ) : p.accessory === 'bag' ? (
              <Rect
                x="5.5"
                y="-2"
                width="4"
                height="5"
                rx="1.2"
                fill="#F59E0B"
                stroke="#92400E"
                strokeWidth="0.6"
              />
            ) : p.accessory === 'phone' ? (
              <Rect
                x="-1.8"
                y="-4.5"
                width="3.6"
                height="4.5"
                rx="0.7"
                fill="#38BDF8"
              />
            ) : null}
          </G>
        );
      })}
    </G>
  );
}
