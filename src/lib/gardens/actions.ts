"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function createGardenAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const rawName = formData.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";

  if (!name) {
    throw new Error("Bitte gib einen Namen fuer den Garten ein.");
  }

  const { data: garden, error: gardenError } = await supabase
    .from("gardens")
    .insert({ name, created_by: user.id })
    .select("id")
    .single();

  if (gardenError) {
    throw new Error(gardenError.message);
  }

  const { error: memberError } = await supabase.from("garden_members").insert({
    garden_id: garden.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
