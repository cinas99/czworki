// GET /panel/api/przeglad?dni=7 → gra + post + rolka na najbliższe dni, z ostrzeżeniami i statusem „sprawdzone”
// POST {d, ok} → zapisuje „sprawdzone” w D1 (kv: review-YYYY-MM-DD)
import { isDate, json, rowsFor, warsawToday, DATES } from "../../_lib/util.js";
import MK from "../../_generated/marketing.js";
const ROLKI_START = "2026-11-26";
const add = (d, n) => new Date(Date.parse(d + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const diff = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
const words = (r) => r ? [r.slowo1, r.slowo2, r.slowo3, r.slowo4] : [];
const kind = (k) => /___|…|\.\.\./.test(k) ? "luka" : /jak\b/i.test(k) ? "jak" : /^\s*(mają|ma|można)\b/i.test(k) ? "maja" : "inne";
async function ensure(db) { await db.prepare("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)").run(); }
export async function onRequestGet({ request, env }) {
  const n = Math.min(14, +new URL(request.url).searchParams.get("dni") || 7);
  const today = warsawToday(); const out = [];
  let done = {};
  if (env.DB) { try { await ensure(env.DB); const { results } = await env.DB.prepare("SELECT k, v FROM kv WHERE k LIKE 'review-%'").all(); for (const r of results) done[r.k.slice(7)] = JSON.parse(r.v); } catch {} }
  for (let i = 0; i < n; i++) {
    const d = add(today, i), warn = [];
    const gra = rowsFor(d);
    const post = MK.posty.find((p) => p.data === d) || null;
    const prev = MK.posty.find((p) => p.data === add(d, -1)) || null;
    const ri = diff(ROLKI_START, d) + 1;
    const rolka = MK.rolki.find((r) => +r.nr === ri) || null;
    if (gra.length !== 4) warn.push("brak zagadki w grze");
    if (!post) warn.push("brak posta");
    if (!rolka && d >= ROLKI_START) warn.push("brak rolki");
    const gw = new Set(gra.flatMap(words));
    for (const [nm, x] of [["post", post], ["rolka", rolka]]) { const hit = words(x).filter((w) => gw.has(w)); if (hit.length) warn.push(`${nm}: słowo ${hit.join(", ")} jest też w grze`); }
    const kinds = gra.map((g) => kind(g.kategoria));
    for (const k of ["luka", "jak"]) if (kinds.filter((x) => x === k).length > 1) warn.push(k === "luka" ? "gra: kilka grup „___ słowo”" : "gra: kilka porównań „jak…”");
    out.push({ d, gra: gra.map((g) => ({ kolor: g.kolor, kategoria: g.kategoria, slowa: words(g), zdjecie: !!g.zdjecie })), post, prev: prev ? { odpowiedz: prev.odpowiedz, slowa: words(prev) } : null, rolka, warn, done: done[d] || null });
  }
  const last = (arr) => arr.length ? arr[arr.length - 1] : null;
  const lastPost = last(MK.posty.map((p) => p.data).sort());
  const lastRolka = MK.rolki.length ? add(ROLKI_START, Math.max(...MK.rolki.map((r) => +r.nr)) - 1) : null;
  return json({ today, days: out, zapas: { gra: last(DATES), posty: lastPost, rolki: lastRolka } });
}
export async function onRequestPost({ request, env }) {
  const { d, ok } = await request.json().catch(() => ({}));
  if (!isDate(d) || !env.DB) return json({ error: "zły dzień albo brak D1" }, 400);
  await ensure(env.DB);
  const email = request.headers.get("cf-access-authenticated-user-email") || "";
  if (ok) await env.DB.prepare("INSERT OR REPLACE INTO kv (k, v) VALUES (?1, ?2)").bind("review-" + d, JSON.stringify({ at: new Date().toISOString(), email })).run();
  else await env.DB.prepare("DELETE FROM kv WHERE k = ?1").bind("review-" + d).run();
  return json({ ok: true });
}
