// POST /api/push/zapis {endpoint} → włącz przypomnienia; DELETE → wyłącz. Zapisujemy tylko adres skrzynki powiadomień przeglądarki.
import { ensure, ALLOWED_PUSH } from "../../_lib/push.js";
const out = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
async function read(request) { const b = await request.json().catch(() => ({})); return String(b.endpoint || ""); }
export async function onRequestPost({ request, env }) {
  if (!env.DB) return out({ ok: false }, 503);
  const ep = await read(request);
  if (!ALLOWED_PUSH.test(ep) || ep.length > 800) return out({ ok: false }, 400);
  await ensure(env.DB);
  await env.DB.prepare("INSERT OR IGNORE INTO push_subs (endpoint, created) VALUES (?1, ?2)").bind(ep, new Date().toISOString()).run();
  return out({ ok: true });
}
export async function onRequestDelete({ request, env }) {
  if (!env.DB) return out({ ok: false }, 503);
  const ep = await read(request);
  await ensure(env.DB);
  await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?1").bind(ep).run();
  return out({ ok: true });
}
