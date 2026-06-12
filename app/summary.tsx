import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Home, Layers, MessageCircle, RotateCcw, Timer, Trophy, Users, Vote, Zap } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Screen } from '@/components/Screen';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { cardTypeMeta } from '@/data/cards';
import { useGameStore } from '@/store/useGameStore';
import type { CardType } from '@/types/game';

const TYPE_ICON: Record<CardType, ComponentType<{ size?: number; color?: string }>> = {
  retos: Zap,
  'yo-nunca': Users,
  votaciones: Vote,
  'verdad-o-toma': MessageCircle,
  categorias: Layers,
  'reglas-temporales': Timer,
};

export default function SummaryScreen() {
  const router = useRouter();
  const lastSession = useGameStore((s) => s.lastSession);
  const startGame = useGameStore((s) => s.startGame);
  const resetGame = useGameStore((s) => s.resetGame);

  // No finished game to show — go home.
  useEffect(() => {
    if (!lastSession) router.replace('/home');
  }, [lastSession, router]);

  if (!lastSession) return <Screen />;

  const { players, cardTypes, mode, roundsPlayed } = lastSession;
  const history = lastSession.history ?? [];
  const cardsPlayed = history.length;
  const modeLabel = mode === 'caos' ? 'Caos' : 'Clásico';

  // Breakdown by juego type.
  const breakdown = cardTypes.map((type) => ({
    type,
    count: history.filter((h) => h.type === type).length,
  }));

  // Most active player = most retos directed at them.
  const counts = new Map<string, number>();
  for (const h of history) {
    if (h.type === 'retos' && h.playerName) {
      counts.set(h.playerName, (counts.get(h.playerName) ?? 0) + 1);
    }
  }
  let mostActive: { name: string; count: number } | null = null;
  for (const [name, count] of counts) {
    if (!mostActive || count > mostActive.count) mostActive = { name, count };
  }
  const mostActiveColor = mostActive
    ? (players.find((p) => p.name === mostActive!.name)?.color ?? colors.accent)
    : colors.accent;

  // Votaciones recap (only meaningful if vote cards were played).
  const voteCards = history.filter((h) => h.type === 'votaciones');
  const voteWins = new Map<string, number>();
  let voteTies = 0;
  for (const c of voteCards) {
    const winners = c.voteWinners ?? [];
    if (winners.length > 1) voteTies += 1;
    for (const name of winners) voteWins.set(name, (voteWins.get(name) ?? 0) + 1);
  }
  const maxWins = players.reduce((m, p) => Math.max(m, voteWins.get(p.name) ?? 0), 0);
  const voteLeaders = maxWins > 0 ? players.filter((p) => (voteWins.get(p.name) ?? 0) === maxWins) : [];
  const voteBoard = players
    .map((p) => ({ id: p.id, name: p.name, color: p.color, wins: voteWins.get(p.name) ?? 0 }))
    .sort((a, b) => b.wins - a.wins);
  const joinNames = (names: string[]) =>
    names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;

  // Verdad o toma recap (only meaningful if such cards were played).
  const truthCards = history.filter((h) => h.type === 'verdad-o-toma');
  const answered = new Map<string, number>();
  const drank = new Map<string, number>();
  for (const c of truthCards) {
    if (!c.playerName) continue;
    if (c.outcome === 'answered') answered.set(c.playerName, (answered.get(c.playerName) ?? 0) + 1);
    else if (c.outcome === 'drank') drank.set(c.playerName, (drank.get(c.playerName) ?? 0) + 1);
  }
  const topOf = (m: Map<string, number>) => {
    let best: { name: string; count: number } | null = null;
    for (const [name, count] of m) if (!best || count > best.count) best = { name, count };
    return best;
  };
  const topAnswered = topOf(answered);
  const topDrank = topOf(drank);
  const colorOf = (name: string) => players.find((p) => p.name === name)?.color ?? colors.accent;

  // Reglas temporales recap.
  const rulesActivated = history.filter((h) => h.type === 'reglas-temporales').length;

  const playAgain = () => {
    startGame();
    router.replace('/game');
  };

  const goHome = () => {
    resetGame();
    router.replace('/home');
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.hero}>
        <LinearGradient
          colors={['#E0DDEE', '#CFCBDD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.trophy}
        >
          <Trophy size={44} color={colors.background} />
        </LinearGradient>
        <Text style={styles.title}>¡Partida terminada!</Text>
        <Text style={styles.gameName}>{lastSession.gameName}</Text>
      </View>

      {/* Headline stats */}
      <View style={styles.statsRow}>
        <AppCard style={styles.statCard}>
          <Text style={styles.statValue}>{roundsPlayed}</Text>
          <Text style={styles.statLabel}>Rondas</Text>
        </AppCard>
        <AppCard style={styles.statCard}>
          <Text style={styles.statValue}>{cardsPlayed}</Text>
          <Text style={styles.statLabel}>Cartas</Text>
        </AppCard>
        <AppCard style={styles.statCard}>
          <Text style={styles.statValue}>{players.length}</Text>
          <Text style={styles.statLabel}>Jugadores</Text>
        </AppCard>
      </View>

      {/* Modo + Juegos recap */}
      <AppCard style={styles.recapCard}>
        <View style={styles.recapRow}>
          <Text style={styles.recapLabel}>Modo</Text>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{modeLabel}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.recapRow}>
          <Text style={styles.recapLabel}>Juegos</Text>
          <View style={styles.chipsWrap}>
            {cardTypes.map((type) => (
              <View key={type} style={styles.chip}>
                <Text style={styles.chipText}>{cardTypeMeta[type].label}</Text>
              </View>
            ))}
          </View>
        </View>
      </AppCard>

      {/* Most active player */}
      <Text style={styles.sectionTitle}>Jugador más activo</Text>
      <AppCard style={styles.mvpCard}>
        {mostActive ? (
          <>
            <PlayerAvatar name={mostActive.name} color={mostActiveColor} size={52} />
            <View style={styles.mvpText}>
              <Text style={styles.mvpName}>{mostActive.name}</Text>
              <Text style={styles.mvpMeta}>
                {mostActive.count} {mostActive.count === 1 ? 'reto' : 'retos'} en su contra
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.groupBadge}>
              <Users size={24} color={colors.accentSoft} />
            </View>
            <View style={styles.mvpText}>
              <Text style={styles.mvpName}>Todo el grupo</Text>
              <Text style={styles.mvpMeta}>Partida en grupo, sin destacado</Text>
            </View>
          </>
        )}
      </AppCard>

      {/* Breakdown by juego */}
      <Text style={styles.sectionTitle}>Desglose por juego</Text>
      <AppCard style={styles.breakdownCard}>
        {breakdown.map(({ type, count }, i) => {
          const Icon = TYPE_ICON[type];
          const pct = cardsPlayed > 0 ? Math.round((count / cardsPlayed) * 100) : 0;
          return (
            <View key={type} style={[styles.breakRow, i > 0 && styles.breakRowSpaced]}>
              <View style={styles.breakHead}>
                <View style={styles.breakIcon}>
                  <Icon size={18} color={colors.accentSoft} />
                </View>
                <Text style={styles.breakLabel}>{cardTypeMeta[type].label}</Text>
                <Text style={styles.breakCount}>{count}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%` }]} />
              </View>
            </View>
          );
        })}
      </AppCard>

      {/* Votaciones recap — hidden when no vote cards were played */}
      {voteCards.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Votaciones</Text>
          <AppCard style={styles.recapCard}>
            <View style={styles.chipsWrap}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  {voteCards.length} {voteCards.length === 1 ? 'votación' : 'votaciones'}
                </Text>
              </View>
              {voteTies > 0 && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>
                    {voteTies} {voteTies === 1 ? 'empate' : 'empates'}
                  </Text>
                </View>
              )}
            </View>

            {voteLeaders.length > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.mvpRow}>
                  {voteLeaders.length === 1 ? (
                    <PlayerAvatar name={voteLeaders[0].name} color={voteLeaders[0].color} size={44} />
                  ) : (
                    <View style={styles.groupBadge}>
                      <Vote size={22} color={colors.accentSoft} />
                    </View>
                  )}
                  <View style={styles.mvpText}>
                    <Text style={styles.recapLabel}>Más votado</Text>
                    <Text style={styles.mvpName}>{joinNames(voteLeaders.map((p) => p.name))}</Text>
                    <Text style={styles.mvpMeta}>
                      {maxWins} {maxWins === 1 ? 'victoria' : 'victorias'}
                      {voteLeaders.length > 1 ? ' cada uno' : ''}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </AppCard>

          <AppCard style={styles.breakdownCard}>
            {voteBoard.map((row, i) => (
              <View key={row.id} style={[styles.winRow, i > 0 && styles.breakRowSpaced]}>
                <PlayerAvatar name={row.name} color={row.color} size={32} />
                <Text style={styles.winName}>{row.name}</Text>
                <Text style={styles.winCount}>
                  {row.wins} {row.wins === 1 ? 'victoria' : 'victorias'}
                </Text>
              </View>
            ))}
          </AppCard>
        </>
      )}

      {/* Verdad o toma recap — hidden when no such cards were played */}
      {truthCards.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Verdad o toma</Text>
          <AppCard style={styles.recapCard}>
            <View style={styles.chipsWrap}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  {truthCards.length} {truthCards.length === 1 ? 'carta' : 'cartas'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />
            <View style={styles.mvpRow}>
              {topAnswered ? (
                <PlayerAvatar name={topAnswered.name} color={colorOf(topAnswered.name)} size={44} />
              ) : (
                <View style={styles.groupBadge}>
                  <MessageCircle size={22} color={colors.accentSoft} />
                </View>
              )}
              <View style={styles.mvpText}>
                <Text style={styles.recapLabel}>Respondió más</Text>
                <Text style={styles.mvpName}>{topAnswered ? topAnswered.name : 'Nadie'}</Text>
                {topAnswered && (
                  <Text style={styles.mvpMeta}>
                    {topAnswered.count} {topAnswered.count === 1 ? 'respuesta' : 'respuestas'}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />
            <View style={styles.mvpRow}>
              {topDrank ? (
                <PlayerAvatar name={topDrank.name} color={colorOf(topDrank.name)} size={44} />
              ) : (
                <View style={styles.groupBadge}>
                  <MessageCircle size={22} color={colors.accentSoft} />
                </View>
              )}
              <View style={styles.mvpText}>
                <Text style={styles.recapLabel}>Tomó más</Text>
                <Text style={styles.mvpName}>{topDrank ? topDrank.name : 'Nadie'}</Text>
                {topDrank && (
                  <Text style={styles.mvpMeta}>
                    {topDrank.count} {topDrank.count === 1 ? 'trago' : 'tragos'}
                  </Text>
                )}
              </View>
            </View>
          </AppCard>
        </>
      )}

      {/* Reglas temporales recap — hidden when none were activated */}
      {rulesActivated > 0 && (
        <>
          <Text style={styles.sectionTitle}>Reglas temporales</Text>
          <AppCard style={styles.recapCard}>
            <View style={styles.chipsWrap}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  {rulesActivated} {rulesActivated === 1 ? 'regla activada' : 'reglas activadas'}
                </Text>
              </View>
            </View>
          </AppCard>
        </>
      )}

      {/* Players */}
      <Text style={styles.sectionTitle}>Jugadores</Text>
      <View style={styles.players}>
        {players.map((player) => (
          <AppCard key={player.id} style={styles.playerRow}>
            <PlayerAvatar name={player.name} color={player.color} />
            <Text style={styles.playerName}>{player.name}</Text>
          </AppCard>
        ))}
      </View>

      <View style={styles.actions}>
        <AppButton
          label="Jugar otra vez"
          icon={<RotateCcw size={20} />}
          onPress={playAgain}
        />
        <AppButton
          label="Volver al inicio"
          variant="secondary"
          icon={<Home size={20} />}
          onPress={goHome}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  trophy: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  title: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  gameName: {
    color: colors.accentSoft,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  statValue: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.mutedText,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recapCard: {
    gap: spacing.md,
  },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  recapLabel: {
    color: colors.mutedText,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    flexShrink: 1,
    justifyContent: 'flex-end',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  mvpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  groupBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mvpText: {
    flex: 1,
    gap: 2,
  },
  mvpName: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  mvpMeta: {
    color: colors.mutedText,
    fontSize: fontSize.sm,
  },
  mvpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  winRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  winName: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  winCount: {
    color: colors.accentSoft,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  breakdownCard: {
    gap: spacing.md,
  },
  breakRow: {
    gap: spacing.sm,
  },
  breakRowSpaced: {
    marginTop: spacing.sm,
  },
  breakHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  breakIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakLabel: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  breakCount: {
    color: colors.accentSoft,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  players: {
    gap: spacing.sm,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  playerName: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
