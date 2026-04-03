const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export async function subscribePush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const { public_key } = await fetch(`${API_URL}/api/push/vapid-public-key`).then((r) => r.json());
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(public_key),
  });

  const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  await fetch(`${API_URL}/api/push/subscribe`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth }),
  });

  localStorage.setItem("push_subscribed", "true");
  return true;
}

export async function unsubscribePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  await fetch(`${API_URL}/api/push/unsubscribe`, {
    method: "DELETE",
    headers: authHeaders(),
    body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth }),
  });

  await sub.unsubscribe();
  localStorage.removeItem("push_subscribed");
}

export function isPushSubscribed(): boolean {
  return localStorage.getItem("push_subscribed") === "true";
}
