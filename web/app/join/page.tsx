import { JoinForm } from "@/components/JoinForm";
import { ButtonLink, GlowShell, Logo, Panel } from "@/components/brand";

// Next 16: searchParams is async. We read `?code=` to prefill the join form
// (e.g. from the "Unirme a esta sala" CTA on /r/[code]).
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <GlowShell>
      <Logo className="text-3xl" />

      <Panel className="flex flex-col gap-5">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-xl font-extrabold text-accent">Unirse a una sala</h1>
          <p className="text-sm text-muted">Introduce tu nombre y el código que comparte el streamer.</p>
        </div>

        <JoinForm initialCode={code ?? ""} />
      </Panel>

      <div className="flex w-full flex-col items-center gap-2">
        <span className="text-xs text-muted">¿No tienes código?</span>
        <ButtonLink href="/play" variant="secondary">
          Probar sin sala
        </ButtonLink>
      </div>
    </GlowShell>
  );
}
