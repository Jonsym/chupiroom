import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors, fontSize, radius, spacing } from '@/constants/theme';

type ModeCardProps = {
  title: string;
  description: string;
  icon: ReactNode;
  accent: string;
  selected: boolean;
  onPress: () => void;
};

/** Selectable card used for picking game mode (Clásico / Caos). */
export function ModeCard({
  title,
  description,
  icon,
  accent,
  selected,
  onPress,
}: ModeCardProps) {
  return (
    <AppCard onPress={onPress} selected={selected} style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: accent + '22' }]}>{icon}</View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={[styles.radioOuter, selected && { borderColor: accent }]}>
        {selected && <View style={[styles.radioInner, { backgroundColor: accent }]} />}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  description: {
    color: colors.mutedText,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
