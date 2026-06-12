import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { decks, modeIntensities, renderCardText } from '@/data/cards';
import type {
  ActiveRule,
  CardType,
  GameCard,
  GameMode,
  GameSession,
  PlayedCard,
  PlayerOrder,
  PlayOrder,
  Player,
  TruthOutcome,
} from '@/types/game';

/**
 * Muted, premium palette cycled through as players are added.
 * Desaturated tones that stay on-brand with the #E0DDEE accent identity
 * while keeping players visually distinct.
 */
export const AVATAR_COLORS = [
  '#E0DDEE',
  '#9B98AC',
  '#C6A8A2',
  '#A6B5AE',
  '#B9B0C9',
  '#C9C2A8',
  '#A0AAB8',
  '#C2A6B4',
];

let idCounter = 0;
const makeId = () => `p${Date.now().toString(36)}${(idCounter++).toString(36)}`;

/**
 * Resolve the eligible card pool for the active types, mode and player count.
 *
 * Eligibility is layered with graceful fallbacks so the pool is never empty:
 *   1. Mode intensity + player count (the intended filter).
 *   2. Player count only (if the mode filter leaves nothing).
 *   3. All cards of the selected types (last-resort safety).
 */
function eligiblePool(types: CardType[], playerCount: number, mode: GameMode): GameCard[] {
  const all = types.flatMap((t) => decks[t]);
  const allowed = modeIntensities[mode];
  const fitsPlayers = all.filter((c) => c.minPlayers <= playerCount);
  const byMode = fitsPlayers.filter((c) => allowed.includes(c.intensity));
  if (byMode.length > 0) return byMode;
  if (fitsPlayers.length > 0) return fitsPlayers;
  return all;
}

/**
 * Draw the next card from the eligible pool of the selected card type(s).
 *
 * - Filtered by the selected mode's intensities and the player count (with fallbacks).
 * - Cards already seen (`used`) are skipped until the eligible pool is exhausted,
 *   then it reshuffles so the session never runs dry.
 * - `sequential` walks the pool in deck order; `random` picks an unseen card.
 *
 * Works for one type today and any number of types in a multi-game session.
 */
function drawCard(
  types: CardType[],
  used: string[],
  order: PlayOrder,
  playerCount: number,
  mode: GameMode,
): { card: GameCard; used: string[] } {
  const pool = eligiblePool(types, playerCount, mode);
  let available = pool.filter((c) => !used.includes(c.id));
  let nextUsed = used;
  if (available.length === 0) {
    available = pool;
    nextUsed = [];
  }
  const card =
    order === 'sequential'
      ? available[0]
      : available[Math.floor(Math.random() * available.length)];
  return { card, used: [...nextUsed, card.id] };
}

/** Resolve a drawn card's template text against the active player + the rest. */
function resolveText(card: GameCard, players: Player[], currentIndex: number): string {
  const current = players[currentIndex];
  const others = players.filter((_, i) => i !== currentIndex).map((p) => p.name);
  return renderCardText(card, current.name, others);
}

let ruleCounter = 0;
/** Create an active rule from a reglas-temporales card, or null otherwise. */
function ruleFromCard(card: GameCard, text: string): ActiveRule | null {
  if (card.type !== 'reglas-temporales' || !card.durationRounds) return null;
  return { id: `${card.id}@${ruleCounter++}`, text, roundsLeft: card.durationRounds };
}

/** Build a history entry for a card as it is shown to a player. */
function makeEntry(card: GameCard, round: number, player: Player): PlayedCard {
  return {
    cardId: card.id,
    type: card.type,
    round,
    playerName: card.requiresCurrentPlayer ? player.name : null,
    intensity: card.intensity,
  };
}

/** Resolve who plays next based on the chosen player order. */
function pickNextPlayerIndex(
  order: PlayerOrder,
  currentIndex: number,
  nextTurnIndex: number,
  count: number,
): number {
  if (count <= 1) return 0;
  if (order === 'sequential') return nextTurnIndex % count;
  // random: avoid handing two turns in a row to the same player
  let i = Math.floor(Math.random() * count);
  if (i === currentIndex) i = (i + 1) % count;
  return i;
}

type GameState = {
  // Session config
  gameName: string;
  players: Player[];
  selectedMode: GameMode;
  /** Primary selected type — the UI currently picks a single one. */
  selectedCardType: CardType | null;
  /** A session may combine several card types. */
  selectedCardTypes: CardType[];
  /** How the active deck(s) are traversed. */
  playOrder: PlayOrder;
  /** How the turn rotates between players. */
  playerOrder: PlayerOrder;
  /** Round limit for the match, or null for "sin límite". */
  maxRounds: number | null;
  /** Code of the online room this match belongs to, or null for offline play. */
  roomCode: string | null;

  // Live game
  currentRound: number;
  currentPlayerIndex: number;
  /** Total turns served this session; drives round and sequential rotation. */
  turnIndex: number;
  usedCardIds: string[];
  currentCard: GameCard | null;
  /** Template-resolved text of the current card (targets fixed for this turn). */
  currentCardText: string;
  /** Temporary table rules currently in effect. */
  activeRules: ActiveRule[];
  /** Cards shown so far this match (for the end recap). */
  history: PlayedCard[];

  // Summary of the most recently finished game
  lastSession: GameSession | null;

  // Actions
  setGameName: (name: string) => void;
  addPlayer: (name: string) => void;
  /** Replace the whole player list (used to seed a match from an online room). */
  setPlayers: (players: Player[]) => void;
  removePlayer: (id: string) => void;
  /** Set/clear the online room code for the current match. */
  setRoomCode: (code: string | null) => void;
  /** Manually override a player's colour (used by their Game card + avatar). */
  setPlayerColor: (id: string, color: string) => void;
  setSelectedMode: (mode: GameMode) => void;
  setSelectedCardType: (type: CardType) => void;
  setSelectedCardTypes: (types: CardType[]) => void;
  setPlayOrder: (order: PlayOrder) => void;
  setPlayerOrder: (order: PlayerOrder) => void;
  setMaxRounds: (rounds: number | null) => void;
  startGame: () => void;
  nextTurn: () => void;
  recordVoteResult: (winners: string[]) => void;
  recordTruthOutcome: (outcome: TruthOutcome) => void;
  endGame: () => void;
  resetGame: () => void;
};

const initialLiveState = {
  currentRound: 1,
  currentPlayerIndex: 0,
  turnIndex: 0,
  usedCardIds: [] as string[],
  currentCard: null as GameCard | null,
  currentCardText: '',
  activeRules: [] as ActiveRule[],
  history: [] as PlayedCard[],
};

const initialConfig = {
  gameName: '',
  players: [] as Player[],
  selectedMode: 'clasico' as GameMode,
  selectedCardType: null as CardType | null,
  selectedCardTypes: [] as CardType[],
  playOrder: 'random' as PlayOrder,
  playerOrder: 'sequential' as PlayerOrder,
  maxRounds: null as number | null,
  roomCode: null as string | null,
  lastSession: null as GameSession | null,
};

/** Resolve the active card types, tolerating older persisted state. */
function activeTypes(state: Pick<GameState, 'selectedCardTypes' | 'selectedCardType'>): CardType[] {
  if (state.selectedCardTypes.length > 0) return state.selectedCardTypes;
  return state.selectedCardType ? [state.selectedCardType] : [];
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialConfig,
      ...initialLiveState,

      setGameName: (name) => set({ gameName: name }),

      addPlayer: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const players = get().players;
        // Defensive: never store duplicate names (case-insensitive).
        if (players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;
        const player: Player = {
          id: makeId(),
          name: trimmed,
          color: AVATAR_COLORS[players.length % AVATAR_COLORS.length],
        };
        set({ players: [...players, player] });
      },

      setPlayers: (players) => set({ players }),

      setRoomCode: (code) => set({ roomCode: code }),

      removePlayer: (id) =>
        set((state) => ({ players: state.players.filter((p) => p.id !== id) })),

      setPlayerColor: (id, color) =>
        set((state) => ({
          players: state.players.map((p) => (p.id === id ? { ...p, color } : p)),
        })),

      setSelectedMode: (mode) => set({ selectedMode: mode }),

      // Keep the single + multi representations in sync.
      setSelectedCardType: (type) => set({ selectedCardType: type, selectedCardTypes: [type] }),

      setSelectedCardTypes: (types) =>
        set({ selectedCardTypes: types, selectedCardType: types[0] ?? null }),

      setPlayOrder: (order) => set({ playOrder: order }),

      setPlayerOrder: (order) => set({ playerOrder: order }),

      setMaxRounds: (rounds) => set({ maxRounds: rounds }),

      startGame: () => {
        const state = get();
        const types = activeTypes(state);
        if (state.players.length < 2 || types.length === 0) return;
        const { card, used } = drawCard(
          types,
          [],
          state.playOrder,
          state.players.length,
          state.selectedMode,
        );
        const text = resolveText(card, state.players, 0);
        const rule = ruleFromCard(card, text);
        set({
          ...initialLiveState,
          usedCardIds: used,
          currentCard: card,
          currentCardText: text,
          activeRules: rule ? [rule] : [],
          history: [makeEntry(card, 1, state.players[0])],
        });
      },

      nextTurn: () => {
        const state = get();
        const types = activeTypes(state);
        const count = state.players.length;
        if (types.length === 0 || count === 0) return;

        const nextTurnIndex = state.turnIndex + 1;
        const nextIndex = pickNextPlayerIndex(
          state.playerOrder,
          state.currentPlayerIndex,
          nextTurnIndex,
          count,
        );
        const nextRound = Math.floor(nextTurnIndex / count) + 1;

        // On a new round, age out temporary rules (remove the expired ones).
        let activeRules = state.activeRules;
        if (nextRound > state.currentRound) {
          activeRules = activeRules
            .map((r) => ({ ...r, roundsLeft: r.roundsLeft - 1 }))
            .filter((r) => r.roundsLeft > 0);
        }

        const { card, used } = drawCard(
          types,
          state.usedCardIds,
          state.playOrder,
          count,
          state.selectedMode,
        );
        const text = resolveText(card, state.players, nextIndex);
        const rule = ruleFromCard(card, text);
        if (rule) activeRules = [...activeRules, rule];

        set({
          turnIndex: nextTurnIndex,
          currentPlayerIndex: nextIndex,
          currentRound: nextRound,
          currentCard: card,
          currentCardText: text,
          activeRules,
          usedCardIds: used,
          history: [...state.history, makeEntry(card, nextRound, state.players[nextIndex])],
        });
      },

      // Stamp the vote winner(s) onto the current card's history entry.
      recordVoteResult: (winners) =>
        set((state) => {
          if (state.history.length === 0) return {};
          const history = [...state.history];
          history[history.length - 1] = { ...history[history.length - 1], voteWinners: winners };
          return { history };
        }),

      // Stamp the verdad-o-toma outcome onto the current card's history entry.
      recordTruthOutcome: (outcome) =>
        set((state) => {
          if (state.history.length === 0) return {};
          const history = [...state.history];
          history[history.length - 1] = { ...history[history.length - 1], outcome };
          return { history };
        }),

      endGame: () => {
        const state = get();
        const types = activeTypes(state);
        if (types.length === 0) return;
        const session: GameSession = {
          gameName: state.gameName.trim() || 'Partida sin nombre',
          players: state.players,
          mode: state.selectedMode,
          cardTypes: types,
          cardType: types[0],
          playOrder: state.playOrder,
          playerOrder: state.playerOrder,
          maxRounds: state.maxRounds,
          roundsPlayed: state.currentRound,
          history: state.history,
          startedAt: Date.now(),
        };
        set({ lastSession: session, roomCode: null, ...initialLiveState });
      },

      resetGame: () => set({ ...initialConfig, ...initialLiveState }),
    }),
    {
      name: 'chupistreams-game',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the simple, restorable config — not the volatile live card state.
      partialize: (state) => ({
        gameName: state.gameName,
        players: state.players,
        selectedMode: state.selectedMode,
        selectedCardType: state.selectedCardType,
        selectedCardTypes: state.selectedCardTypes,
        playOrder: state.playOrder,
        playerOrder: state.playerOrder,
        maxRounds: state.maxRounds,
      }),
      // The 5-round duration was removed — normalize any old persisted value.
      onRehydrateStorage: () => (state) => {
        if (state && state.maxRounds === 5) state.maxRounds = 10;
      },
    },
  ),
);
