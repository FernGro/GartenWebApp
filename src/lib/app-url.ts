export function getPublicAppUrl() {
  // Trimmed because a stray space in the env value breaks Supabase email links ("first path segment cannot contain colon").
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
}

export function getBrowserAppUrl() {
  if (typeof window === "undefined") {
    return getPublicAppUrl();
  }

  return getPublicAppUrl() || window.location.origin;
}
