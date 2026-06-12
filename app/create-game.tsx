import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { Screen } from '@/components/Screen';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { cardTypeMeta } from '@/data/cards';
import { useGameStore } from '@/store/useGameStore';
import type { PlayerOrder } from '@/types/game';

const PLAYER_ORDERS: { key: PlayerOrder; label: string }[] = [
  { key: 'sequential', label: 'En orden' },
  { key: 'random', label: 'Aleatorio' },
];

const DURATIONS: { value: number | null; label: string }[] = [
  { value: 10, label: '10 rondas' },
  { value: 15, label: '15 rondas' },
  { value: null, label: 'Sin límite' },
];

/** Reusable selectable pill. */
function Option({
  label,
  active,
  onPress,
  grow,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  grow?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[styles.opt, grow && styles.optGrow, active ? styles.optOn : styles.optOff]}
    >
      <Text style={active ? styles.optTextOn : styles.optText}>{label}</Text>
    </Pressable>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export default function CreateGameScreen() {
  const router = useRouter();
  const gameName = useGameStore((s) => s.gameName);
  const setGameName = useGameStore((s) => s.setGameName);
  const selectedCardTypes = useGameStore((s) => s.selectedCardTypes);
  const playerOrder = useGameStore((s) => s.playerOrder);
  const setPlayerOrder = useGameStore((s) => s.setPlayerOrder);
  const maxRounds = useGameStore((s) => s.maxRounds);
  const setMaxRounds = useGameStore((s) => s.setMaxRounds);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ChevronLeft size={26} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>Crear partida</Text>
      </View>

      <Section label="Nombre de la partida">
        <TextInput
          value={gameName}
          onChangeText={setGameName}
          placeholder="Ej. Stream del viernes"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          maxLength={40}
          returnKeyType="done"
        />
      </Section>

      {/* Read-only recap of the juegos chosen on the previous screen */}
      <Section label="Juegos">
        <View style={styles.row}>
          {selectedCardTypes.map((type) => (
            <View key={type} style={styles.recapChip}>
              <Text style={styles.recapChipText}>{cardTypeMeta[type].label}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section label="Orden de jugadores">
        <View style={styles.segment}>
          {PLAYER_ORDERS.map((o) => (
            <Option
              key={o.key}
              label={o.label}
              active={playerOrder === o.key}
              onPress={() => setPlayerOrder(o.key)}
              grow
            />
          ))}
        </View>
      </Section>

      <Section label="Duración">
        <View style={styles.row}>
          {DURATIONS.map((d) => (
            <Option
              key={d.label}
              label={d.label}
              active={maxRounds === d.value}
              onPress={() => setMaxRounds(d.value)}
            />
          ))}
        </View>
      </Section>

      <View style={styles.footer}>
        <AppButton label="Continuar" onPress={() => router.push('/players')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  label: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.white,
    fontSize: fontSize.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recapChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recapChipText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  segment: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  opt: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
  },
  optGrow: {
    flex: 1,
  },
  optOff: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  optOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optText: {
    color: colors.accentSoft,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  optTextOn: {
    color: colors.background,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  footer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
