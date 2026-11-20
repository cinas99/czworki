// GET /panel/api/staty?dni=14 → liczniki zdarzeń z ostatnich dni
export async function onRequestGet({ request, env }) {
  const h = { "content-type": "application/json" };
  if (!env.DB) return new Response(JSON.stringify({ error: "Brak bazy D1 (powiązanie DB)", rows: [] }), { headers: h });
  const days = Math.min(90, +new URL(request.url).searchParams.get("dni") || 14);
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  try {
    const { results } = await env.DB.prepare("SELECT day, event, count, sum_ms FROM stats WHERE day >= ?1 ORDER BY day DESC").bind(since).all();
    let push = 0; try { push = (await env.DB.prepare("SELECT COUNT(*) AS n FROM push_subs").first()).n; } catch {}
    return new Response(JSON.stringify({ rows: results, push }), { headers: h });
  } catch { return new Response(JSON.stringify({ rows: [] }), { headers: h }); }
}
