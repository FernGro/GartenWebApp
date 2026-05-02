"use client";

import { useState } from "react";
import { disablePushSubscriptionAction, savePushSubscriptionAction } from "@/lib/notifications/push-actions";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function WebPushPanel({ gardenId, publicKey }: { gardenId: string; publicKey: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function enablePush() {
    setLoading(true);
    setMessage(null);

    try {
      if (!publicKey) {
        setMessage("Web Push ist auf dem Server noch nicht konfiguriert.");
        return;
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setMessage("Dieser Browser unterstuetzt Web Push nicht.");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setMessage("Push wurde nicht erlaubt.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await savePushSubscriptionAction(gardenId, subscription.toJSON(), navigator.userAgent);
      setMessage("Web Push ist fuer dieses Geraet aktiv.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Push konnte nicht aktiviert werden.");
    } finally {
      setLoading(false);
    }
  }

  async function disablePush() {
    setLoading(true);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = registration ? await registration.pushManager.getSubscription() : null;

      if (subscription) {
        await disablePushSubscriptionAction(gardenId, subscription.endpoint);
        await subscription.unsubscribe();
      }

      setMessage("Web Push wurde auf diesem Geraet deaktiviert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Push konnte nicht deaktiviert werden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-[#d7dfcf] bg-[#f8faf3] p-4">
      <h3 className="font-bold">Web Push</h3>
      <p className="mt-1 text-sm leading-6 text-[#5a6655]">
        Aktiviert echte Browser-Benachrichtigungen fuer dieses Geraet, z. B. bei Tauschanfragen, Pruefungen, Wochen-Erinnerungen und Zahlungen.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button disabled={loading} onClick={enablePush} type="button">
          Push aktivieren
        </Button>
        <Button disabled={loading} onClick={disablePush} type="button" variant="secondary">
          Auf diesem Geraet deaktivieren
        </Button>
      </div>
      {message ? <p className="mt-3 text-sm text-[#42513d]">{message}</p> : null}
    </div>
  );
}
