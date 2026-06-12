/**
 * Core domain types for ChupiRoom.
 */

export type Player = {
  id: string;
  name: string;
  /** Hex color used for the player's avatar. */
  color: string;
};

/** High-level game intensity selected before playing. */
export type GameMode = 'clasico' | 'caos';

/** The category of cards being played. */
export type CardType =
  | 'retos'
  | 'yo-nunca'
  | 'votaciones'
  | 'verdad-o-toma'
  | 'categorias'
  | 'reglas-temporales';

/** A temporary table rule currently in effect. */
export type ActiveRule = {
  id: string;
  text: string;
  roundsLeft: number;
};

/** Outcome a player chose on a "verdad o toma" card. */
export type TruthOutcome = 'answered' | 'drank';

/** Relative spiciness of a card. Used to scale difficulty by mode later. */
export type Intensity = 'low' | 'medium' | 'high';

/**
 * Who a card is aimed at:
 * - `player`: the active player only.
 * - `target`: the active player plus one or more other players.
 * - `group`: everyone (no specific player).
 */
export type CardScope = 'player' | 'target' | 'group';

/** How cards are drawn from the active deck(s). */
export type PlayOrder = 'random' | 'sequential';

/** How the turn rotates between players. */
export type PlayerOrder = 'random' | 'sequential';

export type GameCard = {
  id: string;
  type: CardType;
  /**
   * Prompt text with template tokens resolved at render time
   * (see `renderCardText`):
   * - `{{player}}`  → the active player's name
   * - `{{target}}`  → one random other player
   * - `{{targets}}` → `targetCount` random other players
   */
  text: string;
  /** Minimum players required for this card to be drawable. */
  minPlayers: number;
  /** Relative spiciness; lets a mode scale which cards appear. */
  intensity: Intensity;
  /** Who the card is aimed at. */
  scope: CardScope;
  /** How many targets `{{targets}}` should resolve to (target scope). */
  targetCount?: number;
  /** For reglas-temporales: how many rounds the rule stays in effect. */
  durationRounds?: number;
  /** The prompt addresses the active player (`{{player}}`). */
  requiresCurrentPlayer: boolean;
  /** The prompt needs another player as a target (`{{target}}`/`{{targets}}`). */
  requiresTargetPlayer: boolean;
};

/** One card as it was actually played during a match (for the recap). */
export type PlayedCard = {
  cardId: string;
  type: CardType;
  round: number;
  /** The active player when the card targets one (retos); null for group cards. */
  playerName: string | null;
  intensity: Intensity;
  /** Winner(s) of a votaciones card (one, or several on a tie). */
  voteWinners?: string[];
  /** What the player chose on a "verdad o toma" card. */
  outcome?: TruthOutcome;
};

export type GameSession = {
  gameName: string;
  players: Player[];
  mode: GameMode;
  /** Card types used in the session. May hold more than one. */
  cardTypes: CardType[];
  /** Primary card type — kept for quick display/back-compat. */
  cardType: CardType;
  playOrder: PlayOrder;
  playerOrder: PlayerOrder;
  /** Round limit for the match, or null for "sin límite". */
  maxRounds: number | null;
  roundsPlayed: number;
  /** Every card shown during the match, in order. */
  history: PlayedCard[];
  startedAt: number;
};
