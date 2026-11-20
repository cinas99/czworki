// GET /api/push/klucz → publiczny klucz VAPID dla przeglądarki
import { vapidKeys } from "../../_lib/push.js";
export async function onRequestGet({ env }) {
  if (!env.DB) return new Response("{}", { status: 503 });
  const k = await vapidKeys(env.DB);
  return new Response(JSON.stringify({ key: k.pub }), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
