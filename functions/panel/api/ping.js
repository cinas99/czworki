export async function onRequestGet({ request, env }) {
  return new Response(JSON.stringify({ ok: true, email: request.headers.get("cf-access-authenticated-user-email"), github: !!env.GITHUB_TOKEN, pexels: !!env.PEXELS_KEY, stats: !!env.DB }), { headers: { "content-type": "application/json" } });
}
