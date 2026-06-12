import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

type AppCardProps = {
  children: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  style?: ViewStyle;
};

/** Elevated surface container used across screens. Optionally pressable / selectable. */
export function AppCard({ children, onPress, selected = false, style }: AppCardProps) {
  const base = [styles.card, selected && styles.selected, style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...base, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={base}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  selected: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceElevated,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
