/**
 * Web-only offline demo dataset (Spanish). Intentionally small and standalone —
 * it does NOT import from the mobile/root app, so the /play demo builds and runs
 * on Vercel without Supabase or the mobile game engine. This is a lightweight
 * demo deck, not the final shared game-core.
 *
 * Card text supports two tokens, resolved at draw time:
 *   {{player}} → the active player
 *   {{target}} → one random other player
 */

export type OfflineCardType =
  | "retos"
  | "yo-nunca"
  | "votaciones"
  | "verdad-o-toma"
  | "categorias"
  | "reglas-temporales";

export const OFFLINE_TYPE_LABEL: Record<OfflineCardType, string> = {
  retos: "RETO DIRECTO",
  "yo-nunca": "YO NUNCA NUNCA",
  votaciones: "VOTACIÓN",
  "verdad-o-toma": "VERDAD O TOMA",
  categorias: "CATEGORÍA",
  "reglas-temporales": "REGLA TEMPORAL",
};

/** Selectable games shown in the setup screen. */
export const OFFLINE_GAMES: { type: OfflineCardType; label: string; hint: string }[] = [
  { type: "retos", label: "Retos", hint: "Retos directos" },
  { type: "yo-nunca", label: "Yo Nunca", hint: "Confiesa o bebe" },
  { type: "votaciones", label: "Votaciones", hint: "Vota al más probable" },
  { type: "verdad-o-toma", label: "Verdad o Toma", hint: "Responde o bebe" },
  { type: "categorias", label: "Categorías", hint: "Di sin repetir" },
  { type: "reglas-temporales", label: "Reglas", hint: "Duran varias rondas" },
];

export type OfflineCard = {
  id: string;
  type: OfflineCardType;
  text: string;
  isPlayerScoped: boolean;
  minPlayers?: number;
  durationRounds?: number;
};

export const OFFLINE_CARDS: OfflineCard[] = [
  // ── Retos (player-scoped) ──────────────────────────────────────────────────
  { id: "r1", type: "retos", isPlayerScoped: true, text: "{{player}}, imita a un famoso hasta que el grupo adivine quién es." },
  { id: "r2", type: "retos", isPlayerScoped: true, text: "{{player}}, deja que {{target}} te ponga un apodo para el resto de la partida." },
  { id: "r3", type: "retos", isPlayerScoped: true, text: "{{player}}, habla con acento extranjero durante las próximas 2 rondas o bebe." },
  { id: "r4", type: "retos", isPlayerScoped: true, text: "{{player}}, haz 10 sentadillas o da un trago." },
  { id: "r5", type: "retos", isPlayerScoped: true, text: "{{player}}, cuéntale un piropo a {{target}} sin reírte." },
  { id: "r6", type: "retos", isPlayerScoped: true, text: "{{player}}, cuenta un chiste. Si nadie se ríe, bebes." },

  // ── Yo Nunca (group) ────────────────────────────────────────────────────────
  { id: "n1", type: "yo-nunca", isPlayerScoped: false, text: "Yo nunca nunca he mentido para librarme de un plan." },
  { id: "n2", type: "yo-nunca", isPlayerScoped: false, text: "Yo nunca nunca me he quedado dormido/a en una fiesta." },
  { id: "n3", type: "yo-nunca", isPlayerScoped: false, text: "Yo nunca nunca he enviado un mensaje a la persona equivocada." },
  { id: "n4", type: "yo-nunca", isPlayerScoped: false, text: "Yo nunca nunca he fingido estar enfermo/a para no ir a trabajar." },
  { id: "n5", type: "yo-nunca", isPlayerScoped: false, text: "Yo nunca nunca he cantado a todo volumen en la ducha." },
  { id: "n6", type: "yo-nunca", isPlayerScoped: false, text: "Yo nunca nunca he stalkeado a alguien en redes." },

  // ── Votaciones (group) ───────────────────────────────────────────────────────
  { id: "v1", type: "votaciones", isPlayerScoped: false, text: "Votad: ¿quién acabaría bailando sobre la mesa?" },
  { id: "v2", type: "votaciones", isPlayerScoped: false, text: "Votad: ¿quién es el más probable de perder las llaves?" },
  { id: "v3", type: "votaciones", isPlayerScoped: false, text: "Votad: ¿quién llegaría tarde a su propia boda?" },
  { id: "v4", type: "votaciones", isPlayerScoped: false, text: "Votad: ¿quién tiene el peor gusto musical?" },
  { id: "v5", type: "votaciones", isPlayerScoped: false, text: "Votad: ¿quién se haría famoso/a primero?" },
  { id: "v6", type: "votaciones", isPlayerScoped: false, text: "Votad: ¿quién cuenta las mejores historias?" },

  // ── Verdad o Toma (player-scoped) ─────────────────────────────────────────────
  { id: "t1", type: "verdad-o-toma", isPlayerScoped: true, text: "{{player}}, ¿cuál ha sido tu mayor vergüenza? Responde o toma." },
  { id: "t2", type: "verdad-o-toma", isPlayerScoped: true, text: "{{player}}, ¿a quién del grupo te llevarías a una isla desierta? Responde o toma." },
  { id: "t3", type: "verdad-o-toma", isPlayerScoped: true, text: "{{player}}, ¿cuál es tu manía más rara? Responde o toma." },
  { id: "t4", type: "verdad-o-toma", isPlayerScoped: true, text: "{{player}}, ¿cuál ha sido tu peor cita? Responde o toma." },
  { id: "t5", type: "verdad-o-toma", isPlayerScoped: true, text: "{{player}}, ¿qué fue lo último que buscaste en internet? Responde o toma." },
  { id: "t6", type: "verdad-o-toma", isPlayerScoped: true, text: "{{player}}, ¿de quién has sentido celos alguna vez? Responde o toma." },

  // ── Categorías (group) ─────────────────────────────────────────────────────────
  { id: "c1", type: "categorias", isPlayerScoped: false, text: "Categoría: marcas de coche. Por turnos, sin repetir. Quien falle, bebe." },
  { id: "c2", type: "categorias", isPlayerScoped: false, text: "Categoría: países de Europa. Por turnos, sin repetir." },
  { id: "c3", type: "categorias", isPlayerScoped: false, text: "Categoría: películas de superhéroes. El que dude, bebe." },
  { id: "c4", type: "categorias", isPlayerScoped: false, text: "Categoría: cosas que hay en una cocina. Sin repetir." },
  { id: "c5", type: "categorias", isPlayerScoped: false, text: "Categoría: futbolistas famosos. Quien tarde, bebe." },
  { id: "c6", type: "categorias", isPlayerScoped: false, text: "Categoría: marcas de ropa. Por turnos." },

  // ── Reglas temporales (group, last several rounds) ─────────────────────────────
  { id: "g1", type: "reglas-temporales", isPlayerScoped: false, durationRounds: 2, text: "Prohibido decir nombres propios. Quien lo haga, bebe." },
  { id: "g2", type: "reglas-temporales", isPlayerScoped: false, durationRounds: 2, text: "Nadie puede usar el móvil. Quien lo toque, bebe." },
  { id: "g3", type: "reglas-temporales", isPlayerScoped: false, durationRounds: 1, text: "Hay que hablar de usted. El que tutee, bebe." },
  { id: "g4", type: "reglas-temporales", isPlayerScoped: false, durationRounds: 3, text: "Antes de cada trago, todos brindan. Quien lo olvide, doble." },
  { id: "g5", type: "reglas-temporales", isPlayerScoped: false, durationRounds: 2, text: "Prohibido decir la palabra «no»." },
  { id: "g6", type: "reglas-temporales", isPlayerScoped: false, durationRounds: 2, text: "Prohibido señalar con el dedo." },
];
