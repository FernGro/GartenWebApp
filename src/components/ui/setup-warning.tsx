import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function SupabaseSetupWarning() {
  if (isSupabaseConfigured()) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[#efc071] bg-[#fff7e8] p-4 text-sm text-[#6f4d16]">
      Supabase ist noch nicht konfiguriert. Trage
      {" "}
      <code>NEXT_PUBLIC_SUPABASE_URL</code>
      {" "}und{" "}
      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
      {" "}in <code>.env.local</code> ein. Details stehen in der{" "}
      <Link className="font-semibold underline" href="/dashboard">
        README
      </Link>
      .
    </div>
  );
}
