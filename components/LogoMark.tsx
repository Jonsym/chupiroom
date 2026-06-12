import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius } from '@/constants/theme';

/**
 * Small minimal ChupiRoom mark (temporary): a rounded tile with a tiny wave
 * glyph that echoes the Welcome hero wave. Brand accent, no wordmark.
 */
export function LogoMark() {
  return (
    <View style={styles.box}>
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path
          d="M3 14 C 6.5 8, 10 18, 13.5 13 S 20.5 8, 21 13"
          stroke={colors.accent}
          strokeWidth={2.4}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
