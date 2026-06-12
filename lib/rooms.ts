import type { CardType, PlayerOrder, PlayOrder } from '@/types/game';

import { supabase } from './supabase';

export type Room = {
  id: string;
  code: string;
  name: string | null;
  host_id: string;
  status: 'waiting' | 'playing' | 'finished';
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

export type RoomConfig = {
  name: string;
  selectedCardTypes: CardType[];
  playOrder: PlayOrder;
  playerOrder: PlayerOrder;
  maxRounds: number | null;
};

export type RoomPlayerInput = {
  displayName: string;
  color: string;
  guestName?: string | null;
};

// Unambiguous alphabet (no 0/O/1/I) for easy-to-share codes.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genCode(length = 5): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null;
  // Read from the local session (no network round-trip) — reliable for guests
  // and registered users alike.
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/** Normalize a room code: trimmed + uppercase. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Create a room (status `waiting`) and add the host as the first player. */
export async function createRoom(config: RoomConfig, host: RoomPlayerInput): Promise<Room> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Inicia sesión para crear una sala.');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = genCode();
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        code,
        name: config.name.trim() || null,
        host_id: userId,
        status: 'waiting',
        selected_card_types: config.selectedCardTypes,
        play_order: config.playOrder,
        player_order: config.playerOrder,
        max_rounds: config.maxRounds,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') continue; // code collision — try another
      throw error;
    }

    const { error: playerError } = await supabase.from('room_players').insert({
      room_id: data.id,
      user_id: userId,
      guest_name: host.guestName ?? null,
      display_name: host.displayName,
      color: host.color,
      is_host: true,
    });
    if (playerError) throw playerError;

    return data as Room;
  }
  throw new Error('No se pudo generar un código de sala. Inténtalo de nuevo.');
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', normalizeCode(code))
    .maybeSingle();
  if (error) throw error;
  return (data as Room) ?? null;
}

/** Join an existing waiting room as the current user (idempotent). */
export async function joinRoom(code: string, player: RoomPlayerInput): Promise<Room> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Inicia sesión para unirte a una sala.');

  const room = await getRoomByCode(code);
  if (!room) throw new Error('No existe ninguna sala con ese código.');
  // Allow joining a match in progress; only a finished room is closed.
  if (room.status === 'finished') throw new Error('Esta sala ya ha terminado.');

  const { error } = await supabase.from('room_players').upsert(
    {
      room_id: room.id,
      user_id: userId,
      guest_name: player.guestName ?? null,
      display_name: player.displayName,
      color: player.color,
      is_host: room.host_id === userId,
    },
    { onConflict: 'room_id,user_id' },
  );
  if (error) throw error;
  return room;
}

export async function listRoomPlayers(roomId: string): Promise<RoomPlayer[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoomPlayer[];
}

/** Mark a room's status (host only). */
export async function setRoomStatus(roomId: string, status: Room['status']): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('rooms').update({ status }).eq('id', roomId);
  if (error) throw error;
}

/**
 * Remove the caller's own player row from a room (leaving). Each user may only
 * delete their own row — the `room_players_delete_self_or_host` RLS policy
 * (migration 0002) already permits this, so no schema change is needed.
 */
export async function leaveRoom(roomId: string): Promise<void> {
  if (!supabase) return;
  const userId = await getCurrentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId);
  if (error) throw error;
}

// ── Online game state ────────────────────────────────────────────────────────

/** A fully-resolved, renderable snapshot of the match (host pushes, others read). */
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
  /** Why a finished match ended. Undefined / absent = a normal finish. */
  endedReason?: 'host-left';
};

export type RoomState = {
  room_id: string;
  status: 'waiting' | 'playing' | 'finished';
  round: number;
  turn_index: number;
  current_card_id: string | null;
  snapshot: OnlineSnapshot;
  updated_at: string;
};

export async function upsertRoomState(
  roomId: string,
  status: RoomState['status'],
  snapshot: OnlineSnapshot,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('room_state').upsert(
    {
      room_id: roomId,
      status,
      round: snapshot.round,
      turn_index: snapshot.turnIndex,
      current_card_id: snapshot.cardId,
      snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'room_id' },
  );
  if (error) throw error;
}

export async function getRoomState(roomId: string): Promise<RoomState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('room_state')
    .select('*')
    .eq('room_id', roomId)
    .maybeSingle();
  if (error) throw error;
  return (data as RoomState) ?? null;
}

export type RoomVote = { voter_id: string; voted_name: string };

export async function getVotes(roomId: string, turnIndex: number): Promise<RoomVote[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('room_votes')
    .select('voter_id,voted_name')
    .eq('room_id', roomId)
    .eq('turn_index', turnIndex);
  if (error) throw error;
  return (data ?? []) as RoomVote[];
}

/** Cast a vote (one per user per card). Duplicate votes are silently ignored. */
export async function castVote(roomId: string, turnIndex: number, votedName: string): Promise<void> {
  if (!supabase) return;
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Inicia sesión para votar.');
  const { error } = await supabase
    .from('room_votes')
    .insert({ room_id: roomId, turn_index: turnIndex, voter_id: userId, voted_name: votedName });
  if (error && error.code !== '23505') throw error; // 23505 = already voted
}

// ── Realtime subscriptions ───────────────────────────────────────────────────

export type RealtimeStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';

/** Subscribe to room_state changes for one room. Returns an unsubscribe fn. */
export function subscribeRoomState(
  roomId: string,
  onState: (state: RoomState) => void,
  onStatus?: (status: RealtimeStatus) => void,
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`room_state:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'room_state', filter: `room_id=eq.${roomId}` },
      (payload: { new?: unknown }) => {
        if (payload.new) onState(payload.new as RoomState);
      },
    )
    .subscribe((status: string) => onStatus?.(status as RealtimeStatus));
  return () => {
    supabase?.removeChannel(channel);
  };
}

/** Subscribe to room_votes changes for one room (any insert/update notifies). */
export function subscribeRoomVotes(
  roomId: string,
  onChange: () => void,
  onStatus?: (status: RealtimeStatus) => void,
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`room_votes:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'room_votes', filter: `room_id=eq.${roomId}` },
      () => onChange(),
    )
    .subscribe((status: string) => onStatus?.(status as RealtimeStatus));
  return () => {
    supabase?.removeChannel(channel);
  };
}
