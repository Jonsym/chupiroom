import { decks } from '@/data/cards';
import type { OnlineSnapshot } from '@/lib/rooms';
import { useGameStore } from '@/store/useGameStore';
import type { CardType } from '@/types/game';

/**
 * Build a renderable online snapshot from the host's local game store.
 * The host runs the normal game engine; this turns its current state into the
 * fully-resolved payload that every device renders.
 */
export function buildSnapshotFromStore(extra?: {
  showResult?: boolean;
  voteWinners?: string[];
}): OnlineSnapshot {
  const s = useGameStore.getState();
  const count = Math.max(1, s.players.length);
  const isFinal =
    s.maxRounds !== null && Math.floor((s.turnIndex + 1) / count) + 1 > s.maxRounds;
  const current = s.players[s.currentPlayerIndex];

  return {
    round: s.currentRound,
    turnIndex: s.turnIndex,
    playerName: current?.name ?? '',
    playerColor: current?.color ?? null,
    cardType: s.currentCard?.type ?? null,
    cardId: s.currentCard?.id ?? null,
    cardText: s.currentCardText,
    isPlayerScoped: s.currentCard?.requiresCurrentPlayer ?? false,
    activeRules: s.activeRules.map((r) => ({ id: r.id, text: r.text, roundsLeft: r.roundsLeft })),
    showResult: extra?.showResult ?? false,
    voteWinners: extra?.voteWinners ?? [],
    selectedCardTypes: s.selectedCardTypes,
    maxRounds: s.maxRounds,
    isFinal,
    players: s.players.map((p) => ({ name: p.name, color: p.color })),
  };
}

/** Whether the host's current card is the final turn (advancing ends the match). */
export function isFinalTurnNow(): boolean {
  const s = useGameStore.getState();
  const count = Math.max(1, s.players.length);
  return s.maxRounds !== null && Math.floor((s.turnIndex + 1) / count) + 1 > s.maxRounds;
}

/**
 * Best-effort rebuild of the host's live engine from an authoritative snapshot,
 * used when the host reloads mid-match (only config — players, types, orders —
 * is persisted; the live card state is not). Restores enough to keep playing in
 * place: round, turn, current player, the current card and its active rules — so
 * the next advance continues correctly instead of restarting at round 1.
 *
 * Returns false when it can't safely rebuild (no players, or the card id is no
 * longer in the decks); the caller then locks host controls and offers recovery
 * rather than pushing a broken snapshot.
 *
 * Note: the full draw history can't be recovered from a snapshot, so the recap
 * starts fresh and some already-seen cards may eventually repeat — acceptable
 * over corrupting the match.
 */
export function rehydrateFromSnapshot(snapshot: OnlineSnapshot): boolean {
  const s = useGameStore.getState();
  if (s.players.length === 0) return false;

  const types = snapshot.selectedCardTypes as CardType[];
  const fromTypes = types.flatMap((t) => decks[t] ?? []);
  const card =
    fromTypes.find((c) => c.id === snapshot.cardId) ??
    Object.values(decks)
      .flat()
      .find((c) => c.id === snapshot.cardId);
  if (!card) return false;

  const count = Math.max(1, s.players.length);
  let idx = s.players.findIndex((p) => p.name === snapshot.playerName);
  if (idx < 0) idx = snapshot.turnIndex % count;

  useGameStore.setState({
    currentRound: snapshot.round,
    turnIndex: snapshot.turnIndex,
    currentPlayerIndex: idx,
    currentCard: card,
    currentCardText: snapshot.cardText,
    activeRules: snapshot.activeRules.map((r) => ({
      id: r.id,
      text: r.text,
      roundsLeft: r.roundsLeft,
    })),
    usedCardIds: [card.id],
    history: [],
  });
  return true;
}
