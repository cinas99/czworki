// GET /panel/api/pexels?q=…&n=15 → wyniki z Pexels (klucz trzymany na serwerze)
export async function onRequestGet({ request, env }) {
  if (!env.PEXELS_KEY) return new Response(JSON.stringify({ error: "Brak PEXELS_KEY w ustawieniach Cloudflare" }), { status: 500, headers: { "content-type": "application/json" } });
  const u = new URL(request.url), q = u.searchParams.get("q") || "", n = Math.min(40, +u.searchParams.get("n") || 15);
  const r = await fetch(`https://api.pexels.com/v1/search?locale=pl-PL&orientation=landscape&per_page=${n}&query=` + encodeURIComponent(q), { headers: { Authorization: String(env.PEXELS_KEY).trim().replace(/^["']|["']$/g, "") } });
  return new Response(await r.text(), { status: r.status, headers: { "content-type": "application/json" } });
}
