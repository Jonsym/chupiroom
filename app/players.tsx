import { useRouter } from 'expo-router';
import { Check, ChevronLeft, Plus, Trash2, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Screen } from '@/components/Screen';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { AVATAR_COLORS, useGameStore } from '@/store/useGameStore';

export default function PlayersScreen() {
  const router = useRouter();
  const players = useGameStore((s) => s.players);
  const addPlayer = useGameStore((s) => s.addPlayer);
  const removePlayer = useGameStore((s) => s.removePlayer);
  const setPlayerColor = useGameStore((s) => s.setPlayerColor);

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Which player's colour palette is currently expanded (null = none).
  const [openColorFor, setOpenColorFor] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setError('Ese nombre ya está en la lista.');
      return;
    }
    addPlayer(trimmed);
    setName('');
    setError(null);
  };

  const canContinue = players.length >= 2;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ChevronLeft size={26} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>Jugadores</Text>
      </View>

      <Text style={styles.subtitle}>Añade al menos 2 jugadores para empezar.</Text>

      <View style={styles.inputRow}>
        <TextInput
          value={name}
          onChangeText={(t) => {
            setName(t);
            if (error) setError(null);
          }}
          placeholder="Nombre del jugador"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          maxLength={20}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <Pressable
          onPress={handleAdd}
          disabled={!name.trim()}
          style={({ pressed }) => [
            styles.addButton,
            !name.trim() && styles.addButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Plus size={24} color={colors.background} />
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.list}>
        {players.length === 0 ? (
          <AppCard style={styles.empty}>
            <UserPlus size={28} color={colors.mutedText} />
            <Text style={styles.emptyText}>Todavía no hay jugadores</Text>
          </AppCard>
        ) : (
          players.map((player) => {
            const isOpen = openColorFor === player.id;
            return (
              <AppCard key={player.id} style={styles.playerCard}>
                <View style={styles.playerRow}>
                  <Pressable
                    onPress={() => setOpenColorFor(isOpen ? null : player.id)}
                    hitSlop={6}
                    style={[styles.avatarBtn, isOpen && styles.avatarBtnOpen]}
                    accessibilityLabel={`Cambiar color de ${player.name}`}
                  >
                    <PlayerAvatar name={player.name} color={player.color} />
                  </Pressable>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.colorHint}>Toca el avatar para cambiar el color</Text>
                  </View>
                  <Pressable
                    onPress={() => removePlayer(player.id)}
                    hitSlop={10}
                    style={styles.removeButton}
                  >
                    <Trash2 size={20} color={colors.danger} />
                  </Pressable>
                </View>

                {isOpen && (
                  <View style={styles.palette}>
                    {AVATAR_COLORS.map((c) => {
                      const selected = player.color.toLowerCase() === c.toLowerCase();
                      return (
                        <Pressable
                          key={c}
                          onPress={() => {
                            setPlayerColor(player.id, c);
                            setOpenColorFor(null);
                          }}
                          style={[styles.swatch, { backgroundColor: c }, selected && styles.swatchOn]}
                          accessibilityLabel={selected ? 'Color actual' : 'Elegir color'}
                        >
                          {selected && <Check size={16} color={colors.background} strokeWidth={3} />}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </AppCard>
            );
          })
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.count}>
          {players.length} {players.length === 1 ? 'jugador' : 'jugadores'}
        </Text>
        {!canContinue && (
          <Text style={styles.hint}>Necesitas al menos 2 jugadores.</Text>
        )}
        <AppButton
          label="Elegir modo"
          disabled={!canContinue}
          onPress={() => router.push('/mode')}
        />
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
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.white,
    fontSize: fontSize.md,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.mutedText,
    fontSize: fontSize.md,
  },
  playerCard: {
    gap: spacing.md,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarBtn: {
    borderRadius: radius.pill,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarBtnOpen: {
    borderColor: colors.accent,
  },
  playerInfo: {
    flex: 1,
    gap: 2,
  },
  playerName: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  colorHint: {
    color: colors.mutedText,
    fontSize: fontSize.xs,
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchOn: {
    borderColor: colors.white,
  },
  removeButton: {
    padding: spacing.xs,
  },
  footer: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  count: {
    color: colors.accentSoft,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  hint: {
    color: colors.mutedText,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
