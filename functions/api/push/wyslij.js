// POST /api/push/wyslij → codzienna wysyłka przypomnień, partiami po 40 (limit zapytań Cloudflare).
// Bezpieczne do wywołania przez każdego: działa tylko od 8:00 czasu polskiego i najwyżej raz dziennie dla każdego urządzenia.
import { vapidKeys, vapidHeader, ensure } from "../../_lib/push.js";
import { warsawToday } from "../../_lib/util.js";
const out = (d) => new Response(JSON.stringify(d), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
export async function onRequestPost({ env }) {
  if (!env.DB) return out({ ok: false, remaining: 0 });
  const hour = +new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", hourCycle: "h23" }).format(new Date());
  if (hour < 8) return out({ ok: true, skipped: "za wcześnie", remaining: 0 });
  await ensure(env.DB);
  const day = warsawToday(), cKey = "push-cursor-" + day;
  const cur = +((await env.DB.prepare("SELECT v FROM kv WHERE k = ?1").bind(cKey).first())?.v || 0);
  const { results } = await env.DB.prepare("SELECT id, endpoint FROM push_subs WHERE id > ?1 ORDER BY id LIMIT 40").bind(cur).all();
  if (!results.length) return out({ ok: true, sent: 0, remaining: 0 });
  const keys = await vapidKeys(env.DB);
  let sent = 0, removed = 0;
  await Promise.all(results.map(async (s) => {
    try {
      const r = await fetch(s.endpoint, { method: "POST", headers: { TTL: "43200", Urgency: "high", Topic: "nowa-zagadka", Authorization: await vapidHeader(keys, s.endpoint), "Content-Length": "0" } });
      if (r.status === 410) { await env.DB.prepare("DELETE FROM push_subs WHERE id = ?1").bind(s.id).run(); removed++; }
      else if (r.ok) sent++;
    } catch {}
  }));
  const last = results[results.length - 1].id;
  await env.DB.prepare("INSERT INTO kv (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2").bind(cKey, String(last)).run();
  const left = (await env.DB.prepare("SELECT COUNT(*) AS n FROM push_subs WHERE id > ?1").bind(last).first()).n;
  return out({ ok: true, sent, removed, remaining: left });
}
