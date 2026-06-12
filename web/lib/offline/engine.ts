/**
 * Web-only offline demo engine. Pure, dependency-free, browser-safe (no
 * Supabase). Mirrors the mobile rotation/round/rule logic at a small scale for
 * the /play demo. Not the final shared game-core.
 */
import { OFFLINE_CARDS, type OfflineCard, type OfflineCardType } from "./cards";

export type OfflinePlayer = { id: string; name: string; color: string };
export type ActiveRule = { id: string; text: string; roundsLeft: number };

export type OfflineConfig = {
  players: OfflinePlayer[];
  selectedTypes: OfflineCardType[];
  maxRounds: number | null;
};

export type OfflineGame = {
  players: OfflinePlayer[];
  selectedTypes: OfflineCardType[];
  maxRounds: number | null;
  round: number;
  turnIndex: number;
  currentPlayerIndex: number;
  card: OfflineCard;
  cardText: string;
  isPlayerScoped: boolean;
  activeRules: ActiveRule[];
  usedIds: string[];
};

function renderText(card: OfflineCard, players: OfflinePlayer[], idx: number): string {
  const current = players[idx];
  let text = card.text.replaceAll("{{player}}", current?.name ?? "");
  if (text.includes("{{target}}")) {
    const others = players.filter((_, i) => i !== idx);
    const target = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : current;
    text = text.replaceAll("{{target}}", target?.name ?? "");
  }
  return text;
}

function drawNext(
  types: OfflineCardType[],
  used: string[],
  playerCount: number,
): { card: OfflineCard; usedIds: string[] } {
  const pool = OFFLINE_CARDS.filter(
    (c) => types.includes(c.type) && (c.minPlayers ?? 2) <= playerCount,
  );
  let available = pool.filter((c) => !used.includes(c.id));
  let nextUsed = used;
  if (available.length === 0) {
    available = pool;
    nextUsed = [];
  }
  const card = available[Math.floor(Math.random() * available.length)] ?? OFFLINE_CARDS[0];
  return { card, usedIds: [...nextUsed, card.id] };
}

export function startOfflineGame(config: OfflineConfig): OfflineGame {
  const count = Math.max(1, config.players.length);
  const { card, usedIds } = drawNext(config.selectedTypes, [], count);
  const cardText = renderText(card, config.players, 0);
  const activeRules: ActiveRule[] =
    card.type === "reglas-temporales" && card.durationRounds
      ? [{ id: `${card.id}@0`, text: cardText, roundsLeft: card.durationRounds }]
      : [];
  return {
    players: config.players,
    selectedTypes: config.selectedTypes,
    maxRounds: config.maxRounds,
    round: 1,
    turnIndex: 0,
    currentPlayerIndex: 0,
    card,
    cardText,
    isPlayerScoped: card.isPlayerScoped,
    activeRules,
    usedIds,
  };
}

/** Whether advancing from the current card ends the match (round limit reached). */
export function isFinalTurn(game: OfflineGame): boolean {
  const count = Math.max(1, game.players.length);
  return game.maxRounds !== null && Math.floor((game.turnIndex + 1) / count) + 1 > game.maxRounds;
}

export function advanceGame(game: OfflineGame): OfflineGame {
  const count = Math.max(1, game.players.length);
  const turnIndex = game.turnIndex + 1;
  const currentPlayerIndex = turnIndex % count;
  const round = Math.floor(turnIndex / count) + 1;

  // On a new round, age out temporary rules.
  let activeRules = game.activeRules;
  if (round > game.round) {
    activeRules = activeRules
      .map((r) => ({ ...r, roundsLeft: r.roundsLeft - 1 }))
      .filter((r) => r.roundsLeft > 0);
  }

  const { card, usedIds } = drawNext(game.selectedTypes, game.usedIds, count);
  const cardText = renderText(card, game.players, currentPlayerIndex);
  if (card.type === "reglas-temporales" && card.durationRounds) {
    activeRules = [...activeRules, { id: `${card.id}@${turnIndex}`, text: cardText, roundsLeft: card.durationRounds }];
  }

  return {
    ...game,
    turnIndex,
    currentPlayerIndex,
    round,
    card,
    cardText,
    isPlayerScoped: card.isPlayerScoped,
    activeRules,
    usedIds,
  };
}
