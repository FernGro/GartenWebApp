export type HelpRole = "Alle" | "Owner/Admin" | "Owner";

export type HelpTopic =
  | "Erste Schritte"
  | "Dienste"
  | "Punkte und Fairness"
  | "Kalender und Abwesenheit"
  | "Chat und Meldungen"
  | "Abrechnung"
  | "Mitglieder"
  | "Planung und Vorlagen"
  | "Einstellungen";

export type HelpItem = {
  role: HelpRole;
  topic: HelpTopic;
  title: string;
  location: string;
  keywords: string[];
  steps: string[];
  note?: string;
};

export const helpTopics: HelpTopic[] = [
  "Erste Schritte",
  "Dienste",
  "Punkte und Fairness",
  "Kalender und Abwesenheit",
  "Chat und Meldungen",
  "Abrechnung",
  "Mitglieder",
  "Planung und Vorlagen",
  "Einstellungen",
];

export const helpRoles: HelpRole[] = ["Alle", "Owner/Admin", "Owner"];

export const helpRoleLabels: Record<HelpRole, string> = {
  Alle: "Alle",
  "Owner/Admin": "Owner und Admin",
  Owner: "Nur Owner",
};

export const helpItems: HelpItem[] = [
  {
    role: "Alle",
    topic: "Erste Schritte",
    title: "Anmelden",
    location: "Login",
    keywords: ["login", "anmelden", "magic link", "passwort", "konto"],
    steps: [
      "Am einfachsten: E-Mail eingeben und Magic-Link anfordern. Das klappt auch ohne Konto und ohne Passwort.",
      "Den Link in der E-Mail auf demselben Geraet oeffnen. Absender ist noreply@mail.app.supabase.io.",
      "Wer lieber ein Passwort nutzt: Registrieren, dann zuerst den Link in der Bestaetigungs-Mail klicken. Erst danach klappt Login mit Passwort.",
      "Keine Mail bekommen? Spam-Ordner pruefen oder Bestaetigungs-Mail erneut senden (nach 60 Sekunden).",
    ],
    note: "Wurdest du vorab angelegt, melde dich einfach mit der E-Mail an, die der Admin eingetragen hat. Deine Punkte und Dienste sind dann schon da.",
  },
  {
    role: "Alle",
    topic: "Erste Schritte",
    title: "Einladung annehmen",
    location: "Einladungslink",
    keywords: ["einladung", "invite", "beitreten", "link"],
    steps: [
      "Den Einladungslink oeffnen, den du bekommen hast.",
      "Anmelden, falls noch nicht geschehen.",
      "Einladung annehmen klicken. Danach siehst du den Garten.",
    ],
    note: "Ersetzt du jemanden, uebernimmst du automatisch dessen Platz, Punkte und offene Dienste.",
  },
  {
    role: "Alle",
    topic: "Erste Schritte",
    title: "Uebersicht und Navigation",
    location: "Uebersicht",
    keywords: ["dashboard", "uebersicht", "menue", "navigation", "handy", "mehr"],
    steps: [
      "Oben steht dein naechster Dienst mit dem Knopf Dienst erledigt.",
      "Darunter filterst du mit Offen, Meine, Ueberfaellig und Erledigt.",
      "Auf dem Handy fuehrt die Leiste unten zu Uebersicht, Aufgaben, Neue Aufgabe (+), Chat und Mehr.",
      "Unter Mehr findest du Kalender, Abrechnung, Mitglieder, Vorlagen, Vorschau, Verlauf, Einstellungen und Hilfe.",
      "Die Glocke oben rechts zeigt neue Meldungen.",
    ],
  },
  {
    role: "Alle",
    topic: "Erste Schritte",
    title: "App auf dem Handy installieren",
    location: "Mehr > App installieren",
    keywords: ["installieren", "pwa", "startbildschirm", "iphone", "android"],
    steps: [
      "App installieren oeffnen und der Anleitung fuer dein Geraet folgen.",
      "iPhone: Teilen und Zum Home-Bildschirm. Android: Menue und App installieren.",
      "Danach Push-Benachrichtigungen unter Einstellungen aktivieren.",
    ],
  },
  {
    role: "Alle",
    topic: "Dienste",
    title: "Dienst als erledigt melden",
    location: "Uebersicht oder Aufgaben",
    keywords: ["erledigt", "fertig", "melden", "punkte", "abhaken"],
    steps: [
      "Deinen Dienst auf der Uebersicht oder in Aufgaben suchen.",
      "Dienst erledigt klicken. Die Punkte zaehlen sofort.",
    ],
    note: "Normale Dienste gehen 7 Tage vor bis 7 Tage nach dem Faelligkeitsdatum. Ueberfaellige und verschobene Dienste kannst du jederzeit erledigen.",
  },
  {
    role: "Alle",
    topic: "Dienste",
    title: "Freien oder fremden Dienst uebernehmen",
    location: "Aufgaben",
    keywords: ["uebernehmen", "uebernahme", "tauschen", "frei", "anfrage"],
    steps: [
      "Den Dienst oeffnen.",
      "Freie, ueberfaellige oder verschobene Dienste: Dienst uebernehmen klicken, er gehoert sofort dir.",
      "Dienste einer anderen Person: Uebernahme anfragen. Die Person oder ein Admin bestaetigt.",
    ],
  },
  {
    role: "Alle",
    topic: "Dienste",
    title: "Uebernahme-Anfrage bestaetigen",
    location: "Aufgabe oeffnen",
    keywords: ["anfrage", "bestaetigen", "ablehnen", "uebernahme"],
    steps: [
      "Die Meldung oder den Dienst oeffnen.",
      "Bei der Anfrage Bestaetigen oder Ablehnen klicken.",
    ],
    note: "Bestaetigen koennen die aktuell zugewiesene Person sowie Owner und Admins.",
  },
  {
    role: "Alle",
    topic: "Dienste",
    title: "Dienst fest einloggen",
    location: "Aufgabe",
    keywords: ["fixieren", "einloggen", "festlegen", "reservieren"],
    steps: [
      "Einen dir zugewiesenen Dienst oeffnen.",
      "Diesen Dienst fest einloggen klicken.",
      "Der Dienst wird dann bei Fair neu zuweisen nicht mehr verschoben.",
    ],
    note: "Loesen koennen nur Owner und Admins.",
  },
  {
    role: "Alle",
    topic: "Dienste",
    title: "Neue Aufgabe anlegen",
    location: "+ in der Leiste unten oder Aufgabe oben rechts",
    keywords: ["neu", "anlegen", "aufgabe erstellen", "plus"],
    steps: [
      "Neue Aufgabe oeffnen.",
      "Vorlage waehlen oder Titel, Punkte und Faelligkeit eintragen.",
      "Zuweisung leer lassen: Die App schlaegt die fairste Person vor.",
      "Aufgabe erstellen klicken.",
    ],
  },
  {
    role: "Alle",
    topic: "Dienste",
    title: "Kommentar zu einem Dienst",
    location: "Aufgabe",
    keywords: ["kommentar", "notiz", "nachricht", "diskussion"],
    steps: [
      "Den Dienst oeffnen.",
      "Unten Kommentar schreiben und Kommentar speichern klicken.",
    ],
  },
  {
    role: "Owner/Admin",
    topic: "Dienste",
    title: "Erledigte Aufgabe nachtragen",
    location: "Neue Aufgabe",
    keywords: ["nachtragen", "vergangen", "vergessen", "rueckwirkend"],
    steps: [
      "Neue Aufgabe oeffnen und nach unten zu Erledigte Aufgabe nachtragen scrollen.",
      "Titel, wer es erledigt hat, Datum und Punkte eintragen.",
      "Erledigung nachtragen klicken.",
    ],
  },
  {
    role: "Owner/Admin",
    topic: "Dienste",
    title: "Erledigung zuruecknehmen",
    location: "Aufgabe",
    keywords: ["zuruecknehmen", "rueckgaengig", "wieder oeffnen", "falsch"],
    steps: [
      "Den erledigten Dienst oeffnen.",
      "Grund eintragen und Erledigung rueckgaengig klicken.",
      "Die Punkte werden abgezogen, der Dienst ist wieder offen.",
    ],
  },
  {
    role: "Owner/Admin",
    topic: "Dienste",
    title: "Aufgabe loeschen und wiederherstellen",
    location: "Aufgabe",
    keywords: ["loeschen", "papierkorb", "wiederherstellen", "abbrechen"],
    steps: [
      "Den Dienst oeffnen und In Papierkorb klicken.",
      "Zum Wiederherstellen den Dienst erneut oeffnen und Wiederherstellen klicken.",
    ],
  },
  {
    role: "Owner/Admin",
    topic: "Dienste",
    title: "Offene Dienste fair neu verteilen",
    location: "Aufgaben",
    keywords: ["fair", "neu zuweisen", "verteilen", "umverteilen"],
    steps: [
      "Aufgaben oeffnen.",
      "Fair neu zuweisen klicken.",
      "Offene, nicht fixierte Dienste werden nach Punktestand und Abwesenheit neu verteilt.",
    ],
  },
  {
    role: "Alle",
    topic: "Punkte und Fairness",
    title: "So funktionieren Punkte",
    location: "Uebersicht",
    keywords: ["punkte", "rennen", "rasenmaeher", "fairness", "stand"],
    steps: [
      "Jeder Dienst bringt 1 bis 5 Punkte, sobald er erledigt ist.",
      "Im Rasenmaeher-Rennen siehst du, wer wie viel gemaeht hat.",
      "Neue Dienste bekommt bevorzugt, wer am wenigsten Punkte hat und nicht abwesend ist.",
    ],
    note: "Wer jemanden ersetzt, startet mit den Punkten des Vorgaengers. Wer zusaetzlich einzieht, bekommt einen fairen Startwert, damit er nicht alle Dienste auf einmal bekommt.",
  },
  {
    role: "Alle",
    topic: "Kalender und Abwesenheit",
    title: "Abwesenheit eintragen",
    location: "Mehr > Einstellungen",
    keywords: ["urlaub", "abwesenheit", "weg", "verreist", "krank"],
    steps: [
      "Einstellungen oeffnen.",
      "Bei Abwesenheit eintragen Von, Bis und optional einen Grund eintragen, dann Speichern.",
      "Deine Dienste in diesem Zeitraum werden verschoben und im Chat zur Uebernahme angeboten.",
    ],
  },
  {
    role: "Alle",
    topic: "Kalender und Abwesenheit",
    title: "Kalender mit Wetter",
    location: "Kalender",
    keywords: ["kalender", "monat", "wetter", "regen"],
    steps: [
      "Kalender oeffnen, mit den Pfeilen den Monat wechseln.",
      "Pro Tag siehst du Dienste, Abwesenheiten und das Wetter.",
    ],
    note: "Das Wetter kommt von WetterOnline, ersatzweise von Open-Meteo.",
  },
  {
    role: "Alle",
    topic: "Kalender und Abwesenheit",
    title: "Vorschau der naechsten Monate",
    location: "Mehr > Vorschau",
    keywords: ["vorschau", "forecast", "planung", "monate", "einloggen"],
    steps: [
      "Vorschau oeffnen. Sie zeigt geplante Dienste der naechsten 3 Monate.",
      "Bei einem Vorschlag fuer dich Einloggen klicken, um den Termin fest zu uebernehmen.",
    ],
  },
  {
    role: "Alle",
    topic: "Chat und Meldungen",
    title: "Chat und @Erwaehnungen",
    location: "Chat",
    keywords: ["chat", "nachricht", "mention", "erwaehnen", "@"],
    steps: [
      "Chat oeffnen und Nachricht schreiben, Enter sendet.",
      "Mit @ und Namen erwaehnst du jemanden. Die Person bekommt eine Meldung.",
      "Die App postet selbst Erinnerungen und Uebernahme-Aufrufe in den Chat.",
    ],
  },
  {
    role: "Alle",
    topic: "Chat und Meldungen",
    title: "Meldungen lesen",
    location: "Glocke oben rechts",
    keywords: ["meldungen", "benachrichtigung", "glocke", "gelesen"],
    steps: [
      "Auf die Glocke tippen.",
      "Bei einer Meldung Aufgabe oeffnen oder Gelesen klicken.",
    ],
  },
  {
    role: "Alle",
    topic: "Chat und Meldungen",
    title: "Push-Benachrichtigungen aktivieren",
    location: "Mehr > Einstellungen",
    keywords: ["push", "benachrichtigung", "handy", "telegram"],
    steps: [
      "Die App zuerst auf dem Startbildschirm installieren (beim iPhone Pflicht).",
      "Einstellungen oeffnen und bei Web Push aktivieren.",
      "Optional Telegram eintragen und Telegram Test senden.",
    ],
  },
  {
    role: "Alle",
    topic: "Abrechnung",
    title: "Meinen Stand verstehen",
    location: "Mehr > Abrechnung",
    keywords: ["abrechnung", "stand", "geld", "saldo", "nebenkosten", "zahlen"],
    steps: [
      "Abrechnung oeffnen. Oben steht Dein Stand: Plus heisst, du bekommst Geld, Minus heisst, du zahlst.",
      "Darunter stehen deine Ausgleichszahlungen: wer an wen wie viel zahlt.",
      "Bei Plaetze im Haushalt siehst du pro Platz Beitrag und Soll, darunter pro Person die Rechnung (Punkte, Korrekturen, Ausgaben).",
    ],
    note: "Punkte zaehlen als Arbeitszeit (Punkte mal Stunden pro Punkt mal Stundenlohn). Ausgaben zaehlen als Beitrag. Zahlungen untereinander gleichen nur aus.",
  },
  {
    role: "Alle",
    topic: "Abrechnung",
    title: "Ausgabe oder Zahlung eintragen",
    location: "Mehr > Abrechnung",
    keywords: ["ausgabe", "zahlung", "eintragen", "beleg", "ueberweisung"],
    steps: [
      "Bei Ausgabe oder Zahlung eintragen Ausgabe oder Zahlung an jemanden waehlen.",
      "Wofuer, Betrag und Datum eintragen. Bei einer Zahlung den Empfaenger waehlen.",
      "Eintragen klicken.",
    ],
    note: "Buchungen vor dem Beginn des laufenden Zeitraums sind nicht moeglich, weil dieser Zeitraum schon abgerechnet ist.",
  },
  {
    role: "Alle",
    topic: "Abrechnung",
    title: "Team-Abrechnung beim Mitbewohner-Wechsel",
    location: "Mehr > Abrechnung",
    keywords: ["team", "wechsel", "nachfolger", "anteilig", "platz"],
    steps: [
      "Wer jemanden ersetzt, teilt sich mit ihm einen Platz und bildet ein Team.",
      "Liegt das Team unter seinem Soll, wird das Minus nach Anwesenheitstagen geteilt.",
      "Liegt das Team darueber, wird das Plus nach eigenem Beitrag verteilt.",
    ],
    note: "Beispiel: Neu war 2 von 12 Monaten da, dann traegt er 1/6 eines Team-Minus, der Vorgaenger 5/6.",
  },
  {
    role: "Owner/Admin",
    topic: "Abrechnung",
    title: "Wert eines Punktes und Korrekturen",
    location: "Abrechnung > Verwaltung",
    keywords: ["stundenlohn", "punktwert", "korrektur", "startwert", "anpassung"],
    steps: [
      "Verwaltung aufklappen.",
      "Bei Wert eines Punktes Stundenlohn und Stunden pro Punkt setzen.",
      "Bei Korrektur eintragen Punkte oder Betrag fuer eine Person ergaenzen, z. B. als Startwert.",
      "Doppelte oder falsche Korrekturen unter Verlauf in diesem Zeitraum mit Loeschen entfernen.",
    ],
    note: "Korrekturen zaehlen in der Abrechnung und bei der fairen Verteilung neuer Dienste.",
  },
  {
    role: "Owner/Admin",
    topic: "Abrechnung",
    title: "Abrechnung abschliessen (z. B. im Maerz)",
    location: "Abrechnung > Verwaltung",
    keywords: ["abschliessen", "jahresabrechnung", "maerz", "archiv", "zeitraum"],
    steps: [
      "Verwaltung aufklappen.",
      "ABSCHLIESSEN eintippen und Abrechnung abschliessen klicken.",
      "Das Ergebnis bis gestern steht unter Fruehere Abrechnungen. Ab heute laeuft ein neuer Zeitraum.",
    ],
    note: "Ausgezogene Personen fallen nach dem Abschluss aus der Abrechnung.",
  },
  {
    role: "Owner/Admin",
    topic: "Mitglieder",
    title: "Mitbewohner einladen",
    location: "Mehr > Mitglieder",
    keywords: ["einladen", "invite", "link", "neu"],
    steps: [
      "Mitglieder oeffnen, bei Neue Person Per Einladungslink waehlen.",
      "Bei Ersetzt festlegen, ob die Person jemanden ersetzt oder zusaetzlich dazukommt.",
      "Link erstellen, dann den Link aus Offene Einladungen kopieren und verschicken.",
    ],
    note: "Mit eingetragener E-Mail funktioniert der Link nur fuer genau diese E-Mail. Ohne E-Mail kann ihn jede Person nutzen.",
  },
  {
    role: "Owner/Admin",
    topic: "Mitglieder",
    title: "Person vorab anlegen",
    location: "Mehr > Mitglieder",
    keywords: ["vorab", "anlegen", "noch nicht beigetreten", "profil"],
    steps: [
      "Bei Neue Person Vorab anlegen aufklappen.",
      "Name, E-Mail und optional Ersetzt eintragen, dann Person anlegen.",
      "Die Person bekommt sofort Dienste. Meldet sie sich spaeter mit dieser E-Mail an, uebernimmt sie ihr Profil.",
    ],
    note: "Gibt es fuer die E-Mail schon ein Konto, schicke stattdessen einen Einladungslink.",
  },
  {
    role: "Owner/Admin",
    topic: "Mitglieder",
    title: "Auszug eintragen",
    location: "Mehr > Mitglieder",
    keywords: ["auszug", "ausgezogen", "deaktivieren", "weg"],
    steps: [
      "Bei der Person Bearbeiten aufklappen.",
      "Auszugsdatum waehlen und Als ausgezogen markieren klicken.",
      "Die offenen Dienste der Person werden wieder frei. Sie bleibt bis zum Abschluss in der Abrechnung.",
    ],
  },
  {
    role: "Owner/Admin",
    topic: "Mitglieder",
    title: "Einzugsdatum korrigieren",
    location: "Mehr > Mitglieder",
    keywords: ["einzug", "eingezogen", "datum", "rueckwirkend", "anfang"],
    steps: [
      "Bei der Person Bearbeiten aufklappen (bei Ausgezogenen: Daten korrigieren).",
      "Eingezogen am setzen und speichern.",
    ],
    note: "Das Einzugsdatum bestimmt den Anteil an der Abrechnung. Wer von Anfang an dabei war, sollte das Datum des Zeitraumbeginns haben.",
  },
  {
    role: "Owner/Admin",
    topic: "Mitglieder",
    title: "Rolle aendern",
    location: "Mehr > Mitglieder",
    keywords: ["rolle", "admin", "owner", "mitglied", "rechte"],
    steps: [
      "Bei der Person Bearbeiten aufklappen.",
      "Rolle waehlen und Rolle speichern.",
    ],
    note: "Owner und Admins haben dieselben Rechte. Einzige Regel: Es muss immer mindestens einen aktiven Owner geben, der letzte Owner kann nicht herabgestuft werden.",
  },
  {
    role: "Owner/Admin",
    topic: "Mitglieder",
    title: "Owner-Rolle uebergeben oder Owner ersetzen",
    location: "Mehr > Mitglieder",
    keywords: ["owner", "uebergeben", "nachfolger", "hauptverantwortlich"],
    steps: [
      "Zuerst die neue Person zum Owner machen, danach die bisherige Owner-Rolle auf Admin oder Mitglied setzen.",
      "Zieht der Owner aus: Einladung mit Ersetzt = bisheriger Owner erstellen. Der Nachfolger wird automatisch Owner.",
    ],
    note: "Wird der letzte Owner per Einladung ersetzt, bekommt der Nachfolger die Owner-Rolle automatisch.",
  },
  {
    role: "Owner/Admin",
    topic: "Mitglieder",
    title: "Owner-Rolle wiederherstellen",
    location: "Uebersicht",
    keywords: ["owner", "wiederherstellen", "kein owner"],
    steps: [
      "Hat der Garten keinen aktiven Owner mehr, sieht der Ersteller einen Hinweis auf der Uebersicht.",
      "Mich wieder zum Owner machen klicken.",
    ],
  },
  {
    role: "Owner/Admin",
    topic: "Planung und Vorlagen",
    title: "Vorlagen fuer wiederkehrende Dienste",
    location: "Mehr > Vorlagen",
    keywords: ["vorlage", "wiederkehrend", "saison", "intervall", "wetterabhaengig"],
    steps: [
      "Vorlagen oeffnen und bei Eigene Vorlage anlegen Titel, Punkte, Saison und Wiederholung setzen.",
      "Wetterabhaengig markieren, wenn das Wetter bei Planung und Erinnerung zaehlt.",
      "Die App legt jeden Morgen automatisch neue Dienste aus den Vorlagen an.",
    ],
  },
  {
    role: "Owner/Admin",
    topic: "Planung und Vorlagen",
    title: "Saisonaufgaben sofort erzeugen",
    location: "Mehr > Vorlagen",
    keywords: ["saison", "erzeugen", "generieren"],
    steps: [
      "Vorlagen oeffnen.",
      "Saisonaufgaben erzeugen klicken. Doppelte Dienste werden automatisch vermieden.",
    ],
  },
  {
    role: "Owner/Admin",
    topic: "Planung und Vorlagen",
    title: "Chat-Erinnerung testen",
    location: "Uebersicht",
    keywords: ["test", "erinnerung", "chat", "check"],
    steps: [
      "Auf der Uebersicht Chat-Erinnerung testen aufklappen.",
      "Bei einem Dienst Testen klicken und das Ergebnis im Chat pruefen.",
    ],
  },
  {
    role: "Alle",
    topic: "Einstellungen",
    title: "Anzeigenamen aendern",
    location: "Mehr > Einstellungen",
    keywords: ["name", "anzeigename", "profil"],
    steps: ["Einstellungen oeffnen.", "Bei Mein Anzeigename den Namen aendern und Namen speichern."],
  },
  {
    role: "Alle",
    topic: "Einstellungen",
    title: "Verlauf ansehen",
    location: "Mehr > Verlauf",
    keywords: ["verlauf", "log", "historie", "wer hat"],
    steps: ["Verlauf oeffnen.", "Nach Ereignis filtern oder suchen, z. B. wer welchen Dienst erledigt hat."],
  },
  {
    role: "Alle",
    topic: "Einstellungen",
    title: "Garten verlassen",
    location: "Mehr > Einstellungen > Gefahrenzone",
    keywords: ["verlassen", "austreten", "ausziehen"],
    steps: [
      "Einstellungen oeffnen, ganz unten Garten verlassen.",
      "Deine offenen Dienste werden frei. Du bleibst bis zum Abschluss in der Abrechnung.",
    ],
    note: "Der letzte Owner kann den Garten nicht verlassen.",
  },
  {
    role: "Owner/Admin",
    topic: "Einstellungen",
    title: "Gartenname, Wetterort und Chat-Aufbewahrung",
    location: "Mehr > Einstellungen",
    keywords: ["gartenname", "wetter", "ort", "chat", "aufbewahrung", "loeschen"],
    steps: [
      "Einstellungen oeffnen.",
      "Gartenname aendern und Garten speichern.",
      "Bei Wetter den Ort eintragen, z. B. Murnau am Staffelsee.",
      "Bei Chat-Einstellungen festlegen, nach wie vielen Tagen Nachrichten geloescht werden.",
    ],
  },
  {
    role: "Owner/Admin",
    topic: "Einstellungen",
    title: "Garten loeschen",
    location: "Mehr > Einstellungen > Gefahrenzone",
    keywords: ["loeschen", "garten entfernen", "alles loeschen"],
    steps: [
      "Einstellungen oeffnen, ganz unten Garten loeschen.",
      "LOESCHEN eintippen und bestaetigen. Alle Dienste, Punkte, Chats und Abrechnungen werden endgueltig geloescht.",
    ],
  },
];
