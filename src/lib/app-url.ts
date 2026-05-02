export function getPublicAppUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
}

export function getBrowserAppUrl() {
  if (typeof window === "undefined") {
    return getPublicAppUrl();
  }

  return getPublicAppUrl() || window.location.origin;
}
