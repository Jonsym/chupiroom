"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { OfflineConfig } from "@/lib/offline/engine";
import { OfflineGame, type OfflineSummary } from "./OfflineGame";
import { SetupForm } from "./SetupForm";
import { SummaryView } from "./SummaryView";

type Phase = "setup" | "playing" | "summary";

/**
 * Offline demo orchestrator — fully client-side, no Supabase. Walks the viewer
 * through setup → gameplay → local summary, entirely in browser state.
 */
export function PlayClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("setup");
  const [config, setConfig] = useState<OfflineConfig | null>(null);
  const [summary, setSummary] = useState<OfflineSummary | null>(null);
  // Bumped on "Jugar otra vez" to remount the game with a fresh deck.
  const [run, setRun] = useState(0);

  const goHome = () => router.push("/");

  if (phase === "playing" && config) {
    return (
      <OfflineGame
        key={run}
        config={config}
        onFinish={(s) => {
          setSummary(s);
          setPhase("summary");
        }}
        onHome={goHome}
      />
    );
  }

  if (phase === "summary" && summary) {
    return (
      <SummaryView
        summary={summary}
        onAgain={() => {
          setRun((r) => r + 1);
          setSummary(null);
          setPhase("playing");
        }}
        onHome={goHome}
      />
    );
  }

  return (
    <SetupForm
      onStart={(cfg) => {
        setConfig(cfg);
        setRun((r) => r + 1);
        setPhase("playing");
      }}
    />
  );
}
