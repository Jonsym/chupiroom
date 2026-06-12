import { ButtonLink, GlowShell, Logo, Panel, Pill } from "@/components/brand";

export default function Home() {
  return (
    <GlowShell>
      <div className="flex flex-col items-center gap-4 text-center">
        <Pill>Compañero web</Pill>
        <Logo className="text-5xl" />
        <p className="max-w-sm text-balance text-accent-soft">
          Sigue la partida en directo desde el navegador. Únete con el código que
          comparte el streamer.
        </p>
      </div>

      <Panel className="flex flex-col gap-4">
        <ButtonLink href="/join">Unirse a una sala</ButtonLink>
        <ButtonLink href="/play" variant="secondary">
          Jugar demo offline
        </ButtonLink>
        <p className="text-center text-sm text-muted">
          Únete con un código, o prueba sin sala desde el navegador.
        </p>
      </Panel>
    </GlowShell>
  );
}
