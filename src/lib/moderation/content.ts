const blockedTerms = [
  "penis",
  "pimmel",
  "schwanz",
  "fotze",
  "wichser",
  "hurensohn",
  "arschloch",
];

export function assertCleanText(value: string, fieldName = "Text") {
  const normalized = value.toLowerCase();
  const blocked = blockedTerms.find((term) => normalized.includes(term));

  if (blocked) {
    throw new Error(`${fieldName} enthaelt einen unpassenden Begriff. Bitte sachlich formulieren.`);
  }
}

export function assertCleanOptionalText(value: string | null, fieldName = "Text") {
  if (value) {
    assertCleanText(value, fieldName);
  }
}
