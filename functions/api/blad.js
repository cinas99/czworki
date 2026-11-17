// POST /api/blad {m} → zapis błędu z gry (sam komunikat, bez danych osobowych). Trzyma 200 ostatnich.
import { json } from "../_lib/util.js";
const SCHEMA = "CREATE TABLE IF NOT EXISTS errors (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, msg TEXT NOT NULL)";
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false }, 202);
  let b = {}; try { b = await request.json(); } catch {}
  const msg = String(b.m || "").replace(/https?:\/\/[^\s)]+/g, (u) => { try { return new URL(u).pathname; } catch { return u; } }).slice(0, 220);
  if (!msg) return json({ ok: false }, 400);
  const run = async () => {
    await env.DB.prepare("INSERT INTO errors (at, msg) VALUES (?1, ?2)").bind(new Date().toISOString(), msg).run();
    await env.DB.prepare("DELETE FROM errors WHERE id <= (SELECT MAX(id) - 200 FROM errors)").run();
  };
  try { await run(); } catch { await env.DB.prepare(SCHEMA).run(); await run(); }
  return json({ ok: true });
}
