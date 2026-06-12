"use client";

import { useState } from "react";

import { GlowShell, Logo, Pill } from "@/components/brand";
import { VoteList } from "@/components/VoteList";
import { OFFLINE_TYPE_LABEL, type OfflineCardType } from "@/lib/offline/cards";
import {
  advanceGame,
  isFinalTurn,
  startOfflineGame,
  type OfflineConfig,
  type OfflineGame as Game,
} from "@/lib/offline/engine";
import { useCardSwipe } from "./useCardSwipe";

export type OfflineSummary = {
  roundsPlayed: number;
  games: OfflineCardType[];
  votes: { question: string; winners: string[] }[];
};

function ActiveRules({ rules }: { rules: { id: string; text: string; roundsLeft: number }[] }) {
  if (rules.length === 0) return null;
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

export function OfflineGame({
  config,
  onFinish,
  onHome,
}: {
  config: OfflineConfig;
  onFinish: (summary: OfflineSummary) => void;
  onHome: () => void;
}) {
  const [game, setGame] = useState<Game>(() => startOfflineGame(config));
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [voteResults, setVoteResults] = useState<{ question: string; winners: string[] }[]>([]);

  const isVote = game.card.type === "votaciones";
  const isTruth = game.card.type === "verdad-o-toma";
  const final = isFinalTurn(game);

  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
  const maxVotes = Math.max(0, ...game.players.map((p) => votes[p.name] ?? 0));
  const winners =
    maxVotes > 0 ? game.players.filter((p) => (votes[p.name] ?? 0) === maxVotes).map((p) => p.name) : [];

  const next = (collected?: { question: string; winners: string[] }) => {
    if (final) {
      onFinish({
        roundsPlayed: game.round,
        games: game.selectedTypes,
        votes: collected ? [...voteResults, collected] : voteResults,
      });
      return;
    }
    if (collected) setVoteResults((prev) => [...prev, collected]);
    setVotes({});
    setShowResult(false);
    setGame((g) => advanceGame(g));
  };

  const onUp = () => {
    if (isVote && !showResult) {
      if (totalVotes > 0) setShowResult(true);
      return;
    }
    if (isVote && showResult) {
      next({ question: game.cardText, winners });
      return;
    }
    next();
  };

  const onVote = (name: string) => {
    if (showResult) return;
    setVotes((v) => ({ ...v, [name]: (v[name] ?? 0) + 1 }));
  };

  const swipe = useCardSwipe({
    enabled: true,
    allowHorizontal: isTruth,
    allowUp: !isTruth,
    onUp,
    onLeft: () => next(), // Tomó
    onRight: () => next(), // Respondió
  });

  // ── Card visuals (mirrors the /r/[code] immersive card) ────────────────────
  const player = game.players[game.currentPlayerIndex];
  const cardBg = game.isPlayerScoped ? player?.color ?? "#212325" : "#212325";
  const onColor = game.isPlayerScoped ? "#101111" : "#FFFFFF";
  const dimColor = game.isPlayerScoped ? "rgba(16,17,17,0.7)" : "#E0DDEE";
  const typeLabel = OFFLINE_TYPE_LABEL[game.card.type];
  const roundLabel = game.maxRounds ? `RONDA ${game.round} DE ${game.maxRounds}` : `RONDA ${game.round}`;

  const dragTransform = swipe.drag.active
    ? isTruth
      ? `translate(${swipe.drag.x}px, ${swipe.drag.y * 0.1}px) rotate(${Math.max(
          -8,
          Math.min(8, swipe.drag.x / 18),
        )}deg)`
      : `translateY(${Math.min(0, swipe.drag.y)}px)`
    : "none";

  let hint: string;
  if (isTruth) hint = "←  Tomó      Respondió  →";
  else if (isVote && !showResult)
    hint = totalVotes > 0 ? "Desliza arriba para ver el resultado" : "Toca a un jugador para votar";
  else hint = final ? "Desliza arriba para terminar" : "Desliza arriba para continuar";

  return (
    <GlowShell>
      <Logo className="text-2xl" />
      <div className="flex w-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <Pill>{roundLabel}</Pill>
          <button
            type="button"
            onClick={onHome}
            className="text-sm font-bold text-muted transition-colors hover:text-accent"
          >
            Salir
          </button>
        </div>

        <ActiveRules rules={game.activeRules} />

        {/* Slide-in on each new card (key); inner element carries the drag. */}
        <div key={game.turnIndex} className="cr-card-in flex flex-col gap-4">
          <div
            {...swipe.handlers}
            style={{
              backgroundColor: cardBg,
              transform: dragTransform,
              transition: swipe.drag.active ? "none" : "transform 200ms ease",
              touchAction: "none",
              cursor: "grab",
            }}
            className={`flex flex-col rounded-3xl border border-border px-6 py-7 select-none ${
              isVote ? "" : "min-h-[52vh]"
            }`}
          >
            <div className="flex flex-col gap-1">
              <span
                className="text-xs font-extrabold uppercase tracking-[0.2em] sm:text-sm"
                style={{ color: dimColor }}
              >
                {typeLabel}
              </span>
              <span className="text-2xl font-black tracking-tight sm:text-3xl" style={{ color: onColor }}>
                {game.isPlayerScoped ? player?.name : "Para todo el grupo"}
              </span>
            </div>
            <div className={`flex items-center ${isVote ? "pt-5" : "flex-1 pt-8"}`}>
              <p className="text-2xl font-black leading-tight sm:text-3xl" style={{ color: onColor }}>
                {game.cardText}
              </p>
            </div>
          </div>

          {isVote && (
            <VoteList
              options={game.players.map((p) => ({ key: p.name, name: p.name, color: p.color }))}
              counts={votes}
              showResult={showResult}
              winners={winners}
              disabled={showResult}
              onSelect={onVote}
            />
          )}

          <p className="text-center text-xs text-muted">{hint}</p>
        </div>
      </div>
    </GlowShell>
  );
}
