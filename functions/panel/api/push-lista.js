// GET /panel/api/push-lista → zapisane urządzenia (bez pełnych adresów; tylko rodzaj przeglądarki i data zapisu)
import { ensure } from "../../_lib/push.js";
const kind = (ep) => /fcm\.googleapis|push\.api\.chromium/.test(ep) ? "Chrome / Android / Edge" : /mozilla/.test(ep) ? "Firefox" : /push\.apple/.test(ep) ? "Safari / iPhone / Mac" : /notify\.windows/.test(ep) ? "Windows" : "inna";
export async function onRequestGet({ env }) {
  const h = { "content-type": "application/json" };
  if (!env.DB) return new Response(JSON.stringify({ list: [] }), { headers: h });
  await ensure(env.DB);
  const { results } = await env.DB.prepare("SELECT id, endpoint, created FROM push_subs ORDER BY id DESC LIMIT 200").all();
  return new Response(JSON.stringify({ list: results.map((r) => ({ id: r.id, rodzaj: kind(r.endpoint), od: r.created, koncowka: r.endpoint.slice(-6) })) }), { headers: h });
}
