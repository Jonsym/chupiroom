import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Bell, Search } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppButton } from '@/components/AppButton';
import { BOTTOM_NAV_SPACE } from '@/components/BottomNav';
import { JuegoSelectGrid } from '@/components/JuegoSelectGrid';
import { Screen } from '@/components/Screen';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useGameStore } from '@/store/useGameStore';
import type { CardType, PlayOrder } from '@/types/game';

const PLAY_ORDERS: { key: PlayOrder; label: string }[] = [
  { key: 'random', label: 'Aleatorio' },
  { key: 'sequential', label: 'En orden' },
];

export default function HomeScreen() {
  const router = useRouter();
  const selectedCardTypes = useGameStore((s) => s.selectedCardTypes);
  const setSelectedCardTypes = useGameStore((s) => s.setSelectedCardTypes);
  const playOrder = useGameStore((s) => s.playOrder);
  const setPlayOrder = useGameStore((s) => s.setPlayOrder);

  const toggleJuego = (type: CardType) => {
    const isOn = selectedCardTypes.includes(type);
    setSelectedCardTypes(
      isOn ? selectedCardTypes.filter((t) => t !== type) : [...selectedCardTypes, type],
    );
  };

  const canContinue = selectedCardTypes.length > 0;

  return (
    <Screen contentStyle={styles.screen}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.iconBtn} onPress={() => {}} accessibilityLabel="ChupiRoom">
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="M3 14 C 6.5 8, 10 18, 13.5 13 S 20.5 8, 21 13"
                stroke={colors.accent}
                strokeWidth={2.4}
                fill="none"
                strokeLinecap="round"
              />
            </Svg>
          </Pressable>
          <View style={styles.headerRight}>
            <Pressable style={styles.iconBtn} onPress={() => {}} accessibilityLabel="Buscar">
              <Search size={20} color={colors.accentSoft} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => {}} accessibilityLabel="Notificaciones">
              <Bell size={20} color={colors.accentSoft} />
            </Pressable>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Elige tus juegos</Text>
          <Text style={styles.subtitle}>Selecciona uno o varios para tu partida.</Text>
        </View>

        {/* Catalog grid */}
        <JuegoSelectGrid selected={selectedCardTypes} onToggle={toggleJuego} />

        {/* Play order */}
        <View style={styles.orderBlock}>
          <Text style={styles.orderLabel}>ORDEN DE LAS CARTAS</Text>
          <View style={styles.segment}>
            {PLAY_ORDERS.map(({ key, label }) => {
              const on = playOrder === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setPlayOrder(key);
                  }}
                  style={[styles.segPill, on && styles.segPillOn]}
                >
                  <Text style={on ? styles.segTextOn : styles.segText}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Fixed bottom CTA */}
      <View style={styles.ctaBar}>
        {!canContinue && (
          <Text style={styles.hint}>Selecciona al menos un juego para continuar.</Text>
        )}
        <AppButton
          label="Continuar"
          disabled={!canContinue}
          onPress={() => router.push('/create-game')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    gap: spacing.xs,
  },
  title: {
    color: colors.white,
    fontSize: fontSize.xxl,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: fontSize.md,
  },
  orderBlock: {
    gap: spacing.sm,
  },
  orderLabel: {
    color: colors.mutedText,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  segment: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  segPillOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  segText: {
    color: colors.accentSoft,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  segTextOn: {
    color: colors.background,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  ctaBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    // Reserve room so the fixed CTA clears the floating bottom dock.
    paddingBottom: spacing.sm,
    marginBottom: BOTTOM_NAV_SPACE,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hint: {
    color: colors.mutedText,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
