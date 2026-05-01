import { NextResponse, type NextRequest } from "next/server";
import { runGardenAutomation } from "@/lib/cron/garden-jobs";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Admin client is not configured" }, { status: 500 });
  }

  const result = await runGardenAutomation(supabase);

  return NextResponse.json({ ok: true, ...result });
}
