"use client";

import { useState, type FormEvent } from "react";
import { getBrowserAppUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Notice = { tone: "success" | "error"; text: string } | null;

const inputClass = "mt-1 w-full rounded-xl border border-[#cbd8c1] bg-white px-3 py-3";
const labelClass = "block text-sm font-semibold text-[#405039]";

function accountMessage(message: string) {
  if (/should be different from the old password/i.test(message)) return "Das neue Passwort muss sich vom alten unterscheiden.";
  if (/Password should be/i.test(message)) return "Das Passwort muss mindestens 8 Zeichen haben.";
  if (/reauthentication|nonce/i.test(message)) return "Bitte melde dich neu an und versuche es dann noch einmal.";
  if (/already been registered|already registered|email_exists/i.test(message)) return "Diese E-Mail wird schon von einem anderen Konto verwendet.";
  if (/rate limit|after \d+ seconds/i.test(message)) return "Bitte kurz warten und dann erneut versuchen.";
  if (/Auth session missing|not authenticated/i.test(message)) return "Deine Sitzung ist abgelaufen. Bitte melde dich neu an.";
  return message;
}

function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p
      className={`rounded-xl px-3 py-2 text-sm ${notice.tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-[#e7efe1] text-[#2f6b3f]"}`}
      role={notice.tone === "error" ? "alert" : "status"}
    >
      {notice.text}
    </p>
  );
}

export function AccountPanel({ email, recovery = false }: { email: string; recovery?: boolean }) {
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [emailNotice, setEmailNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<"password" | "email" | null>(null);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const repeat = String(data.get("password_repeat") ?? "");
    setPasswordNotice(null);

    if (password.length < 8) {
      setPasswordNotice({ tone: "error", text: "Das Passwort muss mindestens 8 Zeichen haben." });
      return;
    }
    if (password !== repeat) {
      setPasswordNotice({ tone: "error", text: "Die beiden Passwoerter stimmen nicht ueberein." });
      return;
    }

    setBusy("password");
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(null);

    if (error) {
      setPasswordNotice({ tone: "error", text: accountMessage(error.message) });
      return;
    }
    form.reset();
    setPasswordNotice({ tone: "success", text: "Neues Passwort gespeichert. Ab jetzt meldest du dich damit an." });
  }

  async function changeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const newEmail = String(new FormData(form).get("email") ?? "").trim().toLowerCase();
    setEmailNotice(null);

    if (!newEmail || newEmail === email.toLowerCase()) {
      setEmailNotice({ tone: "error", text: "Bitte eine neue, andere E-Mail-Adresse eingeben." });
      return;
    }

    setBusy("email");
    const { error } = await createClient().auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${getBrowserAppUrl()}/auth/callback?next=/konto` },
    );
    setBusy(null);

    if (error) {
      setEmailNotice({ tone: "error", text: accountMessage(error.message) });
      return;
    }
    form.reset();
    setEmailNotice({
      tone: "success",
      text: `Fast geschafft: Bitte bestaetige die Aenderung ueber den Link, den wir an ${newEmail} geschickt haben (je nach Einstellung auch an ${email}). Bis dahin gilt die alte Adresse.`,
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form className="space-y-3 rounded-2xl border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-[0_2px_0_#d7dfcf]" onSubmit={changePassword}>
        <h2 className="text-lg font-bold">{recovery ? "Neues Passwort festlegen" : "Passwort aendern"}</h2>
        {recovery ? <p className="text-sm text-[#5a6655]">Du bist ueber den Link aus der Mail angemeldet. Lege jetzt ein neues Passwort fest.</p> : null}
        <label className={labelClass}>
          Neues Passwort
          <input autoComplete="new-password" className={inputClass} minLength={8} name="password" required type="password" />
        </label>
        <label className={labelClass}>
          Neues Passwort wiederholen
          <input autoComplete="new-password" className={inputClass} minLength={8} name="password_repeat" required type="password" />
        </label>
        <Button disabled={busy === "password"} type="submit">{busy === "password" ? "Speichert..." : "Passwort speichern"}</Button>
        <NoticeBox notice={passwordNotice} />
      </form>

      <form className="space-y-3 rounded-2xl border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-[0_2px_0_#d7dfcf]" onSubmit={changeEmail}>
        <h2 className="text-lg font-bold">E-Mail aendern</h2>
        <p className="text-sm text-[#5a6655]">Aktuell: <span className="font-semibold text-[#172016]">{email}</span></p>
        <label className={labelClass}>
          Neue E-Mail
          <input autoComplete="email" className={inputClass} name="email" required type="email" />
        </label>
        <Button disabled={busy === "email"} type="submit" variant="secondary">{busy === "email" ? "Sendet..." : "E-Mail aendern"}</Button>
        <NoticeBox notice={emailNotice} />
      </form>
    </div>
  );
}
