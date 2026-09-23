export type HelpRole = "Alle" | "Mitglied" | "Owner/Admin";

export type HelpItem = {
  role: HelpRole;
  title: string;
  location: string;
  keywords: string[];
  steps: string[];
  note?: string;
};

export const helpItems: HelpItem[] = [
  {
    role: "Alle",
    title: "Uebersicht lesen",
    location: "Uebersicht",
    keywords: ["dashboard", "uebersicht", "punkte", "offen", "ueberfaellig"],
    steps: [
      "Oben steht dein naechster Dienst. Mit Dienst erledigt meldest du ihn sofort.",
      "Mit den Reitern Offen, Meine, Ueberfaellig und Erledigt die Liste darunter filtern.",
      "Im Rasenmaeher-Rennen siehst du den Punktestand und wer als Naechstes dran ist.",
      "Auf dem Handy fuehrt die Leiste unten zu Aufgaben, Chat und ueber Mehr zu allem anderen.",
    ],
  },
  {
    role: "Alle",
    title: "Dienst als erledigt melden",
    location: "Uebersicht oder Aufgaben",
    keywords: ["erledigt", "bestaetigung", "dienst", "aufgabe"],
    steps: [
      "Eigene zugewiesene Aufgabe oeffnen.",
      "Im erlaubten Zeitraum auf Dienst erledigt klicken.",
      "Ueberfaellige oder verschobene eigene Dienste koennen ebenfalls gemeldet werden.",
      "Die Punkte zaehlen sofort.",
    ],
    note: "Owner/Admin koennen eine falsche Erledigung wieder oeffnen.",
  },
  {
    role: "Alle",
    title: "Dienst uebernehmen",
    location: "Aufgaben",
    keywords: ["uebernahme", "vertretung", "delayed", "postponed", "ueberfaellig"],
    steps: [
      "Offene Aufgabe einer anderen Person suchen.",
      "Bei normalen Diensten Uebernahme anfragen.",
      "Bei ueberfaelligen oder verschobenen Diensten Dienst uebernehmen klicken.",
    ],
    note: "Bei ueberfaellig/verschoben braucht die bisherige Person nichts nachzutragen.",
  },
  {
    role: "Alle",
    title: "Abwesenheit eintragen",
    location: "Mehr > Einstellungen",
    keywords: ["abwesenheit", "urlaub", "keine zeit", "spontan"],
    steps: [
      "Garten oeffnen.",
      "Zeitraum und optional Grund eintragen.",
      "Betroffene eigene Dienste werden zur Uebernahme im Chat vorgeschlagen.",
    ],
  },
  {
    role: "Alle",
    title: "Chat und @Mentions nutzen",
    location: "Chat",
    keywords: ["chat", "mention", "benachrichtigung", "push"],
    steps: [
      "Nachricht schreiben.",
      "Mit @Person gezielt jemanden erwaehnen.",
      "Erwaehnte Personen erhalten Meldung und Push, falls aktiviert.",
    ],
  },
  {
    role: "Alle",
    title: "Kalender mit Wetter pruefen",
    location: "Kalender",
    keywords: ["kalender", "wetter", "regen", "schnee", "symbole"],
    steps: [
      "Kalender oeffnen.",
      "Wetter-Symbol am Tag ansehen.",
      "Wetter-Details aufklappen und Dienste fuer den Tag vergleichen.",
    ],
    note: "WetterOnline bleibt die erste Quelle. Wenn keine auswertbare Tagesvorschau kommt, nutzt die App Open-Meteo als 14-Tage-Fallback.",
  },
  {
    role: "Alle",
    title: "App installieren",
    location: "Mehr > App installieren",
    keywords: ["install", "handy", "pwa", "push"],
    steps: [
      "Install-Seite oeffnen.",
      "App zum Startbildschirm hinzufuegen.",
      "Push-Benachrichtigungen in den Garten-Einstellungen aktivieren.",
    ],
  },
  {
    role: "Owner/Admin",
    title: "Chat-Erinnerungen manuell testen",
    location: "Uebersicht",
    keywords: ["test", "chat-check", "erinnerung", "wetter", "uebernahme"],
    steps: [
      "Dashboard oeffnen.",
      "Im Block Chat-Test fuer Owner/Admin einen der naechsten zwei Dienste waehlen.",
      "Chat-Check ausloesen klicken.",
      "Im Chat pruefen, ob Erinnerung oder Uebernahme-Aufruf inklusive Wetter erscheint.",
    ],
  },
  {
    role: "Owner/Admin",
    title: "Wetterort setzen",
    location: "Mehr > Einstellungen",
    keywords: ["wetteronline", "ort", "murnau", "staffelsee"],
    steps: [
      "Garten oeffnen.",
      "Bei WetterOnline-Ort z. B. Murnau am Staffelsee eintragen.",
      "Wenn keine Daten erscheinen, den WetterOnline-URL-Teil wie wetter/murnau-am-staffelsee eintragen.",
    ],
    note: "Wenn WetterOnline keine Tabelle liefert, wird automatisch Open-Meteo fuer 14 Tage genutzt.",
  },
  {
    role: "Owner/Admin",
    title: "Vorlagen verwalten",
    location: "Mehr > Vorlagen",
    keywords: ["vorlage", "wiederkehrend", "wetterabhaengig", "plan"],
    steps: [
      "Vorlagen oeffnen.",
      "Titel, Punkte, Saison und Wiederholung pflegen.",
      "Wetterabhaengig markieren, wenn Wetter bei Planung und Erinnerung relevant ist.",
    ],
  },
  {
    role: "Owner/Admin",
    title: "Erledigung zuruecknehmen",
    location: "Aufgaben",
    keywords: ["zuruecknehmen", "wieder oeffnen", "punkte", "falsch erledigt"],
    steps: [
      "Erledigte Aufgabe oeffnen.",
      "Wieder oeffnen waehlen und Grund angeben.",
      "Die Punkte werden wieder abgezogen, die Aufgabe ist erneut offen.",
    ],
  },
  {
    role: "Owner/Admin",
    title: "Mitglieder verwalten",
    location: "Mehr > Mitglieder",
    keywords: ["einladen", "rolle", "admin", "owner", "mitglied"],
    steps: [
      "Mitglieder oeffnen.",
      "Einladungslink erstellen oder Rollen anpassen.",
      "Bei Auszug Datum waehlen und Auszug klicken. Die Person bleibt in der Abrechnung.",
    ],
  },
  {
    role: "Owner/Admin",
    title: "Mitbewohner ersetzen",
    location: "Mehr > Mitglieder",
    keywords: ["ersetzen", "nachfolger", "auszug", "einzug", "wg", "team", "platz"],
    steps: [
      "Einladung erstellen und bei Ersetzt die ausziehende Person waehlen.",
      "Sobald die neue Person annimmt, uebernimmt sie Platz, Punkte und offene Dienste.",
      "Die alte Person wird als ausgezogen gefuehrt und bleibt bis zum Abschluss in der Abrechnung.",
    ],
    note: "Alt und Neu bilden ein Team: Ein Minus wird nach Anwesenheit geteilt, ein Plus nach eigenem Beitrag.",
  },
  {
    role: "Owner/Admin",
    title: "Person vorab anlegen",
    location: "Mehr > Mitglieder",
    keywords: ["vorab", "anlegen", "noch nicht beigetreten", "profil uebernehmen", "e-mail"],
    steps: [
      "Unter Person vorab anlegen Name und E-Mail eintragen, optional Ersetzt waehlen.",
      "Die Person kann sofort Dienste bekommen und Punkte sammeln.",
      "Meldet sie sich spaeter mit dieser E-Mail an, ist alles schon in ihrem Profil.",
    ],
    note: "Gibt es fuer die E-Mail schon ein Konto, bitte einen Einladungslink schicken.",
  },
  {
    role: "Owner/Admin",
    title: "Abrechnung pruefen und abschliessen",
    location: "Abrechnung",
    keywords: ["abrechnung", "kosten", "punkte", "ausgleich", "nebenkosten", "maerz", "abschliessen", "archiv"],
    steps: [
      "Abrechnung oeffnen. Sie zeigt den laufenden Zeitraum seit dem letzten Abschluss.",
      "Pro Platz Beitrag, Soll und Saldo vergleichen, Zahlungsvorschlaege ansehen.",
      "Zahlungen mit Empfaenger eintragen, damit sie verrechnet werden.",
      "Zum Jahresabschluss ABSCHLIESSEN eintippen und Abrechnung abschliessen klicken.",
    ],
    note: "Abgeschlossene Zeitraeume stehen im Archiv. Danach beginnt ein neuer Zeitraum.",
  },
  {
    role: "Owner/Admin",
    title: "Chat-Aufbewahrung einstellen",
    location: "Mehr > Einstellungen",
    keywords: ["chat", "loeschen", "retention", "aufbewahrung"],
    steps: [
      "Garten oeffnen.",
      "Chat-Einstellungen anpassen.",
      "Speichern; der Cron loescht alte Nachrichten nach Ablauf.",
    ],
  },
];

export const helpRoles: HelpRole[] = ["Alle", "Mitglied", "Owner/Admin"];
