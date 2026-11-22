// POST /panel/api/push-test → testowe przypomnienie do wszystkich zapisanych urządzeń (tylko dla zalogowanego admina)
import { vapidKeys, vapidHeader, ensure } from "../../_lib/push.js";
export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const one = Number.isInteger(body.id) ? body.id : null;
  const h = { "content-type": "application/json" };
  if (!env.DB) return new Response(JSON.stringify({ error: "Brak bazy" }), { status: 500, headers: h });
  await ensure(env.DB);
  const { results } = one
    ? await env.DB.prepare("SELECT id, endpoint FROM push_subs WHERE id = ?1").bind(one).all()
    : await env.DB.prepare("SELECT id, endpoint FROM push_subs ORDER BY id DESC LIMIT 40").all();
  const keys = await vapidKeys(env.DB);
  let sent = 0;
  await Promise.all(results.map(async (s) => {
    try {
      const r = await fetch(s.endpoint, { method: "POST", headers: { TTL: "600", Urgency: "high", Authorization: await vapidHeader(keys, s.endpoint), "Content-Length": "0" } });
      if (r.status === 410) await env.DB.prepare("DELETE FROM push_subs WHERE id = ?1").bind(s.id).run();
      else if (r.ok) sent++;
    } catch {}
  }));
  return new Response(JSON.stringify({ sent, all: results.length }), { headers: h });
}
