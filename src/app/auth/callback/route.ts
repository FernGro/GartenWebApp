import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/dashboard";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.startsWith("/\\")
    ? requestedNext
    : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const result = await supabase?.auth.exchangeCodeForSession(code);

    // Links opened on another device or twice have no usable code; send people back to login with a hint.
    if (result?.error) {
      return NextResponse.redirect(new URL(`/login?link=invalid&next=${encodeURIComponent(next)}`, requestUrl.origin));
    }
  }

  if (requestUrl.searchParams.get("error_description")) {
    return NextResponse.redirect(new URL(`/login?link=invalid&next=${encodeURIComponent(next)}`, requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
