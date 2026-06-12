import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronUp, Pause, RotateCcw, Timer } from 'lucide-react-native';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { VoteList } from '@/components/VoteList';
import { colors, fontSize, gradients, radius, spacing } from '@/constants/theme';
import { useGameStore } from '@/store/useGameStore';
import type { CardType } from '@/types/game';

/** A pending destructive action awaiting confirmation in the pause sheet. */
type ConfirmAction = {
  title: string;
  message: string;
  actionLabel: string;
  danger: boolean;
  onConfirm: () => void;
};

const TYPE_LABEL: Record<CardType, string> = {
  retos: 'RETO DIRECTO',
  'yo-nunca': 'YO NUNCA NUNCA',
  votaciones: 'VOTACIÓN',
  'verdad-o-toma': 'VERDAD O TOMA',
  categorias: 'CATEGORÍA',
  'reglas-temporales': 'REGLA TEMPORAL',
};

/** Past this drag distance (px) a swipe commits instead of springing back. */
const SWIPE_THRESHOLD = 70;

/**
 * Standard, readable headline size shared by every card. The size is constant
 * for short/typical prompts (no more random huge or tiny text) and steps down
 * only for genuinely long text — a safe, predictable responsive adjustment.
 * `adjustsFontSizeToFit` then guards any remaining overflow.
 */
function cardFontSize(text: string, landscape: boolean) {
  const len = text.length;
  const base = landscape ? 26 : 31;
  let size = base;
  if (len > 170) size = base * 0.72;
  else if (len > 110) size = base * 0.84;
  else if (len > 70) size = base * 0.93;
  size = Math.round(Math.max(landscape ? 19 : 22, size));
  return { fontSize: size, lineHeight: Math.round(size * 1.22) };
}

export default function GameScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const native = Platform.OS !== 'web';

  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const currentRound = useGameStore((s) => s.currentRound);
  const turnIndex = useGameStore((s) => s.turnIndex);
  const maxRounds = useGameStore((s) => s.maxRounds);
  const currentCard = useGameStore((s) => s.currentCard);
  const currentCardText = useGameStore((s) => s.currentCardText);
  const activeRules = useGameStore((s) => s.activeRules);
  const selectedCardTypes = useGameStore((s) => s.selectedCardTypes);
  const roomCode = useGameStore((s) => s.roomCode);
  const nextTurn = useGameStore((s) => s.nextTurn);
  const endGame = useGameStore((s) => s.endGame);
  const startGame = useGameStore((s) => s.startGame);
  const resetGame = useGameStore((s) => s.resetGame);
  const recordVoteResult = useGameStore((s) => s.recordVoteResult);
  const recordTruthOutcome = useGameStore((s) => s.recordTruthOutcome);

  // Pause menu state.
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Local voting state, reset whenever a new card is shown.
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);
  useEffect(() => {
    setVotes({});
    setShowResult(false);
  }, [turnIndex]);

  // ── Round transition card (a swipeable system interstitial) ─────────────────
  // Holds the transition message while the card is shown, or null when hidden.
  const [transition, setTransition] = useState<string | null>(null);
  // Latest round + rule ids (read by the transition effect after commit).
  const liveRef = useRef<{ round: number; ruleIds: string[] }>({ round: 1, ruleIds: [] });
  liveRef.current = { round: currentRound, ruleIds: activeRules.map((r) => r.id) };
  const prevRef = useRef<{ round: number; ruleIds: string[] }>({ round: 1, ruleIds: [] });

  // When a new round begins (rules expired, or none active), interpose a
  // transition card before the next card. As a layout effect it runs before
  // paint, so the next card never flashes in front of the interstitial.
  useLayoutEffect(() => {
    const cur = liveRef.current;
    const prev = prevRef.current;
    if (cur.round > prev.round) {
      const curSet = new Set(cur.ruleIds);
      const expired = prev.ruleIds.some((rid) => !curSet.has(rid));
      if (expired) setTransition('Las reglas anteriores se descartaron.');
      else if (cur.ruleIds.length === 0) setTransition('Empezamos sin reglas activas.');
    }
    prevRef.current = cur;
  }, [turnIndex]);

  // ── Gesture / card animation ──────────────────────────────────────────────
  const pan = useRef(new Animated.ValueXY()).current;
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  // The PanResponder is created once; its handlers read the latest game state
  // through this ref (reassigned every render) to avoid stale closures.
  const gestureRef = useRef<{
    shouldSet: (dx: number, dy: number) => boolean;
    handleMove: (dx: number, dy: number) => void;
    handleRelease: (dx: number, dy: number) => void;
  }>({ shouldSet: () => false, handleMove: () => {}, handleRelease: () => {} });

  const panResponder = useRef(
    PanResponder.create({
      // Let taps (voting) reach the children; only claim deliberate drags.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => gestureRef.current.shouldSet(g.dx, g.dy),
      onPanResponderMove: (_, g) => gestureRef.current.handleMove(g.dx, g.dy),
      onPanResponderRelease: (_, g) => gestureRef.current.handleRelease(g.dx, g.dy),
      onPanResponderTerminate: () => gestureRef.current.handleRelease(0, 0),
    }),
  ).current;

  const canPlay = players.length >= 2 && selectedCardTypes.length > 0;

  // Safety net: if we land here without an active card (deep link / reload),
  // start the game when possible, otherwise bounce home.
  useEffect(() => {
    if (!canPlay) {
      router.replace('/home');
      return;
    }
    if (!currentCard) startGame();
  }, [canPlay, currentCard, router, startGame]);

  const currentPlayer = players[currentPlayerIndex];

  if (!currentPlayer || !currentCard) {
    return <View style={styles.flexBg} />;
  }

  const handleEnd = () => {
    endGame();
    router.replace('/summary');
  };

  // When a round limit is set, the match ends after the last player of the
  // final round — the next advance would push past the limit.
  const isFinalTurn =
    maxRounds !== null && Math.floor((turnIndex + 1) / players.length) + 1 > maxRounds;

  const handleNext = () => {
    if (isFinalTurn) {
      handleEnd();
      return;
    }
    nextTurn();
  };

  const roundLabel = maxRounds ? `RONDA ${currentRound} DE ${maxRounds}` : `RONDA ${currentRound}`;

  const isVote = currentCard.type === 'votaciones';
  const isTruth = currentCard.type === 'verdad-o-toma';
  // Player-scoped cards belong to the current player — paint the card their
  // colour so whose turn it is reads at a glance. Group cards stay neutral.
  const isPlayerScoped = currentCard.requiresCurrentPlayer;
  const text = currentCardText;

  const cardColor = isPlayerScoped ? currentPlayer.color : colors.surface;
  const onCard = isPlayerScoped ? colors.background : colors.white;
  const onCardDim = isPlayerScoped ? 'rgba(16,17,17,0.6)' : colors.mutedText;
  const labelColor = isPlayerScoped ? 'rgba(16,17,17,0.7)' : colors.accent;

  // Vote tally.
  const totalVotes = Object.values(votes).reduce((sum, n) => sum + n, 0);
  const maxVotes = players.reduce((m, p) => Math.max(m, votes[p.id] ?? 0), 0);
  const winners = maxVotes > 0 ? players.filter((p) => (votes[p.id] ?? 0) === maxVotes) : [];

  const castVote = (playerId: string) => {
    if (showResult) return;
    Haptics.selectionAsync().catch(() => {});
    setVotes((prev) => ({ ...prev, [playerId]: (prev[playerId] ?? 0) + 1 }));
  };

  // ── Animation helpers ──────────────────────────────────────────────────────
  const springBack = () => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: native,
      bounciness: 6,
      speed: 16,
    }).start();
  };
  // Slide the freshly-drawn card up into place (the feed advancing).
  const settleIn = () => {
    if (!mounted.current) return;
    pan.setValue({ x: 0, y: 56 });
    Animated.timing(pan, {
      toValue: { x: 0, y: 0 },
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: native,
    }).start();
  };
  const flingUp = (after: () => void) => {
    Animated.timing(pan, {
      toValue: { x: 0, y: -height },
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: native,
    }).start(() => {
      after();
      settleIn();
    });
  };
  const flingSide = (dir: 'left' | 'right', after: () => void) => {
    Animated.timing(pan, {
      toValue: { x: dir === 'right' ? width : -width, y: 0 },
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: native,
    }).start(() => {
      after();
      settleIn();
    });
  };

  // ── Store-driven actions ────────────────────────────────────────────────────
  const revealResult = () => {
    if (totalVotes === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    recordVoteResult(winners.map((p) => p.name));
    setShowResult(true);
  };
  const advance = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    handleNext();
  };
  const chooseOutcome = (outcome: 'answered' | 'drank') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    recordTruthOutcome(outcome);
    handleNext();
  };

  // Wire the gesture handlers with the current card's rules.
  // Horizontal (truth) gestures only apply to the real card, never the
  // transition interstitial — which always advances with a vertical swipe.
  const swipeTruth = isTruth && !transition;
  gestureRef.current = {
    shouldSet: (dx, dy) =>
      swipeTruth
        ? Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy)
        : dy < -14 && Math.abs(dy) > Math.abs(dx),
    handleMove: (dx, dy) => {
      if (swipeTruth) pan.setValue({ x: dx, y: dy * 0.12 });
      else pan.setValue({ x: 0, y: Math.min(0, dy) });
    },
    handleRelease: (dx, dy) => {
      // Transition card: swipe up to dismiss. Purely local — no store changes,
      // so history, turn count, rotation and maxRounds are untouched.
      if (transition) {
        if (dy < -SWIPE_THRESHOLD) return flingUp(() => setTransition(null));
        return springBack();
      }
      if (swipeTruth) {
        // Swipe right = Respondió, swipe left = Tomó.
        if (dx > SWIPE_THRESHOLD) return flingSide('right', () => chooseOutcome('answered'));
        if (dx < -SWIPE_THRESHOLD) return flingSide('left', () => chooseOutcome('drank'));
        return springBack();
      }
      if (dy < -SWIPE_THRESHOLD) {
        if (isVote && !showResult) {
          // Swipe up reveals the result only once at least one vote exists.
          if (totalVotes > 0) {
            revealResult();
            springBack();
          } else {
            springBack();
          }
          return;
        }
        // Normal / group cards (and votaciones after the result) advance.
        return flingUp(advance);
      }
      return springBack();
    },
  };

  const rotate = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-7deg', '0deg', '7deg'],
  });
  const cardTransform = {
    transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
  };

  // Bottom hint mirrors the available gesture for the current card / state.
  const advanceHint = isFinalTurn ? 'Desliza arriba para ver el resumen' : 'Desliza arriba para continuar';
  let hintText: string;
  if (transition) hintText = 'Desliza para continuar';
  else if (isTruth) hintText = '←  Tomó      Respondió  →';
  else if (isVote && !showResult)
    hintText = totalVotes > 0 ? 'Desliza arriba para ver el resultado' : 'Toca a un jugador para votar';
  else hintText = advanceHint;

  // Cap the rules list so long/many rules scroll instead of squeezing the card.
  const rulesMaxHeight = Math.round(landscape ? height * 0.5 : height * 0.32);
  const headline = cardFontSize(text, landscape);
  const promptSize = landscape ? 18 : 22;

  // Pause menu actions (destructive ones go through an in-sheet confirmation).
  const closeMenu = () => {
    setMenuOpen(false);
    setConfirm(null);
  };
  const doRestart = () => {
    closeMenu();
    // Reset local voting state explicitly: a restart can land back on turnIndex 0,
    // where the turnIndex-keyed effect would not fire.
    setVotes({});
    setShowResult(false);
    startGame(); // keeps juegos, modo, players, duration and orders
  };
  const doEnd = () => {
    closeMenu();
    endGame();
    router.replace('/summary');
  };
  const doExit = () => {
    closeMenu();
    resetGame();
    router.replace('/home');
  };
  // Online matches only: copy the room code to share with players.
  const copyRoomCode = async () => {
    if (!roomCode) return;
    try {
      await Clipboard.setStringAsync(roomCode);
    } catch {
      // clipboard unavailable — non-critical
    }
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  };

  return (
    <LinearGradient colors={gradients.screen} style={styles.flexBg}>
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: Math.min(width, height) * 0.9,
            height: Math.min(width, height) * 0.9,
            borderRadius: Math.min(width, height) * 0.45,
          },
        ]}
      />
      <SafeAreaView style={styles.flexBg} edges={['top', 'bottom', 'left', 'right']}>
        <View style={[styles.container, landscape && styles.containerLandscape]}>
          {/* Top: round indicator + pause menu */}
          <View style={styles.top}>
            <View style={styles.roundPill}>
              <Text style={styles.roundText}>{roundLabel}</Text>
            </View>
            <Pressable onPress={() => setMenuOpen(true)} hitSlop={12} style={styles.pauseBtn}>
              <Pause size={20} color={colors.accentSoft} />
            </Pressable>
          </View>

          {/* Active temporary rules — compact premium chips (full text, scrolls if many) */}
          {activeRules.length > 0 && (
            <View style={styles.rules}>
              <View style={styles.rulesHeader}>
                <Timer size={13} color={colors.accent} strokeWidth={2.6} />
                <Text style={styles.rulesLabel}>REGLAS ACTIVAS</Text>
              </View>
              <ScrollView
                style={[styles.rulesScroll, { maxHeight: rulesMaxHeight }]}
                contentContainerStyle={styles.rulesList}
                showsVerticalScrollIndicator={false}
              >
                {activeRules.map((rule) => (
                  <View key={rule.id} style={styles.ruleChip}>
                    <Text style={styles.ruleText}>{rule.text}</Text>
                    <View style={styles.roundsBadge}>
                      <Text style={styles.roundsBadgeText}>
                        {rule.roundsLeft} {rule.roundsLeft === 1 ? 'ronda' : 'rondas'}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Swipeable current card (or the round-transition interstitial) */}
          <View style={styles.cardArea}>
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.card,
                transition ? styles.cardTransition : { backgroundColor: cardColor },
                cardTransform,
              ]}
            >
              {transition ? (
                <View style={styles.transitionInner}>
                  <View style={styles.transitionBadge}>
                    <RotateCcw size={26} color={colors.accent} strokeWidth={2.4} />
                  </View>
                  <Text style={styles.transitionTitle}>Nueva ronda</Text>
                  <Text style={styles.transitionText}>{transition}</Text>
                  <Text style={styles.transitionHelper}>Desliza para continuar</Text>
                </View>
              ) : (
                <>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.typeLabel, { color: labelColor }]}>
                      {TYPE_LABEL[currentCard.type]}
                    </Text>
                    {isPlayerScoped ? (
                      <View>
                    <Text style={[styles.leToca, { color: onCardDim }]}>LE TOCA A</Text>
                    <Text style={[styles.bigName, { color: onCard }]} numberOfLines={1}>
                      {currentPlayer.name}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.bigName, { color: onCard }]}>Para todo el grupo</Text>
                )}
              </View>

              <View style={[styles.cardBody, isVote && styles.cardBodyVote]}>
                {isVote ? (
                  <>
                    <Text
                      style={[
                        styles.votePrompt,
                        { color: onCard, fontSize: promptSize, lineHeight: promptSize + 6 },
                      ]}
                    >
                      {text}
                    </Text>
                    <VoteList
                      options={players.map((p) => ({ key: p.id, name: p.name, color: p.color }))}
                      counts={votes}
                      showResult={showResult}
                      winners={winners.map((w) => w.id)}
                      disabled={showResult}
                      landscape={landscape}
                      onSelect={castVote}
                    />
                  </>
                ) : (
                  <Text
                    style={[styles.headline, headline, { color: onCard }]}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    {text}
                  </Text>
                    )}
                  </View>
                </>
              )}
            </Animated.View>
          </View>

          {/* Peeking "next card" + gesture hint */}
          <View style={styles.peek} pointerEvents="none">
            <View style={styles.peekHandle} />
            <View style={styles.peekRow}>
              {!swipeTruth && <ChevronUp size={15} color={colors.accentSoft} />}
              <Text style={styles.peekHint}>{hintText}</Text>
            </View>
          </View>

        </View>

        {/* Pause / session menu */}
        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={closeMenu}>
          <Pressable style={styles.overlay} onPress={closeMenu}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.handle} />
              {confirm ? (
                <>
                  <Text style={styles.sheetTitle}>{confirm.title}</Text>
                  <Text style={styles.sheetMsg}>{confirm.message}</Text>
                  <AppButton
                    label={confirm.actionLabel}
                    variant={confirm.danger ? 'danger' : 'primary'}
                    onPress={confirm.onConfirm}
                  />
                  <AppButton label="Cancelar" variant="ghost" onPress={() => setConfirm(null)} />
                </>
              ) : (
                <>
                  <Text style={styles.sheetTitle}>Partida en pausa</Text>
                  <AppButton label="Continuar" onPress={closeMenu} />
                  {roomCode && (
                    <AppButton
                      label={codeCopied ? '¡Código copiado!' : 'Copiar código de partida'}
                      variant="secondary"
                      onPress={copyRoomCode}
                    />
                  )}
                  <AppButton
                    label="Reiniciar partida"
                    variant="secondary"
                    onPress={() =>
                      setConfirm({
                        title: 'Reiniciar partida',
                        message: 'Empezaréis de nuevo con la misma configuración.',
                        actionLabel: 'Reiniciar',
                        danger: false,
                        onConfirm: doRestart,
                      })
                    }
                  />
                  <AppButton
                    label="Terminar y ver resumen"
                    variant="secondary"
                    onPress={() =>
                      setConfirm({
                        title: 'Terminar partida',
                        message: 'Se cerrará la partida y verás el resumen.',
                        actionLabel: 'Terminar',
                        danger: false,
                        onConfirm: doEnd,
                      })
                    }
                  />
                  <AppButton
                    label="Salir al inicio"
                    variant="danger"
                    onPress={() =>
                      setConfirm({
                        title: 'Salir al inicio',
                        message: 'Se perderá la partida actual.',
                        actionLabel: 'Salir',
                        danger: true,
                        onConfirm: doExit,
                      })
                    }
                  />
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flexBg: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glow: {
    position: 'absolute',
    alignSelf: 'center',
    top: '18%',
    backgroundColor: colors.accent,
    opacity: 0.05,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  containerLandscape: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
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
  roundPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roundText: {
    color: colors.accentSoft,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  rules: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  rulesLabel: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  rulesScroll: {
    flexGrow: 0,
    alignSelf: 'stretch',
  },
  rulesList: {
    gap: spacing.xs,
  },
  ruleChip: {
    flexDirection: 'row',
    // Align to the top so the rounds badge stays put as the text wraps.
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
  },
  ruleText: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
    lineHeight: 19,
  },
  roundsBadge: {
    flexShrink: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(224,221,238,0.14)',
  },
  roundsBadgeText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  // Transition interstitial — a premium "system" card, distinct from challenges.
  cardTransition: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: 'rgba(224,221,238,0.32)',
  },
  transitionInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  transitionBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(224,221,238,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(224,221,238,0.25)',
    marginBottom: spacing.xs,
  },
  transitionTitle: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: '900',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  transitionText: {
    color: colors.accentSoft,
    fontSize: fontSize.lg,
    fontWeight: '600',
    lineHeight: 26,
    textAlign: 'center',
    maxWidth: 320,
  },
  transitionHelper: {
    color: colors.mutedText,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  // Card feed
  cardArea: {
    flex: 1,
    marginTop: spacing.md,
  },
  card: {
    flex: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    // Keep swipes clean — never start a text selection while dragging.
    userSelect: 'none',
  },
  cardHeader: {
    gap: spacing.xs,
  },
  typeLabel: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 2,
  },
  leToca: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: spacing.sm,
  },
  bigName: {
    fontSize: fontSize.xxl,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginTop: spacing.sm,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  cardBodyVote: {
    justifyContent: 'flex-start',
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  headline: {
    fontWeight: '900',
    letterSpacing: -1,
  },
  votePrompt: {
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  // Peeking next-card hint
  peek: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    marginTop: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
  },
  peekHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  peekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  peekHint: {
    color: colors.accentSoft,
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Pause sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
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
  sheetMsg: {
    color: colors.mutedText,
    fontSize: fontSize.md,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
});
