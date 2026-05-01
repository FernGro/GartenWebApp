"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function createGardenAction(formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const rawName = formData.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";

  if (!name) {
    throw new Error("Bitte gib einen Namen fuer den Garten ein.");
  }

  const { error } = await supabase.rpc("create_garden_with_owner", { garden_name: name });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
