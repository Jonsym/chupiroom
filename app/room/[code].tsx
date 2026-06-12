import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronLeft, Copy, Crown, Share2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Screen } from '@/components/Screen';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { buildSnapshotFromStore } from '@/lib/onlineGame';
import {
  getCurrentUserId,
  getRoomByCode,
  leaveRoom,
  listRoomPlayers,
  setRoomStatus,
  upsertRoomState,
  type Room,
  type RoomPlayer,
} from '@/lib/rooms';
import { AVATAR_COLORS, useGameStore } from '@/store/useGameStore';
import type { CardType, Player, PlayerOrder, PlayOrder } from '@/types/game';

export default function RoomLobbyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code: string }>();
  const code = String(params.code ?? '').toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  // Load the room + players, then poll for joiners (no realtime sync yet).
  useEffect(() => {
    let active = true;
    getCurrentUserId().then((id) => active && setUserId(id));

    const load = async () => {
      try {
        const r = await getRoomByCode(code);
        if (!active) return;
        if (!r) {
          setError('No existe ninguna sala con ese código.');
          setLoading(false);
          return;
        }
        setRoom(r);
        // Host closed/finished the room → don't leave players stuck waiting.
        if (r.status === 'finished') {
          setError('El anfitrión cerró la sala.');
          setLoading(false);
          return;
        }
        // Match in progress → everyone enters the online play screen.
        if (r.status === 'playing') {
          router.replace({ pathname: '/room/[code]/play', params: { code } });
          return;
        }
        const players = await listRoomPlayers(r.id);
        if (!active) return;
        setRoomPlayers(players);
        setLoading(false);
      } catch {
        if (active) {
          setError('No se pudo cargar la sala.');
          setLoading(false);
        }
      }
    };

    load();
    const interval = setInterval(load, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [code, router]);

  const isHost = Boolean(room && userId && room.host_id === userId);

  const onCopy = async () => {
    try {
      await Clipboard.setStringAsync(code);
    } catch {
      // non-critical
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onShare = async () => {
    try {
      await Share.share({ message: `Únete a mi sala de ChupiRoom con el código ${code}` });
    } catch {
      // user dismissed / unavailable
    }
  };

  // Leaving the lobby: the host closes the room (status → finished) so no one is
  // left waiting; a non-host removes only their own player row.
  const onLeave = async () => {
    try {
      if (room) {
        if (isHost) await setRoomStatus(room.id, 'finished');
        else await leaveRoom(room.id);
      }
    } catch {
      // best-effort — navigate home regardless
    }
    router.replace('/home');
  };

  const onStart = async () => {
    if (!room || roomPlayers.length < 2) return;
    setStarting(true);
    try {
      // Seed the host's game engine from the room, then start it.
      // id = the player's auth user id, so each device can detect its own turn
      // online (falls back to the room_player id for any legacy row).
      const seeded: Player[] = roomPlayers.map((rp, i) => ({
        id: rp.user_id ?? rp.id,
        name: rp.display_name,
        color: rp.color ?? AVATAR_COLORS[i % AVATAR_COLORS.length],
      }));
      const store = useGameStore.getState();
      store.setPlayers(seeded);
      store.setGameName(room.name ?? '');
      store.setSelectedMode('clasico');
      store.setSelectedCardTypes(room.selected_card_types as CardType[]);
      store.setPlayOrder(room.play_order as PlayOrder);
      store.setPlayerOrder(room.player_order as PlayerOrder);
      store.setMaxRounds(room.max_rounds);
      store.startGame();
      store.setRoomCode(room.code);

      // Publish the first synced snapshot, then open the match for everyone.
      await upsertRoomState(room.id, 'playing', buildSnapshotFromStore());
      await setRoomStatus(room.id, 'playing');
      router.replace({ pathname: '/room/[code]/play', params: { code: room.code } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo empezar la partida.');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (error || !room) {
    return (
      <Screen scroll>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.replace('/home')} hitSlop={12} style={styles.back}>
            <ChevronLeft size={26} color={colors.white} />
          </Pressable>
          <Text style={styles.title}>Sala</Text>
        </View>
        <Text style={styles.errorText}>{error ?? 'No se encontró la sala.'}</Text>
        <AppButton label="Volver" variant="secondary" onPress={() => router.replace('/home')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <Pressable onPress={onLeave} hitSlop={12} style={styles.back}>
          <ChevronLeft size={26} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>{room.name?.trim() || 'Sala'}</Text>
      </View>

      {/* Code card */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>CÓDIGO DE LA SALA</Text>
        <Text style={styles.code}>{code}</Text>
        <View style={styles.codeActions}>
          <Pressable onPress={onCopy} style={styles.codeBtn}>
            {copied ? (
              <Check size={18} color={colors.accent} />
            ) : (
              <Copy size={18} color={colors.accentSoft} />
            )}
            <Text style={styles.codeBtnText}>{copied ? 'Copiado' : 'Copiar'}</Text>
          </Pressable>
          <Pressable onPress={onShare} style={styles.codeBtn}>
            <Share2 size={18} color={colors.accentSoft} />
            <Text style={styles.codeBtnText}>Compartir</Text>
          </Pressable>
        </View>
      </View>

      {/* Players */}
      <Text style={styles.section}>Jugadores · {roomPlayers.length}</Text>
      <View style={styles.players}>
        {roomPlayers.map((p) => (
          <View key={p.id} style={styles.playerRow}>
            <PlayerAvatar name={p.display_name} color={p.color ?? colors.accent} size={36} />
            <Text style={styles.playerName} numberOfLines={1}>
              {p.display_name}
            </Text>
            {p.is_host && (
              <View style={styles.hostBadge}>
                <Crown size={13} color={colors.accent} />
                <Text style={styles.hostText}>Anfitrión</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Host controls / waiting state */}
      <View style={styles.footer}>
        {isHost ? (
          <>
            {roomPlayers.length < 2 && (
              <Text style={styles.hint}>Espera a que se una al menos otro jugador para empezar.</Text>
            )}
            <AppButton
              label="Empezar partida"
              onPress={onStart}
              loading={starting}
              disabled={roomPlayers.length < 2 || starting}
            />
            <Text style={styles.note}>Todos los jugadores entrarán a la partida al empezar.</Text>
          </>
        ) : (
          <Text style={styles.hint}>Esperando a que el anfitrión empiece la partida…</Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
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
    flex: 1,
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  codeCard: {
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  codeLabel: {
    color: colors.mutedText,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  code: {
    color: colors.white,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 8,
    marginVertical: spacing.xs,
  },
  codeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  codeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  section: {
    color: colors.mutedText,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  players: {
    gap: spacing.sm,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  playerName: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(224,221,238,0.12)',
  },
  hostText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  footer: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  hint: {
    color: colors.mutedText,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  note: {
    color: colors.mutedText,
    fontSize: fontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
});
