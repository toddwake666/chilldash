import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Label } from './ui';

interface RefuelBannerProps {
  onPress: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function RefuelBanner({
  onPress,
  compact = false,
  style,
  testID = 'refuel-banner',
}: RefuelBannerProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 220],
  });

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel="Low fuel warning. Tap to open roadside refuel."
      onPress={onPress}
      style={({ pressed }) => [
        s.container,
        compact ? s.containerCompact : s.containerFull,
        pressed && s.pressed,
        style,
      ]}
    >
      {/* Rhombus Shimmer Highlight Bar */}
      <Animated.View
        pointerEvents="none"
        style={[
          s.shimmerStreak,
          compact ? s.shimmerCompact : s.shimmerFull,
          { transform: [{ translateX: shimmerTranslate }] },
        ]}
      />

      {/* Un-skewed Content */}
      <View style={[s.content, compact ? s.contentCompact : s.contentFull]}>
        <Label style={[s.text, compact ? s.textCompact : s.textFull]}>
          {compact ? '⚡ REFUEL' : '⚡ REFUEL · ROADSIDE HELP AVAILABLE'}
        </Label>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#10B981',
    borderColor: '#047857',
    borderWidth: 1.5,
    borderRadius: 4,
    transform: [{ skewX: '-18deg' }],
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.65,
    shadowRadius: 5,
    elevation: 4,
  },
  containerCompact: {
    minWidth: 64,
    height: 20,
    paddingHorizontal: 6,
    marginTop: 4,
  },
  containerFull: {
    width: '100%',
    height: 38,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ skewX: '-18deg' }, { scale: 0.96 }],
  },
  shimmerStreak: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    zIndex: 2,
  },
  shimmerCompact: {
    width: 24,
  },
  shimmerFull: {
    width: 48,
  },
  content: {
    transform: [{ skewX: '18deg' }],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  contentCompact: {
    gap: 2,
  },
  contentFull: {
    gap: 6,
  },
  text: {
    color: '#000000',
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  textCompact: {
    fontSize: 8.5,
    lineHeight: 11,
  },
  textFull: {
    fontSize: 11.5,
    lineHeight: 15,
  },
});
