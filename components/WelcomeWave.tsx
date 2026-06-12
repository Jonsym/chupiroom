import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/**
 * Thin glowing orange/coral wave that drifts and breathes behind the upper area
 * of the Welcome screen. Pure SVG (layered strokes fake the glow) + RN Animated
 * (eased drift + subtle opacity pulse) for a smooth, premium feel.
 */
export function WelcomeWave() {
  const { width } = useWindowDimensions();
  const drift = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const native = Platform.OS !== 'web';
    const ease = Easing.inOut(Easing.ease);
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000, easing: ease, useNativeDriver: native }),
        Animated.timing(drift, { toValue: 0, duration: 9000, easing: ease, useNativeDriver: native }),
      ]),
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 3400, easing: ease, useNativeDriver: native }),
        Animated.timing(glow, { toValue: 0, duration: 3400, easing: ease, useNativeDriver: native }),
      ]),
    );
    driftLoop.start();
    glowLoop.start();
    return () => {
      driftLoop.stop();
      glowLoop.stop();
    };
  }, [drift, glow]);

  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-22, 22] });
  const opacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });

  // A touch wider than the screen so the drift stays seamless and the ends fade out.
  const W = Math.round(width + 100);
  const H = 160;
  const cy = 80;
  const a = 34;
  const d =
    `M0 ${cy} C ${W * 0.15} ${cy - a}, ${W * 0.3} ${cy + a}, ${W * 0.46} ${cy} ` +
    `C ${W * 0.62} ${cy - a}, ${W * 0.8} ${cy + a * 0.85}, ${W} ${cy - 6}`;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={{ transform: [{ translateX }], opacity }}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <LinearGradient id="welcomeWave" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#FF8A4C" stopOpacity="0" />
              <Stop offset="20%" stopColor="#FF8A4C" stopOpacity="1" />
              <Stop offset="50%" stopColor="#FF764C" stopOpacity="1" />
              <Stop offset="78%" stopColor="#FF6B6B" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FF6B6B" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          {/* Glow halo → wide → mid → thin bright line */}
          <Path d={d} stroke="url(#welcomeWave)" strokeWidth={26} fill="none" opacity={0.06} strokeLinecap="round" />
          <Path d={d} stroke="url(#welcomeWave)" strokeWidth={16} fill="none" opacity={0.14} strokeLinecap="round" />
          <Path d={d} stroke="url(#welcomeWave)" strokeWidth={8} fill="none" opacity={0.3} strokeLinecap="round" />
          <Path d={d} stroke="url(#welcomeWave)" strokeWidth={3} fill="none" opacity={1} strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
