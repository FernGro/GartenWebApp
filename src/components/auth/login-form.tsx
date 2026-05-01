"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Button } from "@/components/ui/button";

type Mode = "magic" | "password" | "signup";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";
  const [mode, setMode] = useState<Mode>("magic");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        setMessage("Supabase ist noch nicht konfiguriert.");
        return;
      }

      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "");
      const password = String(formData.get("password") ?? "");
      const displayName = String(formData.get("display_name") ?? "");
      const supabase = createClient();

      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        setMessage("Magic-Link wurde versendet.");
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        setMessage("Account angelegt. Bitte bestaetige ggf. die E-Mail.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.push(nextPath);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-5 shadow-sm shadow-[#4a5d3f]/5">
      <div className="mb-4 grid grid-cols-3 rounded-lg bg-[#eef4e8] p-1 text-sm font-semibold">
        {[
          ["magic", "Magic-Link"],
          ["password", "Login"],
          ["signup", "Registrieren"],
        ].map(([value, label]) => (
          <button
            className={`rounded-md px-3 py-2 ${mode === value ? "bg-[#fffef9] text-[#172016] shadow-sm" : "text-[#5a6655]"}`}
            key={value}
            onClick={() => setMode(value as Mode)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        {mode === "signup" ? (
          <div>
            <label className="text-sm font-semibold" htmlFor="display_name">
              Anzeigename
            </label>
            <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" id="display_name" name="display_name" />
          </div>
        ) : null}
        <div>
          <label className="text-sm font-semibold" htmlFor="email">
            E-Mail
          </label>
          <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" id="email" name="email" required type="email" />
        </div>
        {mode !== "magic" ? (
          <div>
            <label className="text-sm font-semibold" htmlFor="password">
              Passwort
            </label>
            <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" id="password" minLength={8} name="password" required type="password" />
          </div>
        ) : null}
        <Button className="w-full" disabled={loading} type="submit">
          {loading ? "Bitte warten..." : "Weiter"}
        </Button>
        {message ? <p className="text-sm text-[#42513d]">{message}</p> : null}
      </form>
    </div>
  );
}
