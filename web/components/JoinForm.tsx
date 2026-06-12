"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { JoinError, joinRoom, normalizeCode, type JoinErrorCode } from "@/lib/rooms";
import { getStoredName, setStoredName } from "@/lib/theme";

const ERRORS: Record<JoinErrorCode, string> = {
  config: "La conexión con el servidor no está configurada.",
  auth: "No se pudo iniciar tu sesión de invitado. Inténtalo de nuevo.",
  invalid: "Escribe tu nombre y un código de sala válido.",
  notfound: "No existe ninguna sala con ese código.",
  finished: "Esta sala ya ha terminado.",
  permission: "No tienes permiso para unirte a esta sala.",
  failed: "No se pudo unir a la sala. Revisa tu conexión e inténtalo de nuevo.",
};

export function JoinForm({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState(normalizeCode(initialCode));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Prefill the display name from a previous session (convenience). Done in an
  // effect (not lazy init) because localStorage isn't available during SSR, so
  // initializing from it would cause a hydration mismatch.
  useEffect(() => {
    const stored = getStoredName();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setName(stored);
  }, []);

  const trimmedName = name.trim();
  const trimmedCode = normalizeCode(code);
  const valid = trimmedName.length > 0 && /^[A-Z0-9]{4,8}$/.test(trimmedCode);

  const submit = async () => {
    if (busy) return;
    if (!valid) {
      setError("Escribe tu nombre y un código de sala válido.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const room = await joinRoom(trimmedCode, trimmedName);
      setStoredName(trimmedName);
      router.push(`/r/${room.code}`);
    } catch (e) {
      const errCode = e instanceof JoinError ? e.code : "failed";
      setError(ERRORS[errCode]);
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted">Tu nombre</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          maxLength={20}
          placeholder="¿Cómo te ven en la sala?"
          aria-label="Tu nombre"
          disabled={busy}
          className="h-12 w-full rounded-2xl border border-border bg-surface-elevated px-4 text-base font-semibold text-accent placeholder:text-muted focus:border-accent/40 focus:outline-none disabled:opacity-50"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted">Código de sala</span>
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          inputMode="text"
          maxLength={8}
          placeholder="K7M2P"
          aria-label="Código de sala"
          disabled={busy}
          className="h-14 w-full rounded-2xl border border-border bg-surface-elevated text-center text-2xl font-black uppercase tracking-[0.4em] text-accent placeholder:tracking-[0.2em] placeholder:text-muted focus:border-accent/40 focus:outline-none disabled:opacity-50"
        />
      </label>

      {error && <p className="text-center text-sm text-danger">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!valid || busy}
        className="flex h-12 w-full items-center justify-center rounded-full bg-accent px-5 text-base font-bold text-background transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Uniéndote…" : "Entrar a la sala"}
      </button>

      <p className="text-center text-xs text-muted">
        Entras como invitado. Pide el código a quien transmite la partida.
      </p>
    </div>
  );
}
