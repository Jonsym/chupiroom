import { OverlayView } from "@/components/OverlayView";

// Stream overlay (OBS browser source). Next 16: params + searchParams are async.
//   ?transparent=1  → transparent background for compositing
//   ?compact=1      → smaller lower-third mode
export default async function OverlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ transparent?: string; compact?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const isOn = (v?: string) => v === "1" || v === "true";
  return <OverlayView code={code} transparent={isOn(sp.transparent)} compact={isOn(sp.compact)} />;
}
