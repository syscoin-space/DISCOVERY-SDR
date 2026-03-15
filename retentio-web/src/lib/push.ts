import { api } from "./api/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const { data } = await api.get("/notifications/vapid-public-key");
    return data.publicKey || null;
  } catch {
    return null;
  }
}

export async function registerPushNotifications(): Promise<boolean> {
  // 1. Check browser support
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push notifications not supported");
    return false;
  }

  // 2. Request permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return false;
  }

  try {
    // 3. Register service worker
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    // 4. Get VAPID key
    const vapidKey = await getVapidPublicKey();
    if (!vapidKey) {
      console.error("VAPID key not available");
      return false;
    }

    // 5. Create push subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });

    const json = subscription.toJSON();

    // 6. Send to backend
    await api.post("/notifications/subscribe", {
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      },
    });

    return true;
  } catch (err) {
    console.error("Failed to register push notifications:", err);
    return false;
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await api.delete("/notifications/unsubscribe", {
        data: { endpoint: subscription.endpoint },
      });
      await subscription.unsubscribe();
    }
  } catch (err) {
    console.error("Failed to unregister push:", err);
  }
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}
