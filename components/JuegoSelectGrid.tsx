import * as Haptics from 'expo-haptics';
import { Check, Layers, MessageCircle, Timer, Users, Vote, Zap } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { cardTypeMeta } from '@/data/cards';
import type { CardType } from '@/types/game';

type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type JuegoConfig = {
  type: CardType;
  icon: IconType;
  /** Soft muted card background. */
  bg: string;
  /** Accent tint for the icon + decorative lines. */
  tint: string;
  tag: string;
};

/** Shared catalog of game cards (used by Home and Create Room for consistency). */
export const JUEGOS: JuegoConfig[] = [
  { type: 'retos', icon: Zap, bg: '#241F33', tint: '#B7A8E8', tag: 'Por turnos' },
  { type: 'yo-nunca', icon: Users, bg: '#16302C', tint: '#86CDBE', tag: 'En grupo' },
  { type: 'votaciones', icon: Vote, bg: '#33291A', tint: '#E8B57A', tag: 'El grupo vota' },
  { type: 'verdad-o-toma', icon: MessageCircle, bg: '#33212B', tint: '#E89CB0', tag: 'Responde o bebe' },
  { type: 'categorias', icon: Layers, bg: '#1B2A38', tint: '#8FB6DC', tag: 'Por turnos' },
  { type: 'reglas-temporales', icon: Timer, bg: '#27301C', tint: '#B7CC86', tag: 'Para la mesa' },
];

/** Colorful, multi-select grid of game cards with a clear active state. */
export function JuegoSelectGrid({
  selected,
  onToggle,
}: {
  selected: CardType[];
  onToggle: (type: CardType) => void;
}) {
  const { width } = useWindowDimensions();
  const cardW = Math.floor((width - spacing.lg * 2 - spacing.md) / 2);

  return (
    <View style={styles.grid}>
      {JUEGOS.map(({ type, icon: Icon, bg, tint, tag }) => {
        const isOn = selected.includes(type);
        return (
          <Pressable
            key={type}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onToggle(type);
            }}
            style={({ pressed }) => [
              styles.card,
              { width: cardW, backgroundColor: bg },
              isOn && styles.cardActive,
              pressed && styles.cardPressed,
            ]}
          >
            {/* Decorative curved lines (bottom-right) */}
            <View style={[styles.ring, styles.ringOuter, { borderColor: tint }]} />
            <View style={[styles.ring, styles.ringInner, { borderColor: tint }]} />

            <View style={[styles.iconBadge, { backgroundColor: tint + '22' }]}>
              <Icon size={22} color={tint} strokeWidth={2.2} />
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {cardTypeMeta[type].label}
              </Text>
              <Text style={styles.cardTag}>{tag}</Text>
            </View>

            <View style={[styles.check, isOn && styles.checkOn]}>
              {isOn && <Check size={14} color={colors.background} strokeWidth={3} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    height: 158,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: spacing.md,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  cardActive: {
    borderColor: colors.accent,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 999,
  },
  ringOuter: {
    width: 150,
    height: 150,
    right: -75,
    bottom: -75,
    opacity: 0.16,
  },
  ringInner: {
    width: 90,
    height: 90,
    right: -45,
    bottom: -45,
    opacity: 0.28,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    gap: 2,
  },
  cardTitle: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cardTag: {
    color: colors.mutedText,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  check: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
});
