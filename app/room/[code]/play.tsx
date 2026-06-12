import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronUp, Pause } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { GameCard } from '@/components/GameCard';
import { VoteList } from '@/components/VoteList';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { buildSnapshotFromStore, isFinalTurnNow, rehydrateFromSnapshot } from '@/lib/onlineGame';
import {
  castVote,
  getCurrentUserId,
  getRoomByCode,
  getRoomState,
  getVotes,
  leaveRoom,
  setRoomStatus,
  subscribeRoomState,
  subscribeRoomVotes,
  upsertRoomState,
  type OnlineSnapshot,
  type RealtimeStatus,
  type Room,
  type RoomVote,
} from '@/lib/rooms';
import { useGameStore } from '@/store/useGameStore';

const SWIPE_THRESHOLD = 70;

function computeWinners(votes: RoomVote[]): string[] {
  const tally: Record<string, number> = {};
  for (const v of votes) tally[v.voted_name] = (tally[v.voted_name] ?? 0) + 1;
  let max = 0;
  Object.values(tally).forEach((n) => {
    max = Math.max(max, n);
  });
  if (max === 0) return [];
  return Object.keys(tally).filter((n) => tally[n] === max);
}

export default function OnlinePlayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code: string }>();
  const code = String(params.code ?? '').toUpperCase();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const native = Platform.OS !== 'web';

  const [room, setRoom] = useState<Room | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<OnlineSnapshot | null>(null);
  const [status, setStatus] = useState<'waiting' | 'playing' | 'finished'>('playing');
  const [votes, setVotes] = useState<RoomVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [realtimeOk, setRealtimeOk] = useState(false);
  // Host reloaded mid-match and its live engine couldn't be rebuilt — controls
  // are locked and a recovery state is shown instead of broken gestures.
  const [hostRecovery, setHostRecovery] = useState(false);

  const isHost = Boolean(room && userId && room.host_id === userId);
  const snapRef = useRef<OnlineSnapshot | null>(null);
  snapRef.current = snapshot;

  // ── Card gesture animation (host only) ──────────────────────────────────────
  const pan = useRef(new Animated.ValueXY()).current;
  const mounted = useRef(true);
  // Latest settleIn, so the non-host refresh effect can fire it without
  // re-running on every render.
  const settleInRef = useRef<() => void>(() => {});
  useEffect(() => () => { mounted.current = false; }, []);
  const gestureRef = useRef<{
    shouldSet: (dx: number, dy: number) => boolean;
    handleMove: (dx: number, dy: number) => void;
    handleRelease: (dx: number, dy: number) => void;
  }>({ shouldSet: () => false, handleMove: () => {}, handleRelease: () => {} });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => gestureRef.current.shouldSet(g.dx, g.dy),
      onPanResponderMove: (_, g) => gestureRef.current.handleMove(g.dx, g.dy),
      onPanResponderRelease: (_, g) => gestureRef.current.handleRelease(g.dx, g.dy),
      onPanResponderTerminate: () => gestureRef.current.handleRelease(0, 0),
    }),
  ).current;

  const springBack = () =>
    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: native, bounciness: 6, speed: 16 }).start();
  const settleIn = () => {
    if (!mounted.current) return;
    pan.setValue({ x: 0, y: 56 });
    Animated.timing(pan, { toValue: { x: 0, y: 0 }, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  };
  settleInRef.current = settleIn;
  const flingUp = (after: () => void) =>
    Animated.timing(pan, { toValue: { x: 0, y: -height }, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: native }).start(() => {
      after();
      settleIn();
    });
  const flingSide = (dir: 'left' | 'right', after: () => void) =>
    Animated.timing(pan, { toValue: { x: dir === 'right' ? width : -width, y: 0 }, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: native }).start(() => {
      after();
      settleIn();
    });

  // Resolve room + current user once.
  useEffect(() => {
    let active = true;
    (async () => {
      const [id, r] = await Promise.all([getCurrentUserId(), getRoomByCode(code)]);
      if (!active) return;
      setUserId(id);
      setRoom(r);
      if (!r) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [code]);

  // Initial load + Realtime subscriptions. Host renders its own engine state and
  // only listens for votes; everyone else listens for room_state + votes.
  useEffect(() => {
    if (!room) return;
    let active = true;

    (async () => {
      if (isHost) {
        // Wait for persisted config (players, types, orders) to finish loading
        // before judging the engine — otherwise a reload could misread a not-yet
        // hydrated store as unrecoverable.
        await new Promise<void>((resolve) => {
          if (useGameStore.persist.hasHydrated()) return resolve();
          const unsub = useGameStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        });
        if (!active) return;
        const local = buildSnapshotFromStore();
        if (local.cardId) {
          // Normal host flow: the live engine is in memory.
          setSnapshot(local);
          setLoading(false);
        } else {
          // Host reloaded mid-match — only config persists, so the live engine
          // was lost. Recover from the authoritative snapshot before allowing
          // any action, so we never push a blank card or restart at round 1.
          const st = await getRoomState(room.id);
          if (!active) return;
          if (st && st.status === 'finished') {
            setSnapshot(st.snapshot);
            setStatus('finished');
          } else if (st && st.snapshot?.cardId && rehydrateFromSnapshot(st.snapshot)) {
            // Engine rebuilt — resume in place with valid host controls.
            setSnapshot(buildSnapshotFromStore());
            setStatus('playing');
          } else if (st) {
            // Couldn't rebuild — lock controls and offer a recovery state.
            setSnapshot(st.snapshot);
            setStatus(st.status);
            setHostRecovery(true);
          }
          setLoading(false);
        }
      } else {
        const st = await getRoomState(room.id);
        if (active && st) {
          setSnapshot(st.snapshot);
          setStatus(st.status);
        }
        if (active) setLoading(false);
      }
    })();

    const onStatus = (s: RealtimeStatus) => {
      if (!active) return;
      if (s === 'SUBSCRIBED') setRealtimeOk(true);
      else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') setRealtimeOk(false);
    };

    const unsubState = isHost
      ? () => {}
      : subscribeRoomState(
          room.id,
          (row) => {
            setSnapshot(row.snapshot);
            setStatus(row.status);
          },
          onStatus,
        );
    const unsubVotes = subscribeRoomVotes(
      room.id,
      async () => {
        const v = await getVotes(room.id, snapRef.current?.turnIndex ?? 0);
        if (active) setVotes(v);
      },
      onStatus,
    );

    return () => {
      active = false;
      unsubState();
      unsubVotes();
    };
  }, [room, isHost]);

  // Refresh the vote list whenever the card (turn) changes.
  const turnIndex = snapshot?.turnIndex;
  useEffect(() => {
    if (!room || turnIndex == null) return;
    let active = true;
    getVotes(room.id, turnIndex).then((v) => {
      if (active) setVotes(v);
    });
    return () => {
      active = false;
    };
  }, [room, turnIndex]);

  // Non-host: gently slide the new card in whenever the host advances or reveals,
  // so a synced change reads as a fresh card rather than a silent text swap.
  useEffect(() => {
    if (!isHost && turnIndex != null) settleInRef.current();
  }, [isHost, turnIndex, snapshot?.showResult]);

  // Fallback polling ONLY while Realtime is not connected.
  useEffect(() => {
    if (!room || realtimeOk) return;
    let active = true;
    const poll = async () => {
      try {
        // Non-host catches up on the authoritative snapshot; everyone refreshes votes.
        if (!isHost) {
          const st = await getRoomState(room.id);
          if (active && st) {
            setSnapshot(st.snapshot);
            setStatus(st.status);
          }
        }
        const v = await getVotes(room.id, snapRef.current?.turnIndex ?? 0);
        if (active) setVotes(v);
      } catch {
        // transient
      }
    };
    const interval = setInterval(poll, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [room, isHost, realtimeOk]);

  // ── Host actions (push authoritative snapshots) ─────────────────────────────
  const pushSnapshot = async (snap: OnlineSnapshot, next: 'playing' | 'finished') => {
    if (!room) return;
    // Never broadcast a blank card while the match is live (defends against a
    // lost/empty engine after a reload).
    if (next === 'playing' && !snap.cardId) return;
    setSnapshot(snap);
    setStatus(next);
    await upsertRoomState(room.id, next, snap);
  };

  const onAdvance = async () => {
    if (!room || busy) return;
    setBusy(true);
    try {
      if (isFinalTurnNow()) {
        await pushSnapshot(buildSnapshotFromStore(), 'finished');
        await setRoomStatus(room.id, 'finished');
      } else {
        useGameStore.getState().nextTurn();
        await pushSnapshot(buildSnapshotFromStore(), 'playing');
      }
    } catch {
      // host can retry
    } finally {
      setBusy(false);
    }
  };

  const onReveal = async () => {
    if (!room || busy || !snapshot) return;
    setBusy(true);
    try {
      const v = await getVotes(room.id, snapshot.turnIndex);
      setVotes(v);
      await pushSnapshot(buildSnapshotFromStore({ showResult: true, voteWinners: computeWinners(v) }), 'playing');
    } catch {
      // retry
    } finally {
      setBusy(false);
    }
  };

  const onTruth = async (outcome: 'answered' | 'drank') => {
    if (!room || busy) return;
    setBusy(true);
    try {
      useGameStore.getState().recordTruthOutcome(outcome);
      if (isFinalTurnNow()) {
        await pushSnapshot(buildSnapshotFromStore(), 'finished');
        await setRoomStatus(room.id, 'finished');
      } else {
        useGameStore.getState().nextTurn();
        await pushSnapshot(buildSnapshotFromStore(), 'playing');
      }
    } catch {
      // retry
    } finally {
      setBusy(false);
    }
  };

  const onVote = async (name: string) => {
    if (!room || !snapshot || !userId) return;
    setVotes((prev) =>
      prev.some((v) => v.voter_id === userId) ? prev : [...prev, { voter_id: userId, voted_name: name }],
    );
    try {
      await castVote(room.id, snapshot.turnIndex, name);
    } catch {
      // duplicate / transient
    }
  };

  const copyCode = async () => {
    try {
      await Clipboard.setStringAsync(code);
    } catch {
      // non-critical
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Non-host leaving removes only their own room_players row (best-effort), then
  // navigates home. The host's leave/end paths finish the room for everyone.
  const leave = async () => {
    setMenuOpen(false);
    try {
      if (room && !isHost) await leaveRoom(room.id);
    } catch {
      // best-effort — navigate regardless
    }
    router.replace('/home');
  };

  const endMatch = async () => {
    setMenuOpen(false);
    if (room && snapshot) {
      try {
        await pushSnapshot(snapshot, 'finished');
        await setRoomStatus(room.id, 'finished');
      } catch {
        // ignore
      }
    }
    router.replace('/home');
  };

  // Host leaving finishes the room for everyone and flags it so non-hosts see
  // "El anfitrión salió de la partida" instead of being left frozen.
  const hostLeave = async () => {
    setMenuOpen(false);
    if (room) {
      try {
        const snap = snapshot ?? buildSnapshotFromStore();
        await pushSnapshot({ ...snap, endedReason: 'host-left' }, 'finished');
        await setRoomStatus(room.id, 'finished');
      } catch {
        // ignore — navigate regardless
      }
    }
    router.replace('/home');
  };

  // ── Derived view state ──────────────────────────────────────────────────────
  const finished = status === 'finished';
  const isVote = snapshot?.cardType === 'votaciones';
  const isTruth = snapshot?.cardType === 'verdad-o-toma';
  const showResult = snapshot?.showResult ?? false;
  const hasVoted = votes.some((v) => v.voter_id === userId);

  // V1 authority: the host controls every gesture that changes the match
  // (advance, reveal, and Verdad o Toma left/right). Non-hosts watch in realtime
  // and only tap to vote — so the match never blocks on a non-host action.
  // Truth → host swipes L/R. Other cards → host swipes up.
  // Recovery locks all host controls so a lost engine can't push bad state.
  const gesturesEnabled = isHost && !hostRecovery;
  const swipeTruth = gesturesEnabled && isTruth;

  // Host swipes the current player's Verdad o Toma outcome regardless of whose
  // turn it is, so the match always advances (host = source of truth).
  const answerTruth = (outcome: 'answered' | 'drank') => {
    flingSide(outcome === 'answered' ? 'right' : 'left', () => onTruth(outcome));
  };

  gestureRef.current = {
    shouldSet: (dx, dy) => {
      if (!gesturesEnabled || !snapshot) return false;
      return swipeTruth
        ? Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy)
        : dy < -14 && Math.abs(dy) > Math.abs(dx);
    },
    handleMove: (dx, dy) => {
      if (swipeTruth) pan.setValue({ x: dx, y: dy * 0.12 });
      else pan.setValue({ x: 0, y: Math.min(0, dy) });
    },
    handleRelease: (dx, dy) => {
      if (!gesturesEnabled) return springBack();
      if (swipeTruth) {
        if (dx > SWIPE_THRESHOLD) return answerTruth('answered');
        if (dx < -SWIPE_THRESHOLD) return answerTruth('drank');
        return springBack();
      }
      if (dy < -SWIPE_THRESHOLD) {
        if (isVote && !showResult) {
          if (votes.length > 0) onReveal();
          return springBack();
        }
        return flingUp(() => onAdvance());
      }
      return springBack();
    },
  };

  if (loading) {
    return (
      <View style={styles.bg}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </View>
    );
  }
  if (!room || !snapshot) {
    return (
      <View style={styles.bg}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.center}>
            <Text style={styles.waiting}>No se pudo cargar la partida.</Text>
            <AppButton label="Salir" variant="secondary" onPress={() => router.replace('/home')} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const voteTally: Record<string, number> = {};
  votes.forEach((v) => {
    voteTally[v.voted_name] = (voteTally[v.voted_name] ?? 0) + 1;
  });

  const cardColor = snapshot.isPlayerScoped ? snapshot.playerColor ?? colors.surface : colors.surface;
  const roundLabel = snapshot.maxRounds
    ? `RONDA ${snapshot.round} DE ${snapshot.maxRounds}`
    : `RONDA ${snapshot.round}`;

  // Bottom hint — role aware. The host sees its available gesture; non-hosts see
  // a passive, non-blocking status (who the card is for, or "follow along").
  let hint = '';
  if (isHost) {
    if (isTruth) hint = '←  Tomó      Respondió  →';
    else if (isVote && !showResult)
      hint = votes.length > 0 ? 'Desliza arriba para ver el resultado' : 'Esperando votos…';
    else hint = snapshot.isFinal ? 'Desliza arriba para terminar' : 'Desliza arriba para continuar';
  } else if (isVote && !showResult && !hasVoted) {
    hint = 'Toca a un jugador para votar';
  } else if (snapshot.isPlayerScoped) {
    hint = `Le toca a ${snapshot.playerName}`;
  } else {
    hint = 'Sigue la partida en tiempo real';
  }

  // The current user's pick — stays outlined after voting (one vote per user).
  const myVote = votes.find((v) => v.voter_id === userId)?.voted_name ?? null;
  const voteContent = isVote ? (
    <VoteList
      options={snapshot.players.map((p) => ({
        key: p.name,
        name: p.name,
        color: p.color ?? colors.accent,
      }))}
      counts={voteTally}
      showResult={showResult}
      winners={snapshot.voteWinners}
      selectedKey={myVote}
      disabled={showResult || hasVoted}
      landscape={landscape}
      onSelect={onVote}
    />
  ) : null;

  const cardTransform = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      { rotate: pan.x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-7deg', '0deg', '7deg'] }) },
    ],
  };

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <View style={styles.top}>
            <View style={styles.roundPill}>
              <Text style={styles.roundText}>{finished ? 'PARTIDA TERMINADA' : roundLabel}</Text>
            </View>
            <Pressable onPress={() => setMenuOpen(true)} hitSlop={12} style={styles.pauseBtn}>
              <Pause size={20} color={colors.accentSoft} />
            </Pressable>
          </View>

          {snapshot.activeRules.length > 0 && (
            <View style={styles.rules}>
              {snapshot.activeRules.map((rule) => (
                <View key={rule.id} style={styles.ruleChip}>
                  <Text style={styles.ruleText} numberOfLines={2}>
                    {rule.text}
                  </Text>
                  <View style={styles.roundsBadge}>
                    <Text style={styles.roundsBadgeText}>
                      {rule.roundsLeft} {rule.roundsLeft === 1 ? 'ronda' : 'rondas'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {finished ? (
            <View style={styles.center}>
              <Text style={styles.finishedTitle}>
                {snapshot.endedReason === 'host-left'
                  ? 'El anfitrión salió de la partida'
                  : '¡Partida terminada!'}
              </Text>
              <Text style={styles.waiting}>
                {snapshot.endedReason === 'host-left'
                  ? 'La partida se cerró.'
                  : 'Gracias por jugar en ChupiRoom.'}
              </Text>
              <AppButton label="Salir" onPress={() => router.replace('/home')} style={styles.finishBtn} />
            </View>
          ) : hostRecovery ? (
            <View style={styles.center}>
              <Text style={styles.finishedTitle}>No se pudo recuperar la partida</Text>
              <Text style={styles.waiting}>
                Se perdió la sincronización al recargar. Termina la partida para cerrarla o sal de ella.
              </Text>
              <AppButton label="Terminar partida" onPress={endMatch} style={styles.finishBtn} />
              <AppButton label="Salir" variant="secondary" onPress={() => router.replace('/home')} />
            </View>
          ) : (
            <>
              <View style={styles.cardArea}>
                {/* Only the host gets gesture handlers — non-hosts are passive
                    viewers (their only interaction is tapping to vote). */}
                <Animated.View
                  {...(isHost ? panResponder.panHandlers : {})}
                  style={[styles.card, { backgroundColor: cardColor }, cardTransform]}
                >
                  <GameCard
                    cardType={snapshot.cardType}
                    isPlayerScoped={snapshot.isPlayerScoped}
                    playerName={snapshot.playerName}
                    cardText={snapshot.cardText}
                    landscape={landscape}
                  >
                    {voteContent}
                  </GameCard>
                </Animated.View>
              </View>

              <View style={styles.peek} pointerEvents="none">
                {gesturesEnabled && !swipeTruth && <ChevronUp size={15} color={colors.accentSoft} />}
                <Text style={styles.peekHint}>{hint}</Text>
              </View>
            </>
          )}
        </View>

        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>Partida en línea</Text>
              <AppButton
                label={copied ? '¡Código copiado!' : 'Copiar código de partida'}
                variant="secondary"
                onPress={copyCode}
              />
              {isHost ? (
                <>
                  <AppButton label="Continuar" onPress={() => setMenuOpen(false)} />
                  <AppButton label="Terminar partida" variant="secondary" onPress={endMatch} />
                  <AppButton label="Salir" variant="danger" onPress={hostLeave} />
                </>
              ) : (
                <AppButton label="Salir de la partida" variant="danger" onPress={leave} />
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roundPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roundText: { color: colors.accentSoft, fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 1.5 },
  pauseBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rules: { marginTop: spacing.md, gap: spacing.xs },
  ruleChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  ruleText: { flex: 1, color: colors.white, fontSize: fontSize.sm, fontWeight: '600', lineHeight: 19 },
  roundsBadge: {
    flexShrink: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(224,221,238,0.14)',
  },
  roundsBadgeText: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '800' },
  cardArea: { flex: 1, marginTop: spacing.md },
  card: {
    flex: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    userSelect: 'none',
  },
  peek: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 40,
    marginTop: spacing.sm,
  },
  peekHint: { color: colors.accentSoft, fontSize: fontSize.sm, fontWeight: '700', letterSpacing: 0.3 },
  waiting: { color: colors.mutedText, fontSize: fontSize.md, textAlign: 'center', fontWeight: '600' },
  finishedTitle: { color: colors.white, fontSize: fontSize.xxl, fontWeight: '900', letterSpacing: -0.8 },
  finishBtn: { alignSelf: 'stretch', marginTop: spacing.md },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
});
