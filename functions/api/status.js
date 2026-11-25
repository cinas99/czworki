// GET /api/status → stan gry do podglądu (np. widget na telefonie): czy jest dzisiejsza zagadka,
// ile dni w zapasie, statystyki z 7 dni i ostatnie błędy. Tylko liczby, bez odpowiedzi do zagadek.
import { warsawToday, DATES } from "../_lib/util.js";
import BUILD from "../_generated/build.js";

export async function onRequestGet({ env }) {
  const today = warsawToday();
  const ahead = DATES.filter((d) => d > today).length;
  const last = DATES[DATES.length - 1];
  const out = {
    gra: "Czwórki", url: "https://czworki.pl", teraz: new Date().toISOString(), wdrozenie: BUILD,
    zagadki: { dzis: today, jestDzisiejsza: DATES.includes(today), dniWZapasie: ahead, ostatnia: last, ostrzezenie: !DATES.includes(today) ? "Brak zagadki na dziś!" : ahead < 7 ? `Zostało tylko ${ahead} dni zagadek` : null },
    statystyki: [], bledy: { dzis: 0, tydzien: 0, ostatnie: [] }, ok: true,
  };
  if (env.DB) {
    const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    try {
      const { results } = await env.DB.prepare("SELECT day, event, count, sum_ms FROM stats WHERE day >= ?1").bind(since).all();
      const days = {};
      for (const r of results) (days[r.day] = days[r.day] || {})[r.event] = r;
      const n = (d, e) => (d[e] ? d[e].count : 0);
      out.statystyki = Object.keys(days).sort().reverse().map((day) => {
        const d = days[day];
        const shares = Object.keys(d).filter((k) => k.startsWith("share_") && k !== "share_time").reduce((a, k) => a + d[k].count, 0);
        return { dzien: day, gracze: n(d, "visit"), wracajacy: n(d, "visit_return"), zaczeli: n(d, "start"), wygrali: n(d, "win"), przegrali: n(d, "loss"),
          sredniCzasS: d.win && d.win.count ? Math.round(d.win.sum_ms / d.win.count / 1000) : null, polecenia: shares, archiwum: n(d, "archive_start"),
          podpowiedzi: n(d, "hint"), odZnajomych: n(d, "visit_ref"), zPrzypomnien: n(d, "push_open"),
          zProfili: { fb: n(d, "visit_src_fb"), ig: n(d, "visit_src_ig"), tt: n(d, "visit_src_tt"), yt: n(d, "visit_src_yt") } };
      });
    } catch {}
    try {
      const dayStart = new Date(Date.now() - 864e5).toISOString(), weekStart = new Date(Date.now() - 7 * 864e5).toISOString();
      const c = await env.DB.prepare("SELECT SUM(at >= ?1) AS dzis, SUM(at >= ?2) AS tydzien FROM errors").bind(dayStart, weekStart).first();
      const { results } = await env.DB.prepare("SELECT at, msg FROM errors ORDER BY id DESC LIMIT 5").all();
      out.bledy = { dzis: c?.dzis || 0, tydzien: c?.tydzien || 0, ostatnie: results };
    } catch {}
  }
  if (env.DB) { try { out.przypomnienia = (await env.DB.prepare("SELECT COUNT(*) AS n FROM push_subs").first()).n; } catch { out.przypomnienia = 0; } }
  out.ok = out.zagadki.jestDzisiejsza && out.zagadki.dniWZapasie >= 7 && out.bledy.dzis === 0;
  return new Response(JSON.stringify(out, null, 1), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" } });
}
