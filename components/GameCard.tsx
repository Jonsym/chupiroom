import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, spacing } from '@/constants/theme';
import type { CardType } from '@/types/game';

export const TYPE_LABEL: Record<CardType, string> = {
  retos: 'RETO DIRECTO',
  'yo-nunca': 'YO NUNCA NUNCA',
  votaciones: 'VOTACIÓN',
  'verdad-o-toma': 'VERDAD O TOMA',
  categorias: 'CATEGORÍA',
  'reglas-temporales': 'REGLA TEMPORAL',
};

/**
 * Standard, readable headline size — constant for typical prompts, stepping
 * down only for genuinely long text. Shared by offline + online play.
 */
export function cardFontSize(text: string, landscape: boolean) {
  const len = text.length;
  const base = landscape ? 26 : 31;
  let size = base;
  if (len > 170) size = base * 0.72;
  else if (len > 110) size = base * 0.84;
  else if (len > 70) size = base * 0.93;
  size = Math.round(Math.max(landscape ? 19 : 22, size));
  return { fontSize: size, lineHeight: Math.round(size * 1.22) };
}

/**
 * Presentational game card content (header + prompt). Wrap it in your own
 * surface View/Animated.View (which sets the background colour + gestures) and
 * pass game-type extras (e.g. the vote list) as `children`.
 */
export function GameCard({
  cardType,
  isPlayerScoped,
  playerName,
  cardText,
  landscape = false,
  children,
}: {
  cardType: CardType | null;
  isPlayerScoped: boolean;
  playerName: string;
  cardText: string;
  landscape?: boolean;
  children?: ReactNode;
}) {
  const isVote = cardType === 'votaciones';
  const onCard = isPlayerScoped ? colors.background : colors.white;
  const onCardDim = isPlayerScoped ? 'rgba(16,17,17,0.6)' : colors.mutedText;
  const labelColor = isPlayerScoped ? 'rgba(16,17,17,0.7)' : colors.accent;
  const headline = cardFontSize(cardText, landscape);
  const promptSize = landscape ? 18 : 22;

  return (
    <>
      <View style={styles.cardHeader}>
        <Text style={[styles.typeLabel, { color: labelColor }]}>
          {cardType ? TYPE_LABEL[cardType] : ''}
        </Text>
        {isPlayerScoped ? (
          <View>
            <Text style={[styles.leToca, { color: onCardDim }]}>LE TOCA A</Text>
            <Text style={[styles.bigName, { color: onCard }]} numberOfLines={1}>
              {playerName}
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
              {cardText}
            </Text>
            {children}
          </>
        ) : (
          <Text
            style={[styles.headline, headline, { color: onCard }]}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {cardText}
          </Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
});
