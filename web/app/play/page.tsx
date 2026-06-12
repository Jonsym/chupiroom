import { PlayClient } from "@/components/offline/PlayClient";

// Browser-only offline demo. No Supabase, no room code — fully client-side.
export default function PlayPage() {
  return <PlayClient />;
}
