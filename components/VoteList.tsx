import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/PlayerAvatar';
import { colors, fontSize, radius, spacing } from '@/constants/theme';

export type VoteOption = { key: string; name: string; color: string };

type VoteListProps = {
  options: VoteOption[];
  /** Vote tally keyed by option.key. */
  counts: Record<string, number>;
  showResult: boolean;
  /** Winning option keys (highlighted once the result is revealed). */
  winners?: string[];
  /** The current user's pick — stays outlined after voting (online). */
  selectedKey?: string | null;
  disabled?: boolean;
  landscape?: boolean;
  onSelect?: (key: string) => void;
};

/**
 * Shared Votaciones option list used by both the offline and online play
 * screens, so the voting UI looks identical everywhere: rounded player rows
 * with an avatar, name, and a vote-count badge. The current pick / winner is
 * outlined in the accent colour.
 */
export function VoteList({
  options,
  counts,
  showResult,
  winners = [],
  selectedKey = null,
  disabled = false,
  landscape = false,
  onSelect,
}: VoteListProps) {
  return (
    <>
      {showResult && (
        <Text style={styles.resultHeader}>{winners.length > 1 ? '¡Empate!' : 'Más votado'}</Text>
      )}
      <View style={styles.voteList}>
        {options.map((o) => {
          const count = counts[o.key] ?? 0;
          const isWinner = showResult && winners.includes(o.key);
          const isSelected = selectedKey === o.key;
          const outlined = isWinner || isSelected;
          const countOn = count > 0 || isWinner;
          return (
            <Pressable
              key={o.key}
              onPress={() => onSelect?.(o.key)}
              disabled={disabled}
              style={[styles.voteRow, { width: landscape ? '48%' : '100%' }, outlined && styles.voteRowWin]}
            >
              <PlayerAvatar name={o.name} color={o.color} size={30} />
              <Text style={styles.voteName} numberOfLines={1}>
                {o.name}
              </Text>
              <View style={[styles.voteCount, countOn && styles.voteCountOn]}>
                <Text style={[styles.voteCountText, countOn && styles.voteCountTextOn]}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  resultHeader: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  voteList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  voteRowWin: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(224,221,238,0.12)',
  },
  voteName: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  voteCount: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteCountOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  voteCountText: {
    color: colors.accentSoft,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  voteCountTextOn: {
    color: colors.background,
  },
});
