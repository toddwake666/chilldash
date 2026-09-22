import React, { MutableRefObject, useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { makeStyles, useTheme } from '@/src/theme';
import { Icon, Label } from './ui';
import type { Point } from '@/src/game/api';

const PAD_SIZE = 156;
const PAD_RADIUS = PAD_SIZE / 2; // 78
const KNOB_SIZE = 54;
const KNOB_RADIUS = KNOB_SIZE / 2; // 27
const MAX_TRAVEL = 42; // Maximum distance thumb knob can travel from center
const DEADZONE = 4; // Ignore tiny micro-jitter

// Dual-mode continuous control: 360-degree analog virtual joystick + 4 cardinal directional buttons
export const RideControls = React.memo(function RideControls({
  direction,
  disabled = false,
}: {
  direction: MutableRefObject<Point>;
  disabled?: boolean;
}) {
  const s = useStyles();
  const { colors: c } = useTheme();
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  const knobAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const touchOrigin = useRef({ x: PAD_RADIUS, y: PAD_RADIUS });
  const lastKnobPos = useRef({ x: 0, y: 0 });

  const updateStickFromPos = useCallback(
    (dx: number, dy: number) => {
      const dist = Math.hypot(dx, dy);

      if (dist < DEADZONE) {
        direction.current = { x: 0, y: 0 };
        lastKnobPos.current = { x: 0, y: 0 };
        knobAnim.setValue({ x: 0, y: 0 });
        return;
      }

      const angle = Math.atan2(dy, dx);
      const clampedDist = Math.min(dist, MAX_TRAVEL);

      // Smooth, responsive continuous linear throttle progression
      const ratio = Math.max(0, Math.min(1, (clampedDist - DEADZONE) / (MAX_TRAVEL - DEADZONE)));
      const normalized = ratio;

      // Full continuous 360-degree direction vector
      const dirX = Math.cos(angle) * normalized;
      const dirY = Math.sin(angle) * normalized;

      direction.current = { x: dirX, y: dirY };

      const targetX = Math.cos(angle) * clampedDist;
      const targetY = Math.sin(angle) * clampedDist;

      if (Math.hypot(targetX - lastKnobPos.current.x, targetY - lastKnobPos.current.y) >= 0.75) {
        lastKnobPos.current = { x: targetX, y: targetY };
        knobAnim.setValue({
          x: targetX,
          y: targetY,
        });
      }
    },
    [direction, knobAnim]
  );

  const stop = useCallback(() => {
    direction.current = { x: 0, y: 0 };
    lastKnobPos.current = { x: 0, y: 0 };
    if (activeRef.current) {
      activeRef.current = false;
      setActive(false);
    }
    Animated.spring(knobAnim, {
      toValue: { x: 0, y: 0 },
      friction: 7,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [direction, knobAnim]);

  const pressDirection = useCallback(
    (x: number, y: number) => {
      if (disabled) return;
      if (!activeRef.current) {
        activeRef.current = true;
        setActive(true);
      }
      direction.current = { x, y };
      knobAnim.setValue({
        x: x * MAX_TRAVEL,
        y: y * MAX_TRAVEL,
      });
    },
    [disabled, direction, knobAnim]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled)
        .minDistance(0)
        .shouldCancelWhenOutside(false)
        .runOnJS(true)
        .onBegin(e => {
          touchOrigin.current = { x: e.x, y: e.y };
          if (!activeRef.current) {
            activeRef.current = true;
            setActive(true);
          }
          const currX = e.x - PAD_RADIUS;
          const currY = e.y - PAD_RADIUS;
          updateStickFromPos(currX, currY);
        })
        .onUpdate(e => {
          const currX = touchOrigin.current.x + e.translationX - PAD_RADIUS;
          const currY = touchOrigin.current.y + e.translationY - PAD_RADIUS;
          updateStickFromPos(currX, currY);
        })
        .onFinalize(() => {
          stop();
        }),
    [disabled, stop, updateStickFromPos]
  );

  const buttons = [
    { id: 'up', x: 0, y: -1, icon: 'chevron-up', style: s.up },
    { id: 'down', x: 0, y: 1, icon: 'chevron-down', style: s.down },
    { id: 'left', x: -1, y: 0, icon: 'chevron-back', style: s.left },
    { id: 'right', x: 1, y: 0, icon: 'chevron-forward', style: s.right },
  ];

  return (
    <View style={s.wrap}>
      <GestureDetector gesture={pan}>
        <View
          testID="directional-controls"
          style={[s.pad, active && s.padActive, disabled && s.disabled]}
          accessible={true}
          accessibilityRole="adjustable"
          accessibilityLabel="360 degree ride joystick"
        >
          {/* Concentric Guide Ring */}
          <View style={s.innerRing} pointerEvents="none" />

          {/* 4 Directional Cardinal Buttons */}
          {buttons.map(b => (
            <View
              key={b.id}
              testID={`ride-${b.id}-button`}
              accessibilityRole="button"
              accessibilityLabel={`Ride ${b.id}`}
              pointerEvents="none"
              style={[s.arrow, b.style, active && s.arrowActive]}
            >
              <Icon name={b.icon} size={22} color="rgba(255,255,255,0.7)" />
            </View>
          ))}

          {/* Floating 360-degree Thumb Knob */}
          <Animated.View
            testID="ride-joystick"
            pointerEvents="none"
            style={[
              s.knob,
              active && s.knobActive,
              {
                transform: [
                  { translateX: knobAnim.x },
                  { translateY: knobAnim.y },
                  { scale: active ? 1.06 : 1 },
                ],
              },
            ]}
          >
            <View style={s.knobInnerRing} pointerEvents="none" />
            <View
              style={[s.knobPip, { backgroundColor: active ? c.brand : c.teal }]}
              pointerEvents="none"
            />
          </Animated.View>
        </View>
      </GestureDetector>
      <Label style={s.label}>{active ? '360° STEERING' : 'HOLD & DRAG TO RIDE'}</Label>
    </View>
  );
});

const useStyles = makeStyles(c => ({
  wrap: {
    alignItems: 'center',
  },
  pad: {
    width: PAD_SIZE,
    height: PAD_SIZE,
    borderRadius: PAD_RADIUS,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  padActive: {
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  disabled: {
    opacity: 0.4,
  },
  innerRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderStyle: 'dashed',
  },
  arrow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  arrowActive: {
    opacity: 0.85,
  },
  up: { top: 4, left: PAD_RADIUS - 22 },
  down: { bottom: 4, left: PAD_RADIUS - 22 },
  left: { left: 4, top: PAD_RADIUS - 22 },
  right: { right: 4, top: PAD_RADIUS - 22 },
  pressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    transform: [{ scale: 0.93 }],
  },
  knob: {
    position: 'absolute',
    top: PAD_RADIUS - KNOB_RADIUS,
    left: PAD_RADIUS - KNOB_RADIUS,
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_RADIUS,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 10,
  },
  knobActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.38)',
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  knobInnerRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  knobPip: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  label: {
    fontSize: 8,
    letterSpacing: 1.8,
    marginTop: 8,
    color: c.onSurface,
    backgroundColor: c.glass,
    borderRadius: 5,
    paddingVertical: 3,
    paddingHorizontal: 9,
    fontWeight: '800',
  },
}));