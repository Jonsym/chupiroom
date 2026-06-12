import { RoomView } from "@/components/RoomView";

// Viewer room. Next 16: route params are async. The live data + subscription
// run client-side in <RoomView />.
export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <RoomView code={code} />;
}
