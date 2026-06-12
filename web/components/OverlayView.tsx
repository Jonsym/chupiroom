"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";

import {
  CARD_TYPE_LABEL,
  getRoomByCode,
  getRoomState,
  getVotes,
  normalizeCode,
  subscribeRoomState,
  subscribeRoomVotes,
  type Room,
  type RoomState,
  type RoomVote,
} from "@/lib/rooms";
import { initials } from "@/lib/theme";
import { ensureSession, isSupabaseConfigured } from "@/lib/supabase";

type Props = { code: string; transparent?: boolean; compact?: boolean };

/** "Chupi" + "Room" wordmark (non-interactive — overlays aren't clicked). */
function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={`font-black tracking-tight ${className}`}>
      <span className="text-accent">Chupi</span>
      <span className="text-accent-soft">Room</span>
    </span>
  );
}

type Opt = { key: string; name: string; color: string };

function VotesOverlay({
  options,
  counts,
  showResult,
  winners,
  compact,
}: {
  options: Opt[];
  counts: Record<string, number>;
  showResult: boolean;
  winners: string[];
  compact: boolean;
}) {
  return (
    <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-2.5"}`}>
      {showResult && (
        <p className={`font-extrabold uppercase tracking-[0.18em] text-accent ${compact ? "text-xs" : "text-base"}`}>
          {winners.length > 1 ? "¡Empate!" : "Más votado"}
        </p>
      )}
      {options.map((o) => {
        const count = counts[o.key] ?? 0;
        const isWinner = showResult && winners.includes(o.key);
        const countOn = count > 0 || isWinner;
        return (
          <div
            key={o.key}
            className={`flex items-center gap-3 rounded-2xl border ${
              isWinner ? "border-accent bg-[rgba(224,221,238,0.14)]" : "border-border bg-surface-elevated"
            } ${compact ? "px-3 py-2" : "px-5 py-3"}`}
          >
            <span
              className={`flex items-center justify-center rounded-full font-extrabold text-background ${
                compact ? "h-8 w-8 text-xs" : "h-11 w-11 text-base"
              }`}
              style={{ backgroundColor: o.color }}
            >
              {initials(o.name)}
            </span>
            <span className={`flex-1 truncate font-bold text-accent ${compact ? "text-base" : "text-2xl"}`}>
              {o.name}
            </span>
            <span
              className={`flex items-center justify-center rounded-full border font-extrabold ${
                countOn ? "border-accent bg-accent text-background" : "border-border bg-surface text-accent-soft"
              } ${compact ? "h-8 min-w-8 px-2 text-sm" : "h-10 min-w-10 px-3 text-xl"}`}
            >
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CardBlock({ snap, compact }: { snap: RoomState["snapshot"]; compact: boolean }) {
  const typeLabel = snap.cardType ? CARD_TYPE_LABEL[snap.cardType] : "CARTA";
  const onColor = snap.isPlayerScoped ? "#101111" : "#FFFFFF";
  const who = snap.isPlayerScoped ? snap.playerName : "Para todo el grupo";
  return (
    <div
      className={`rounded-3xl border border-border ${compact ? "p-5" : "p-8"}`}
      style={{ backgroundColor: snap.isPlayerScoped ? snap.playerColor ?? "#212325" : "#212325" }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={`font-extrabold uppercase tracking-[0.2em] ${compact ? "text-xs" : "text-sm"}`}
          style={{ color: snap.isPlayerScoped ? "rgba(16,17,17,0.7)" : "#E0DDEE" }}
        >
          {typeLabel}
        </span>
        <span
          className={`font-extrabold ${compact ? "text-xs" : "text-sm"}`}
          style={{ color: snap.isPlayerScoped ? "rgba(16,17,17,0.55)" : "#8C8E93" }}
        >
          · {who}
        </span>
      </div>
      <p
        className={`mt-3 font-black leading-tight ${compact ? "text-2xl" : "text-4xl"}`}
        style={{ color: onColor }}
      >
        {snap.cardText || "—"}
      </p>
    </div>
  );
}

function JoinBlock({ code, origin, compact }: { code: string; origin: string; compact: boolean }) {
  const host = origin ? origin.replace(/^https?:\/\//, "") : "chupiroom.com";
  const url = origin ? `${origin}/join?code=${code}` : "";

  if (compact) {
    return (
      <p className="text-sm font-bold text-accent-soft">
        Únete en <span className="text-accent">{host}/join</span> · Código{" "}
        <span className="font-mono tracking-[0.15em] text-accent">{code}</span>
      </p>
    );
  }
  return (
    <div className="flex items-center gap-5 rounded-3xl border border-border bg-surface/80 p-5">
      {url && (
        <div className="rounded-xl bg-white p-2">
          <QRCodeSVG value={url} size={104} bgColor="#FFFFFF" fgColor="#101111" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Únete desde tu móvil</span>
        <span className="text-2xl font-black text-accent">{host}/join</span>
        <span className="text-base font-bold text-accent-soft">
          Código <span className="font-mono tracking-[0.2em] text-accent">{code}</span>
        </span>
      </div>
    </div>
  );
}

export function OverlayView({ code, transparent = false, compact = false }: Props) {
  const display = normalizeCode(code);
  const [ready, setReady] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [votes, setVotes] = useState<RoomVote[]>([]);
  const [connected, setConnected] = useState(true);
  const [origin, setOrigin] = useState("");
  const realtimeOk = useRef(false);
  const turnRef = useRef(0);

  useEffect(() => {
    turnRef.current = state?.snapshot.turnIndex ?? 0;
  }, [state?.snapshot.turnIndex]);

  // Transparent OBS background: clear the global dark body background.
  useEffect(() => {
    if (!transparent) return;
    const html = document.documentElement;
    const body = document.body;
    const prev = { h: html.style.background, b: body.style.background };
    html.style.background = "transparent";
    body.style.background = "transparent";
    return () => {
      html.style.background = prev.h;
      body.style.background = prev.b;
    };
  }, [transparent]);

  useEffect(() => {
    let active = true;
    let unsubState = () => {};
    let unsubVotes = () => {};
    let poll: ReturnType<typeof setInterval> | undefined;

    const refresh = async (roomId: string) => {
      const [stt, r, v] = await Promise.all([
        getRoomState(roomId).catch(() => null),
        getRoomByCode(code).catch(() => null),
        getVotes(roomId, turnRef.current).catch(() => null),
      ]);
      if (!active) return;
      if (stt) setState(stt);
      if (r) setRoom(r);
      if (v) setVotes(v);
    };

    (async () => {
      if (active) setOrigin(typeof window !== "undefined" ? window.location.origin : "");
      if (!isSupabaseConfigured) {
        if (active) setReady(true);
        return;
      }
      try {
        await ensureSession();
        const r = await getRoomByCode(code);
        if (!active) return;
        setRoom(r);
        if (r) {
          const stt = await getRoomState(r.id).catch(() => null);
          const v = await getVotes(r.id, stt?.snapshot.turnIndex ?? 0).catch(() => [] as RoomVote[]);
          if (!active) return;
          setState(stt);
          setVotes(v);
          const onStatus = (s: string) => {
            const ok = s === "SUBSCRIBED";
            realtimeOk.current = ok;
            if (active) setConnected(ok);
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
        }
      } catch {
        // Stay quiet on-stream; states below cover the failure.
      } finally {
        if (active) setReady(true);
      }
    })();

    return () => {
      active = false;
      unsubState();
      unsubVotes();
      if (poll) clearInterval(poll);
    };
  }, [code]);

  const snap = state?.snapshot ?? null;
  const finished = state?.status === "finished";
  const isVote = snap?.cardType === "votaciones" && !finished;
  const counts: Record<string, number> = {};
  votes.forEach((v) => {
    counts[v.voted_name] = (counts[v.voted_name] ?? 0) + 1;
  });

  // ── Layout shells ────────────────────────────────────────────────────────
  const outer = `min-h-dvh flex ${transparent ? "bg-transparent" : "cr-glow"} ${
    compact ? "items-end" : "items-center justify-center"
  } ${compact ? "p-5" : "p-8"}`;

  const reconnectingTag =
    ready && room && !connected ? (
      <span className="rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-bold text-accent-soft">
        Reconectando…
      </span>
    ) : null;

  // ── Content by state ────────────────────────────────────────────────────
  let title: string | null = null;
  let body: React.ReactNode = null;

  if (!ready) {
    title = "Conectando…";
  } else if (!room) {
    title = "Sala no encontrada";
  } else if (finished) {
    title = snap?.endedReason === "host-left" ? "El anfitrión salió de la partida" : "¡Partida terminada!";
  } else if (!snap || room.status === "waiting") {
    title = "Esperando a que empiece la partida";
  } else {
    body = (
      <div className={`flex w-full flex-col ${compact ? "gap-3" : "gap-5"}`}>
        <CardBlock snap={snap} compact={compact} />
        {isVote && (
          <VotesOverlay
            options={snap.players.map((p) => ({ key: p.name, name: p.name, color: p.color ?? "#E0DDEE" }))}
            counts={counts}
            showResult={snap.showResult}
            winners={snap.voteWinners}
            compact={compact}
          />
        )}
      </div>
    );
  }

  // ── Compact (lower-third) ─────────────────────────────────────────────────
  if (compact) {
    return (
      <div className={outer}>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-3xl border border-border bg-surface/90 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <Brand className="text-lg" />
            <div className="flex items-center gap-2">
              {reconnectingTag}
              <span className="font-mono text-sm font-bold tracking-[0.2em] text-accent-soft">{display}</span>
            </div>
          </div>
          {body ?? <p className="text-xl font-black text-accent">{title}</p>}
          {room && !finished && <JoinBlock code={display} origin={origin} compact />}
        </div>
      </div>
    );
  }

  // ── Full (default) ─────────────────────────────────────────────────────────
  return (
    <div className={outer}>
      <div className="flex w-full max-w-2xl flex-col items-stretch gap-6">
        <div className="flex items-center justify-between">
          <Brand className="text-2xl" />
          <div className="flex items-center gap-3">
            {reconnectingTag}
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Código</span>
              <span className="font-mono text-2xl font-black tracking-[0.25em] text-accent">{display}</span>
            </div>
          </div>
        </div>

        {body ?? (
          <div className="flex min-h-44 items-center justify-center rounded-3xl border border-border bg-surface/80 p-10 text-center">
            <p className="text-3xl font-black text-accent">{title}</p>
          </div>
        )}

        {room && !finished && <JoinBlock code={display} origin={origin} compact={false} />}
      </div>
    </div>
  );
}
