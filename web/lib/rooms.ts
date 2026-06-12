import type { RealtimeChannel } from "@supabase/supabase-js";

import { ensureSession, getSupabase } from "./supabase";
import { AVATAR_COLORS } from "./theme";

/**
 * Typed, read-only room helpers for the web companion. Types mirror the mobile
 * backend (lib/rooms.ts + lib/onlineGame.ts) so the same rows/snapshot render
 * here. Phase 2 reads only — no create/vote/host logic.
 */

export type RoomStatus = "waiting" | "playing" | "finished";

export type CardType =
  | "retos"
  | "yo-nunca"
  | "votaciones"
  | "verdad-o-toma"
  | "categorias"
  | "reglas-temporales";

export type Room = {
  id: string;
  code: string;
  name: string | null;
  host_id: string;
  status: RoomStatus;
  selected_card_types: string[];
  play_order: string;
  player_order: string;
  max_rounds: number | null;
  created_at: string;
};

export type RoomPlayer = {
  id: string;
  room_id: string;
  user_id: string | null;
  guest_name: string | null;
  display_name: string;
  color: string | null;
  is_host: boolean;
  joined_at: string;
};

/** Fully-resolved, renderable match snapshot the host pushes (read-only here). */
export type OnlineSnapshot = {
  round: number;
  turnIndex: number;
  playerName: string;
  playerColor: string | null;
  cardType: CardType | null;
  cardId: string | null;
  cardText: string;
  isPlayerScoped: boolean;
  activeRules: { id: string; text: string; roundsLeft: number }[];
  showResult: boolean;
  voteWinners: string[];
  selectedCardTypes: string[];
  maxRounds: number | null;
  isFinal: boolean;
  players: { name: string; color: string | null }[];
  endedReason?: "host-left";
};

export type RoomState = {
  room_id: string;
  status: RoomStatus;
  round: number;
  turn_index: number;
  current_card_id: string | null;
  snapshot: OnlineSnapshot;
  updated_at: string;
};

export type RoomVote = { voter_id: string; voted_name: string };

export type RealtimeStatus = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

/** Spanish labels (mirror the mobile copy). */
export const STATUS_LABEL: Record<RoomStatus, string> = {
  waiting: "En espera",
  playing: "En curso",
  finished: "Terminada",
};

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  retos: "RETO DIRECTO",
  "yo-nunca": "YO NUNCA NUNCA",
  votaciones: "VOTACIÓN",
  "verdad-o-toma": "VERDAD O TOMA",
  categorias: "CATEGORÍA",
  "reglas-temporales": "REGLA TEMPORAL",
};

/** Normalize a room code: trimmed + uppercase. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", normalizeCode(code))
    .maybeSingle();
  if (error) throw error;
  return (data as Room) ?? null;
}

export async function getRoomPlayers(roomId: string): Promise<RoomPlayer[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("room_players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoomPlayer[];
}

export async function getRoomState(roomId: string): Promise<RoomState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("room_state")
    .select("*")
    .eq("room_id", roomId)
    .maybeSingle();
  if (error) throw error;
  return (data as RoomState) ?? null;
}

// ── Web player: session, join, leave, vote (non-host only) ───────────────────

/** Current (anonymous) auth user id from the local session — no network. */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export type JoinErrorCode =
  | "config"
  | "auth"
  | "invalid"
  | "notfound"
  | "finished"
  | "permission"
  | "failed";

/** Typed join failure so the UI can map to clear Spanish copy. */
export class JoinError extends Error {
  code: JoinErrorCode;
  constructor(code: JoinErrorCode) {
    super(code);
    this.name = "JoinError";
    this.code = code;
  }
}

/**
 * Join a room as a non-host guest from the web. Verifies the room exists and is
 * not finished, then inserts/reuses the current user's room_players row
 * (is_host = false). Allowed by the existing `room_players_insert_self` RLS.
 */
export async function joinRoom(rawCode: string, displayName: string): Promise<Room> {
  const supabase = getSupabase();
  if (!supabase) throw new JoinError("config");

  const name = displayName.trim();
  const code = normalizeCode(rawCode);
  if (!/^[A-Z0-9]{4,8}$/.test(code) || name.length === 0) throw new JoinError("invalid");

  // Establish an anonymous session first: the select/insert below need an
  // `authenticated` session to satisfy RLS, and /join is usually the very first
  // page a viewer opens (so no session exists yet). Throws → anonymous sign-in
  // is unavailable (e.g. disabled in Supabase).
  try {
    await ensureSession();
  } catch {
    throw new JoinError("auth");
  }
  const userId = await getCurrentUserId();
  if (!userId) throw new JoinError("auth");

  let room: Room | null;
  try {
    room = await getRoomByCode(code);
  } catch {
    throw new JoinError("failed");
  }
  if (!room) throw new JoinError("notfound");
  if (room.status === "finished") throw new JoinError("finished");

  const existing = await getRoomPlayers(room.id).catch(() => [] as RoomPlayer[]);
  const mine = existing.find((p) => p.user_id === userId);
  const color = mine?.color ?? AVATAR_COLORS[existing.length % AVATAR_COLORS.length];

  const { error } = await supabase.from("room_players").upsert(
    {
      room_id: room.id,
      user_id: userId,
      guest_name: name,
      display_name: name,
      color,
      is_host: false,
    },
    { onConflict: "room_id,user_id" },
  );
  if (error) {
    const status = (error as { status?: number }).status;
    const ecode = (error as { code?: string }).code;
    if (status === 401 || status === 403 || ecode === "42501") throw new JoinError("permission");
    throw new JoinError("failed");
  }
  return room;
}

/** Leave a room: delete only the caller's own room_players row (self-delete RLS). */
export async function leaveRoom(roomId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const userId = await getCurrentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from("room_players")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** All votes for one card (turn). */
export async function getVotes(roomId: string, turnIndex: number): Promise<RoomVote[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("room_votes")
    .select("voter_id,voted_name")
    .eq("room_id", roomId)
    .eq("turn_index", turnIndex);
  if (error) throw error;
  return (data ?? []) as RoomVote[];
}

/** Cast the caller's single vote for a card. Duplicate votes are ignored (23505). */
export async function castVote(roomId: string, turnIndex: number, votedName: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("auth");
  const { error } = await supabase
    .from("room_votes")
    .insert({ room_id: roomId, turn_index: turnIndex, voter_id: userId, voted_name: votedName });
  if (error && (error as { code?: string }).code !== "23505") throw error;
}

/** Subscribe to room_state changes for one room. Returns an unsubscribe fn. */
export function subscribeRoomState(
  roomId: string,
  onState: (state: RoomState) => void,
  onStatus?: (status: RealtimeStatus) => void,
): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const channel: RealtimeChannel = supabase
    .channel(`web:room_state:${roomId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "room_state", filter: `room_id=eq.${roomId}` },
      (payload: { new?: unknown }) => {
        if (payload.new) onState(payload.new as RoomState);
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus));
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Subscribe to room_votes changes for one room (any change notifies). */
export function subscribeRoomVotes(
  roomId: string,
  onChange: () => void,
  onStatus?: (status: RealtimeStatus) => void,
): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const channel: RealtimeChannel = supabase
    .channel(`web:room_votes:${roomId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "room_votes", filter: `room_id=eq.${roomId}` },
      () => onChange(),
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus));
  return () => {
    supabase.removeChannel(channel);
  };
}
