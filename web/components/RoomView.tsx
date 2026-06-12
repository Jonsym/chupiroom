"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ButtonLink, CodeBadge, GlowShell, Logo, Panel, Pill } from "@/components/brand";
import { VoteList } from "@/components/VoteList";
import {
  CARD_TYPE_LABEL,
  STATUS_LABEL,
  castVote,
  getRoomByCode,
  getRoomPlayers,
  getRoomState,
  getVotes,
  leaveRoom,
  normalizeCode,
  subscribeRoomState,
  subscribeRoomVotes,
  getCurrentUserId,
  type Room,
  type RoomPlayer,
  type RoomState,
  type RoomStatus,
  type RoomVote,
} from "@/lib/rooms";
import { initials } from "@/lib/theme";
import { ensureSession, isSupabaseConfigured } from "@/lib/supabase";

type Phase = "loading" | "config" | "error" | "notfound" | "ready";

function PlayerRow({ player }: { player: RoomPlayer }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-2.5">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold text-background"
        style={{ backgroundColor: player.color ?? "#E0DDEE" }}
      >
        {initials(player.display_name)}
      </span>
      <span className="flex-1 truncate font-bold text-accent">{player.display_name}</span>
      {player.is_host && (
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-accent-soft">Anfitrión</span>
      )}
    </div>
  );
}

/**
 * Immersive current-card view — mirrors the mobile game feel: large rounded
 * card, premium dark/player-colour background, game-type label, current player
 * or "Para todo el grupo", and a big prompt. `tall` fills the viewport for
 * focus on normal cards; Votaciones uses a shorter card (the vote list follows).
 */
function GameCardView({ state, tall }: { state: RoomState; tall: boolean }) {
  const snap = state.snapshot;
  if (state.status === "finished") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 rounded-3xl border border-border bg-surface-elevated/60 px-6 py-10 text-center">
        <p className="text-2xl font-black text-accent">
          {snap.endedReason === "host-left" ? "El anfitrión salió de la partida" : "¡Partida terminada!"}
        </p>
        <p className="text-sm text-muted">La partida se cerró.</p>
      </div>
    );
  }

  const typeLabel = snap.cardType ? CARD_TYPE_LABEL[snap.cardType] : "CARTA";
  const onColor = snap.isPlayerScoped ? "#101111" : "#FFFFFF";
  const dimColor = snap.isPlayerScoped ? "rgba(16,17,17,0.7)" : "#E0DDEE";
  return (
    <div
      className={`flex flex-col rounded-3xl border border-border px-6 py-7 ${tall ? "min-h-[56vh]" : ""}`}
      style={{ backgroundColor: snap.isPlayerScoped ? snap.playerColor ?? "#212325" : "#212325" }}
    >
      <div className="flex flex-col gap-1">
        <span
          className="text-xs font-extrabold uppercase tracking-[0.2em] sm:text-sm"
          style={{ color: dimColor }}
        >
          {typeLabel}
        </span>
        <span className="text-2xl font-black tracking-tight sm:text-3xl" style={{ color: onColor }}>
          {snap.isPlayerScoped ? snap.playerName : "Para todo el grupo"}
        </span>
      </div>
      <div className={`flex items-center ${tall ? "flex-1 pt-8" : "pt-5"}`}>
        <p className="text-2xl font-black leading-tight sm:text-3xl" style={{ color: onColor }}>
          {snap.cardText || "—"}
        </p>
      </div>
    </div>
  );
}

/** Active temporary rules (compact premium chips). Renders nothing when empty. */
function ActiveRules({ rules }: { rules: { id: string; text: string; roundsLeft: number }[] }) {
  if (!rules || rules.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted">Reglas activas</span>
      {rules.map((rule) => (
        <div
          key={rule.id}
          className="flex items-start gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-2.5"
        >
          <span className="flex-1 text-sm font-semibold leading-snug text-accent">{rule.text}</span>
          <span className="shrink-0 rounded-full bg-[rgba(224,221,238,0.14)] px-2.5 py-1 text-xs font-extrabold text-accent">
            {rule.roundsLeft} {rule.roundsLeft === 1 ? "ronda" : "rondas"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RoomView({ code }: { code: string }) {
  const router = useRouter();
  const display = normalizeCode(code);
  const [phase, setPhase] = useState<Phase>("loading");
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [state, setState] = useState<RoomState | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [votes, setVotes] = useState<RoomVote[]>([]);
  const [busy, setBusy] = useState(false);
  const realtimeOk = useRef(false);
  const turnRef = useRef(0);

  // Keep the current turn index in a ref so realtime callbacks fetch the right
  // votes without re-subscribing on every turn change.
  useEffect(() => {
    turnRef.current = state?.snapshot.turnIndex ?? 0;
  }, [state?.snapshot.turnIndex]);

  useEffect(() => {
    let active = true;
    let unsubState = () => {};
    let unsubVotes = () => {};
    let poll: ReturnType<typeof setInterval> | undefined;

    const refresh = async (roomId: string) => {
      const [pl, stt, r] = await Promise.all([
        getRoomPlayers(roomId).catch(() => null),
        getRoomState(roomId).catch(() => null),
        getRoomByCode(code).catch(() => null),
      ]);
      if (!active) return;
      if (pl) setPlayers(pl);
      if (stt) setState(stt);
      if (r) setRoom(r);
      const v = await getVotes(roomId, turnRef.current).catch(() => null);
      if (active && v) setVotes(v);
    };

    (async () => {
      if (!isSupabaseConfigured) {
        setPhase("config");
        return;
      }
      try {
        await ensureSession();
      } catch {
        if (active) setPhase("error");
        return;
      }
      const uid = await getCurrentUserId().catch(() => null);
      let r: Room | null = null;
      try {
        r = await getRoomByCode(code);
      } catch {
        if (active) setPhase("error");
        return;
      }
      if (!active) return;
      setUserId(uid);
      if (!r) {
        setPhase("notfound");
        return;
      }
      setRoom(r);
      const [pl, stt] = await Promise.all([
        getRoomPlayers(r.id).catch(() => []),
        getRoomState(r.id).catch(() => null),
      ]);
      if (!active) return;
      setPlayers(pl);
      setState(stt);
      const v = await getVotes(r.id, stt?.snapshot.turnIndex ?? 0).catch(() => []);
      if (!active) return;
      setVotes(v);
      setPhase("ready");

      const onStatus = (s: string) => {
        realtimeOk.current = s === "SUBSCRIBED";
      };
      unsubState = subscribeRoomState(r.id, () => void refresh(r.id), onStatus);
      unsubVotes = subscribeRoomVotes(
        r.id,
        async () => {
          const vv = await getVotes(r.id, turnRef.current).catch(() => null);
          if (active && vv) setVotes(vv);
        },
        onStatus,
      );
      poll = setInterval(() => {
        if (!realtimeOk.current) void refresh(r.id);
      }, 4000);
    })();

    return () => {
      active = false;
      unsubState();
      unsubVotes();
      if (poll) clearInterval(poll);
    };
  }, [code]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const snap = state?.snapshot ?? null;
  const status: RoomStatus = state?.status ?? room?.status ?? "waiting";
  const finished = status === "finished";
  const playing = status === "playing" && !!snap;
  const isVote = snap?.cardType === "votaciones" && !finished;
  const joined = Boolean(userId && players.some((p) => p.user_id === userId));
  const myVote = userId ? votes.find((v) => v.voter_id === userId)?.voted_name ?? null : null;
  const hasVoted = myVote !== null;
  const voteCounts: Record<string, number> = {};
  votes.forEach((v) => {
    voteCounts[v.voted_name] = (voteCounts[v.voted_name] ?? 0) + 1;
  });

  const onVote = async (name: string) => {
    if (!room || !snap || busy || hasVoted || !userId) return;
    setBusy(true);
    setVotes((prev) =>
      prev.some((v) => v.voter_id === userId) ? prev : [...prev, { voter_id: userId, voted_name: name }],
    );
    try {
      await castVote(room.id, snap.turnIndex, name);
    } catch {
      // duplicate / transient — realtime will reconcile
    } finally {
      setBusy(false);
    }
  };

  const onLeave = async () => {
    if (!room || busy) return;
    setBusy(true);
    try {
      await leaveRoom(room.id);
    } catch {
      // best-effort
    }
    router.push("/join");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <GlowShell>
        <Logo className="text-2xl" />
        <p className="animate-pulse text-sm text-muted">Cargando sala…</p>
      </GlowShell>
    );
  }
  if (phase === "config") {
    return (
      <GlowShell>
        <Logo className="text-2xl" />
        <Panel className="text-center">
          <p className="text-accent-soft">La conexión no está configurada todavía.</p>
        </Panel>
      </GlowShell>
    );
  }
  if (phase === "error") {
    return (
      <GlowShell>
        <Logo className="text-2xl" />
        <Panel className="flex flex-col items-center gap-2 text-center">
          <p className="font-bold text-accent">No se pudo conectar con la sala</p>
          <p className="text-sm text-muted">Revisa tu conexión e inténtalo de nuevo.</p>
        </Panel>
      </GlowShell>
    );
  }
  if (phase === "notfound") {
    return (
      <GlowShell>
        <Logo className="text-2xl" />
        <Panel className="flex flex-col items-center gap-3 text-center">
          <CodeBadge code={display} />
          <p className="text-accent-soft">No existe ninguna sala con ese código.</p>
          <ButtonLink href="/join" variant="secondary">
            Volver
          </ButtonLink>
        </Panel>
      </GlowShell>
    );
  }

  // Leave (joined) / join CTA (passive viewer). No host controls ever.
  const leaveBtn = (
    <button
      type="button"
      onClick={onLeave}
      disabled={busy}
      className="flex h-12 w-full items-center justify-center rounded-full border border-border bg-surface-elevated px-5 text-base font-bold text-accent transition-colors hover:bg-surface disabled:opacity-40"
    >
      Salir de la sala
    </button>
  );
  const joinCta = <ButtonLink href={`/join?code=${display}`}>Unirme a esta sala</ButtonLink>;
  const actions = joined ? leaveBtn : finished ? null : joinCta;

  const compactHeader = (
    <div className="flex items-center justify-between">
      <Pill>{STATUS_LABEL[status]}</Pill>
      <span className="font-mono text-base font-black tracking-[0.3em] text-accent">{display}</span>
    </div>
  );

  // ── Playing: focused, immersive, no players list ───────────────────────────
  if (playing && state && snap) {
    const voteHint = isVote
      ? !joined
        ? "Únete a la sala para votar"
        : !hasVoted && !snap.showResult
          ? "Toca a un jugador para votar"
          : null
      : null;
    return (
      <GlowShell>
        <Logo className="text-2xl" />
        <div className="flex w-full flex-col gap-4">
          {compactHeader}
          {/* Active temporary rules sit above the card so players see them first. */}
          <ActiveRules rules={snap.activeRules} />
          {/* Keyed on the card identity so a synced change replays the slide-in. */}
          <div key={`${snap.turnIndex}:${snap.showResult}`} className="cr-card-in flex flex-col gap-4">
            <GameCardView state={state} tall={!isVote} />
            {isVote && (
              <VoteList
                options={snap.players.map((p) => ({
                  key: p.name,
                  name: p.name,
                  color: p.color ?? "#E0DDEE",
                }))}
                counts={voteCounts}
                showResult={snap.showResult}
                winners={snap.voteWinners}
                selectedKey={myVote}
                disabled={!joined || busy || hasVoted || snap.showResult}
                onSelect={onVote}
              />
            )}
            {(voteHint || !isVote) && (
              <p className="text-center text-xs text-muted">
                {voteHint ?? "Sigue la partida en tiempo real"}
              </p>
            )}
          </div>
          {actions}
        </div>
      </GlowShell>
    );
  }

  // ── Finished ───────────────────────────────────────────────────────────────
  if (finished) {
    return (
      <GlowShell>
        <Logo className="text-2xl" />
        <Panel className="flex flex-col gap-6">
          {compactHeader}
          {state ? (
            <GameCardView state={state} tall={false} />
          ) : (
            <div className="flex min-h-32 items-center justify-center rounded-3xl border border-border bg-surface-elevated/60 px-5 text-center text-sm text-muted">
              La partida ha terminado.
            </div>
          )}
          {actions}
        </Panel>
      </GlowShell>
    );
  }

  // ── Lobby / waiting: keep the players list here only ───────────────────────
  return (
    <GlowShell>
      <Logo className="text-2xl" />
      <Panel className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Pill>{STATUS_LABEL[status]}</Pill>
          <CodeBadge code={display} />
        </div>

        <div className="flex min-h-32 items-center justify-center rounded-2xl border border-border bg-surface-elevated/60 px-5 text-center text-sm text-muted">
          La partida aún no ha empezado. Espera a que el anfitrión la inicie.
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted">
            Jugadores · {players.length}
          </span>
          {players.length > 0 ? (
            players.map((p) => <PlayerRow key={p.id} player={p} />)
          ) : (
            <p className="text-sm text-muted">Todavía no hay jugadores.</p>
          )}
        </div>

        {actions}
      </Panel>
    </GlowShell>
  );
}
