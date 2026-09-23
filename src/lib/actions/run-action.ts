import { unstable_rethrow } from "next/navigation";
import { getURLFromRedirectError } from "next/dist/client/components/redirect";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export type ActionResult = { error: string } | { redirectTo: string } | undefined;

// Database guards raise English messages; members should see what to do instead.
const friendlyMessages: [RegExp, string][] = [
  [/A garden must keep at least one active owner/i, "Der Garten braucht mindestens einen aktiven Owner. Mache zuerst eine andere Person zum Owner."],
  [/Only owners can (change owner memberships|grant owner role|replace an owner)|Only owners and admins can delete/i, "Das duerfen nur Owner und Admins."],
  [/Only owners\/admins can edit task details/i, "Aufgaben-Details duerfen nur Owner und Admins aendern."],
  [/Only owners\/admins can reopen or cancel tasks/i, "Nur Owner und Admins duerfen Aufgaben wieder oeffnen oder abbrechen."],
  [/Task can only be taken over via takeover request/i, "Diesen Dienst kannst du nur ueber eine Uebernahme-Anfrage bekommen."],
  [/Task assignment is locked/i, "Diese Zuweisung ist fixiert."],
  [/Only the assignee can lock this task/i, "Nur die zugewiesene Person kann den Dienst fixieren."],
  [/Only the assigned member can complete this task/i, "Nur die zugewiesene Person kann diesen Dienst erledigen."],
  [/Task can only be completed within 7 days/i, "Dieser Dienst kann nur 7 Tage vor bis 7 Tage nach dem Faelligkeitsdatum erledigt werden."],
  [/Invite is for another email address/i, "Diese Einladung gilt fuer eine andere E-Mail-Adresse. Melde dich mit der eingeladenen E-Mail an."],
  [/Invite not found or expired/i, "Die Einladung ist abgelaufen oder wurde schon benutzt."],
  [/Insufficient permissions|row-level security|permission denied/i, "Dafuer fehlen dir die Rechte."],
  [/Person is already member of a garden/i, "Diese Person ist schon Mitglied in einem Garten."],
  [/Replaced person is not a member/i, "Die ersetzte Person gehoert nicht zu diesem Garten."],
  [/Billing period started today/i, "Der aktuelle Zeitraum hat erst heute begonnen und kann noch nicht abgeschlossen werden."],
  [/duplicate key value/i, "Das gibt es schon."],
  [/Not authenticated|JWT/i, "Bitte melde dich neu an."],
];

export function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return friendlyMessages.find(([pattern]) => pattern.test(message))?.[1] ?? message;
}

export async function runAction(body: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await body();
    return undefined;
  } catch (error) {
    // Forms submit via ActionForm, which navigates itself; a thrown redirect would leave the button pending.
    if (isRedirectError(error)) {
      return { redirectTo: getURLFromRedirectError(error) };
    }
    unstable_rethrow(error);
    console.error("server action failed", error);
    return { error: friendlyError(error) };
  }
}
