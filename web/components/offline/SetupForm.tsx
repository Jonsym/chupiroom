"use client";

import { useState } from "react";

import { Logo, Panel, Pill } from "@/components/brand";
import { OFFLINE_GAMES, type OfflineCardType } from "@/lib/offline/cards";
import type { OfflineConfig, OfflinePlayer } from "@/lib/offline/engine";
import { AVATAR_COLORS, initials } from "@/lib/theme";

const DURATIONS: { label: string; value: number | null }[] = [
  { label: "10", value: 10 },
  { label: "15", value: 15 },
  { label: "Sin límite", value: null },
];

let pid = 0;
const newId = () => `p${pid++}`;

export function SetupForm({ onStart }: { onStart: (config: OfflineConfig) => void }) {
  const [types, setTypes] = useState<OfflineCardType[]>(["retos", "votaciones", "verdad-o-toma"]);
  const [players, setPlayers] = useState<OfflinePlayer[]>([]);
  const [name, setName] = useState("");
  const [maxRounds, setMaxRounds] = useState<number | null>(10);

  const toggleType = (t: OfflineCardType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const addPlayer = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;
    setPlayers((prev) => [
      ...prev,
      { id: newId(), name: trimmed, color: AVATAR_COLORS[prev.length % AVATAR_COLORS.length] },
    ]);
    setName("");
  };

  const removePlayer = (id: string) => setPlayers((prev) => prev.filter((p) => p.id !== id));

  const canStart = players.length >= 2 && types.length > 0;

  return (
    // Top-aligned (not centered) so this tall, scrollable setup form never
    // clips its header on short mobile viewports. Online routes keep GlowShell.
    <main className="cr-glow flex min-h-dvh flex-col items-center px-6 pb-16 pt-10 sm:pt-16">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          {/* Full header on desktop; compact wordmark only on mobile. */}
          <span className="hidden sm:block">
            <Pill>Demo offline</Pill>
          </span>
          <Logo className="text-3xl sm:text-4xl" />
          <p className="hidden max-w-sm text-balance text-accent-soft sm:block">
            Prueba ChupiRoom en el navegador, sin sala ni cuenta. Pasaos el móvil por turnos.
          </p>
        </div>

        {/* Games */}
      <Panel className="flex flex-col gap-4">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted">Juegos</span>
        <div className="grid grid-cols-2 gap-2">
          {OFFLINE_GAMES.map((g) => {
            const on = types.includes(g.type);
            return (
              <button
                key={g.type}
                type="button"
                onClick={() => toggleType(g.type)}
                className={`flex flex-col items-start gap-0.5 rounded-2xl border px-4 py-3 text-left transition-colors ${
                  on ? "border-accent bg-[rgba(224,221,238,0.12)]" : "border-border bg-surface-elevated"
                }`}
              >
                <span className="font-bold text-accent">{g.label}</span>
                <span className="text-xs text-muted">{g.hint}</span>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Players */}
      <Panel className="flex flex-col gap-4">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted">
          Jugadores · {players.length}
        </span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addPlayer();
            }}
            maxLength={20}
            placeholder="Nombre del jugador"
            aria-label="Nombre del jugador"
            className="h-12 w-full min-w-0 rounded-2xl border border-border bg-surface-elevated px-4 text-base font-semibold text-accent placeholder:text-muted focus:border-accent/40 focus:outline-none sm:flex-1"
          />
          <button
            type="button"
            onClick={addPlayer}
            disabled={!name.trim()}
            className="h-12 w-full shrink-0 rounded-2xl border border-border bg-surface-elevated px-5 font-bold text-accent transition-colors hover:bg-surface disabled:opacity-40 sm:w-auto"
          >
            Añadir
          </button>
        </div>

        {players.length < 2 && (
          <p className="text-sm text-muted">Agrega al menos dos jugadores para empezar.</p>
        )}

        {players.length > 0 && (
          <div className="flex flex-col gap-2">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-2.5"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold text-background"
                  style={{ backgroundColor: p.color }}
                >
                  {initials(p.name)}
                </span>
                <span className="flex-1 truncate font-bold text-accent">{p.name}</span>
                <button
                  type="button"
                  onClick={() => removePlayer(p.id)}
                  aria-label={`Quitar a ${p.name}`}
                  className="text-sm font-bold text-muted transition-colors hover:text-danger"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Duration */}
      <Panel className="flex flex-col gap-4">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted">Duración (rondas)</span>
        <div className="grid grid-cols-3 gap-2">
          {DURATIONS.map((d) => {
            const on = maxRounds === d.value;
            return (
              <button
                key={d.label}
                type="button"
                onClick={() => setMaxRounds(d.value)}
                className={`inline-flex min-h-12 items-center justify-center rounded-2xl border px-2 text-center text-sm font-bold leading-tight transition-colors ${
                  on ? "border-accent bg-accent text-background" : "border-border bg-surface-elevated text-accent"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </Panel>

      <button
        type="button"
        onClick={() => canStart && onStart({ players, selectedTypes: types, maxRounds })}
        disabled={!canStart}
        className="flex h-12 w-full items-center justify-center rounded-full bg-accent px-5 text-base font-bold text-background transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
      >
        Empezar partida
      </button>
      {!canStart && (
        <p className="-mt-4 text-center text-xs text-muted">
          Elige al menos un juego y 2 jugadores.
        </p>
      )}
      </div>
    </main>
  );
}
