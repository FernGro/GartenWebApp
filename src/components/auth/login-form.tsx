"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getBrowserAppUrl } from "@/lib/app-url";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Button } from "@/components/ui/button";

type Mode = "magic" | "password" | "signup" | "reset";

type Notice = { tone: "info" | "success" | "error"; text: string } | null;

function authMessage(message: string) {
  if (/Email not confirmed/i.test(message)) {
    return "Deine E-Mail ist noch nicht bestaetigt. Oeffne den Link in der Bestaetigungs-Mail (auch im Spam-Ordner schauen) oder melde dich per Magic-Link an.";
  }
  if (/Invalid login credentials/i.test(message)) {
    return "E-Mail oder Passwort stimmen nicht. Noch kein Konto? Dann auf Registrieren. Frisch registriert? Dann zuerst die E-Mail bestaetigen.";
  }
  const wait = message.match(/after (\d+) seconds/i);
  if (wait || /rate limit|too many/i.test(message)) {
    return `Bitte kurz warten${wait ? ` (${wait[1]} Sekunden)` : ""} und dann erneut versuchen. Die Mail ist meist schon unterwegs.`;
  }
  if (/already registered|already been registered/i.test(message)) {
    return "Fuer diese E-Mail gibt es schon ein Konto. Bitte auf Login gehen oder den Magic-Link nutzen.";
  }
  if (/Password should be/i.test(message)) {
    return "Das Passwort muss mindestens 8 Zeichen haben.";
  }
  return message;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNextPath = searchParams.get("next") ?? "/dashboard";
  const nextPath = rawNextPath.startsWith("/") && !rawNextPath.startsWith("//") ? rawNextPath : "/dashboard";
  const [mode, setMode] = useState<Mode>("magic");
  const [notice, setNotice] = useState<Notice>(
    searchParams.get("link") === "invalid"
      ? { tone: "error", text: "Der Link aus der Mail hat nicht funktioniert (abgelaufen, schon benutzt oder auf einem anderen Geraet geoeffnet). Bitte hier neu anmelden oder einen neuen Link anfordern." }
      : null,
  );
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setMessage = (text: string | null, tone: "info" | "success" | "error" = "error") => setNotice(text ? { tone, text } : null);

  async function resendConfirmation() {
    if (!pendingEmail) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: { emailRedirectTo: `${getBrowserAppUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    });
    setLoading(false);
    setMessage(error ? authMessage(error.message) : `Bestaetigungs-Mail an ${pendingEmail} erneut gesendet.`, error ? "error" : "success");
  }

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
      const redirectUrl = `${getBrowserAppUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}`;

      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) {
          setMessage(authMessage(error.message));
          return;
        }

        setMessage(`Wir haben dir einen Anmelde-Link an ${email} geschickt. Oeffne ihn auf diesem Geraet. Absender ist noreply@mail.app.supabase.io, schau notfalls im Spam-Ordner.`, "success");
        return;
      }

      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${getBrowserAppUrl()}/auth/callback?next=${encodeURIComponent("/konto?reset=1")}`,
        });

        if (error) {
          setMessage(authMessage(error.message));
          return;
        }

        setMessage(`Wenn es ein Konto fuer ${email} gibt, haben wir einen Link zum Zuruecksetzen geschickt. Oeffne ihn auf diesem Geraet und lege dann ein neues Passwort fest. Schau notfalls im Spam-Ordner.`, "success");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) {
          setMessage(authMessage(error.message));
          return;
        }

        if (data.session) {
          router.push(nextPath);
          router.refresh();
          return;
        }

        if (data.user && data.user.identities?.length === 0) {
          setMessage("Fuer diese E-Mail gibt es schon ein Konto. Bitte auf Login gehen oder den Magic-Link nutzen.");
          return;
        }

        setPendingEmail(email);
        setMessage(`Fast geschafft: Wir haben eine Bestaetigungs-Mail an ${email} geschickt. Klicke auf den Link darin, danach bist du angemeldet. Absender ist noreply@mail.app.supabase.io. Nichts gekommen? Schau im Spam-Ordner.`, "success");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (/Email not confirmed/i.test(error.message)) setPendingEmail(email);
        setMessage(authMessage(error.message));
        return;
      }

      router.push(nextPath);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#d7dfcf] bg-[#fffef9] p-5 shadow-[0_2px_0_#d7dfcf]">
      <div className="mb-4 grid grid-cols-3 rounded-lg bg-[#eef4e8] p-1 text-sm font-semibold">
        {[
          ["magic", "Magic-Link"],
          ["password", "Login"],
          ["signup", "Registrieren"],
        ].map(([value, label]) => (
          <button
            className={`rounded-md px-3 py-2 ${mode === value ? "bg-[#fffef9] text-[#172016] shadow-sm" : "text-[#5a6655]"}`}
            key={value}
            onClick={() => {
              setMode(value as Mode);
              setNotice(null);
            }}
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
            <input className="mt-1 w-full rounded-xl border border-[#cbd8c1] px-3 py-3" id="display_name" name="display_name" />
          </div>
        ) : null}
        <div>
          <label className="text-sm font-semibold" htmlFor="email">
            E-Mail
          </label>
          <input className="mt-1 w-full rounded-xl border border-[#cbd8c1] px-3 py-3" id="email" name="email" required type="email" />
        </div>
        {mode === "password" || mode === "signup" ? (
          <div>
            <label className="text-sm font-semibold" htmlFor="password">
              Passwort
            </label>
            <input className="mt-1 w-full rounded-xl border border-[#cbd8c1] px-3 py-3" id="password" minLength={8} name="password" required type="password" />
          </div>
        ) : null}
        {mode === "reset" ? (
          <p className="text-sm text-[#5a6655]">Gib deine E-Mail ein. Du bekommst einen Link, mit dem du ein neues Passwort festlegst.</p>
        ) : null}
        <Button className="w-full" disabled={loading} type="submit">
          {loading ? "Bitte warten..." : mode === "reset" ? "Link zum Zuruecksetzen senden" : "Weiter"}
        </Button>
        {mode === "password" ? (
          <button className="text-sm font-semibold text-[#2f6b3f] underline" onClick={() => { setMode("reset"); setNotice(null); }} type="button">
            Passwort vergessen?
          </button>
        ) : null}
        {mode === "reset" ? (
          <button className="text-sm font-semibold text-[#2f6b3f] underline" onClick={() => { setMode("password"); setNotice(null); }} type="button">
            Zurueck zum Login
          </button>
        ) : null}
        {notice ? (
          <p
            className={`rounded-xl px-3 py-2 text-sm ${
              notice.tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-[#e7efe1] text-[#2f6b3f]"
            }`}
            role={notice.tone === "error" ? "alert" : "status"}
          >
            {notice.text}
          </p>
        ) : null}
        {pendingEmail ? (
          <button className="press text-sm font-semibold text-[#2f6b3f] underline" disabled={loading} onClick={resendConfirmation} type="button">
            Bestaetigungs-Mail erneut senden
          </button>
        ) : null}
      </form>
    </div>
  );
}
