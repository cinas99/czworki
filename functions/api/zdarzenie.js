// POST /api/zdarzenie {e, ms?} → anonimowy licznik zdarzeń na dany dzień (bez cookies i danych osobowych).
// Wymaga powiązania bazy D1 o nazwie DB; bez niej po prostu nic nie zapisuje.
import { warsawToday, json } from "../_lib/util.js";

const ALLOWED = /^(visit|visit_return|start|win|loss|replay|archive_start|archive_win|share_(link|wa|ms|fb|sms|x|copy|native)|share_time|push_on|push_off|push_open|hint)$/;
const SCHEMA = "CREATE TABLE IF NOT EXISTS stats (day TEXT NOT NULL, event TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, sum_ms INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, event))";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, reason: "no-db" }, 202);
  if (/bot|crawl|spider|facebookexternalhit|meta-externalagent|headless/i.test(request.headers.get("user-agent") || "")) return json({ ok: false, reason: "bot" }, 202);
  let body = {};
  try { body = await request.json(); } catch {}
  const e = String(body.e || "");
  if (!ALLOWED.test(e)) return json({ ok: false }, 400);
  const ms = Number.isFinite(body.ms) && body.ms > 0 && body.ms < 6 * 3600e3 ? Math.round(body.ms) : 0;
  const q = env.DB.prepare("INSERT INTO stats (day, event, count, sum_ms) VALUES (?1, ?2, 1, ?3) ON CONFLICT(day, event) DO UPDATE SET count = count + 1, sum_ms = sum_ms + ?3").bind(warsawToday(), e, ms);
  try { await q.run(); }
  catch (err) { await env.DB.prepare(SCHEMA).run(); await q.run(); }
  return json({ ok: true });
}
