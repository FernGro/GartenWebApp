self.addEventListener("push", (event) => {
  let payload = {
    title: "Garten Dienstplan",
    message: "Neue Meldung",
    url: "/notifications",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch (_error) {
      payload.message = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.message,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: {
        url: payload.url || "/notifications",
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === targetUrl);

      if (existing) {
        return existing.focus();
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});
