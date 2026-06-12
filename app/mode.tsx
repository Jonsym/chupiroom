import { useRouter } from 'expo-router';
import { ChevronLeft, Flame, Sparkles } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { ModeCard } from '@/components/ModeCard';
import { Screen } from '@/components/Screen';
import { colors, fontSize, spacing } from '@/constants/theme';
import { useGameStore } from '@/store/useGameStore';

export default function ModeScreen() {
  const router = useRouter();
  const selectedMode = useGameStore((s) => s.selectedMode);
  const setSelectedMode = useGameStore((s) => s.setSelectedMode);
  const selectedCardTypes = useGameStore((s) => s.selectedCardTypes);
  const players = useGameStore((s) => s.players);
  const startGame = useGameStore((s) => s.startGame);
  const setRoomCode = useGameStore((s) => s.setRoomCode);

  const canStart = players.length >= 2 && selectedCardTypes.length > 0;

  const handleStart = () => {
    if (!canStart) return;
    setRoomCode(null); // offline match — no online room code
    startGame();
    router.push('/game');
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ChevronLeft size={26} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>Elige el modo</Text>
      </View>

      <Text style={styles.subtitle}>¿Cómo de intenso quieres que sea?</Text>

      <View style={styles.list}>
        <ModeCard
          title="Clásico"
          description="Cartas suaves y medias. Ritmo tranquilo para calentar."
          icon={<Sparkles size={26} color={colors.accentSoft} />}
          accent={colors.accent}
          selected={selectedMode === 'clasico'}
          onPress={() => setSelectedMode('clasico')}
        />
        <ModeCard
          title="Caos"
          description="Cartas medias y fuertes. Más intensidad, sin piedad."
          icon={<Flame size={26} color={colors.danger} />}
          accent={colors.danger}
          selected={selectedMode === 'caos'}
          onPress={() => setSelectedMode('caos')}
        />
      </View>

      <View style={styles.footer}>
        {!canStart && (
          <Text style={styles.hint}>
            Necesitas 2 jugadores y al menos un juego para empezar.
          </Text>
        )}
        <AppButton label="Empezar partida" disabled={!canStart} onPress={handleStart} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
  subtitle: {
    color: colors.mutedText,
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  footer: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  hint: {
    color: colors.mutedText,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
