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
    title: "Dashboard lesen",
    location: "Dashboard",
    keywords: ["dashboard", "uebersicht", "punkte", "offen", "ueberfaellig"],
    steps: [
      "Offene, eigene, zu pruefende, ueberfaellige und erledigte Dienste oben vergleichen.",
      "Auf eine Kennzahl klicken, um die passende Aufgabenuebersicht darunter zu sehen.",
      "Naechste Aufgaben direkt aus der Liste oeffnen.",
      "Punktestand und Fairness-Hinweis rechts pruefen.",
    ],
  },
  {
    role: "Alle",
    title: "Dienst als erfuellt bestaetigen",
    location: "Aufgaben oder Dashboard",
    keywords: ["erledigt", "bestaetigung", "dienst", "aufgabe"],
    steps: [
      "Eigene zugewiesene Aufgabe oeffnen.",
      "Im erlaubten Zeitraum auf Dienst als erfuellt bestaetigen klicken.",
      "Ueberfaellige oder verschobene eigene Dienste koennen ebenfalls gemeldet werden.",
      "Owner/Admin bestaetigt danach die Erledigung.",
    ],
    note: "Punkte zaehlen erst nach Owner/Admin-Bestaetigung.",
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
    location: "Garten",
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
    location: "Install",
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
    location: "Dashboard",
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
    location: "Garten",
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
    location: "Vorlagen",
    keywords: ["vorlage", "wiederkehrend", "wetterabhaengig", "plan"],
    steps: [
      "Vorlagen oeffnen.",
      "Titel, Punkte, Saison und Wiederholung pflegen.",
      "Wetterabhaengig markieren, wenn Wetter bei Planung und Erinnerung relevant ist.",
    ],
  },
  {
    role: "Owner/Admin",
    title: "Erledigungen bestaetigen",
    location: "Aufgaben",
    keywords: ["bestaetigen", "pruefung", "punkte"],
    steps: [
      "Aufgaben mit Status Pruefung oeffnen.",
      "Erledigung bestaetigen oder mit Grund ablehnen.",
      "Nach Bestaetigung werden Punkte und Abrechnung aktualisiert.",
    ],
  },
  {
    role: "Owner/Admin",
    title: "Mitglieder verwalten",
    location: "Mitglieder",
    keywords: ["einladen", "rolle", "admin", "owner", "mitglied"],
    steps: [
      "Mitglieder oeffnen.",
      "Einladungslink erstellen oder Rollen anpassen.",
      "Inaktive Mitglieder bei Bedarf deaktivieren.",
    ],
  },
  {
    role: "Owner/Admin",
    title: "Abrechnung pruefen",
    location: "Abrechnung",
    keywords: ["abrechnung", "kosten", "punkte", "ausgleich"],
    steps: [
      "Abrechnung oeffnen.",
      "Punkte, Zahlungen und Ausgleichsbetrag vergleichen.",
      "Korrekturen ueber Anpassungen erfassen.",
    ],
  },
  {
    role: "Owner/Admin",
    title: "Chat-Aufbewahrung einstellen",
    location: "Garten",
    keywords: ["chat", "loeschen", "retention", "aufbewahrung"],
    steps: [
      "Garten oeffnen.",
      "Chat-Einstellungen anpassen.",
      "Speichern; der Cron loescht alte Nachrichten nach Ablauf.",
    ],
  },
];

export const helpRoles: HelpRole[] = ["Alle", "Mitglied", "Owner/Admin"];
