import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { BOTTOM_NAV_SPACE } from '@/components/BottomNav';
import { JuegoSelectGrid } from '@/components/JuegoSelectGrid';
import { Screen } from '@/components/Screen';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { createRoom } from '@/lib/rooms';
import { AVATAR_COLORS } from '@/store/useGameStore';
import type { CardType, PlayerOrder, PlayOrder } from '@/types/game';

const PLAY_ORDERS: { key: PlayOrder; label: string }[] = [
  { key: 'random', label: 'Aleatorio' },
  { key: 'sequential', label: 'En orden' },
];
const PLAYER_ORDERS: { key: PlayerOrder; label: string }[] = [
  { key: 'sequential', label: 'En orden' },
  { key: 'random', label: 'Aleatorio' },
];
const DURATIONS: { value: number | null; label: string }[] = [
  { value: 10, label: '10 rondas' },
  { value: 15, label: '15 rondas' },
  { value: null, label: 'Sin límite' },
];

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

export default function CreateRoomScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const defaultName =
    (user?.user_metadata as { first_name?: string } | undefined)?.first_name ?? '';

  const [hostName, setHostName] = useState(defaultName);
  const [roomName, setRoomName] = useState('');
  const [types, setTypes] = useState<CardType[]>([]);
  const [playOrder, setPlayOrder] = useState<PlayOrder>('random');
  const [playerOrder, setPlayerOrder] = useState<PlayerOrder>('sequential');
  const [maxRounds, setMaxRounds] = useState<number | null>(10);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleType = (type: CardType) => {
    setError(null);
    setTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const onCreate = async () => {
    if (!hostName.trim()) return setError('Introduce tu nombre.');
    if (types.length === 0) return setError('Selecciona al menos un juego.');
    setError(null);
    setCreating(true);
    try {
      const room = await createRoom(
        { name: roomName, selectedCardTypes: types, playOrder, playerOrder, maxRounds },
        { displayName: hostName.trim(), color: AVATAR_COLORS[0] },
      );
      router.replace({ pathname: '/room/[code]', params: { code: room.code } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la sala.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text style={styles.title}>Crear sala</Text>
      <Text style={styles.subtitle}>Configura la partida y comparte el código con tus amigos.</Text>

      <Section label="Tu nombre">
        <TextInput
          value={hostName}
          onChangeText={(t) => {
            setHostName(t);
            if (error) setError(null);
          }}
          placeholder="¿Cómo te ven en la sala?"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          maxLength={20}
          autoCapitalize="words"
          editable={!creating}
        />
      </Section>

      <Section label="Nombre de la sala">
        <TextInput
          value={roomName}
          onChangeText={setRoomName}
          placeholder="Ej. Stream del viernes"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          maxLength={40}
          editable={!creating}
        />
      </Section>

      <Section label="Juegos">
        <JuegoSelectGrid selected={types} onToggle={toggleType} />
      </Section>

      <Section label="Orden de las cartas">
        <View style={styles.segment}>
          {PLAY_ORDERS.map((o) => (
            <Option key={o.key} label={o.label} active={playOrder === o.key} onPress={() => setPlayOrder(o.key)} grow />
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
            <Option key={d.label} label={d.label} active={maxRounds === d.value} onPress={() => setMaxRounds(d.value)} />
          ))}
        </View>
      </Section>

      {error && <Text style={styles.error}>{error}</Text>}

      <AppButton label="Crear sala" onPress={onCreate} loading={creating} disabled={creating} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: BOTTOM_NAV_SPACE + spacing.lg,
  },
  title: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: fontSize.md,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
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
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
});
