// Wszystko pod /panel/api/* wymaga zalogowania przez Cloudflare Access.
// Access dokleja nagłówek z e-mailem zalogowanej osoby; bez niego (Access niewłączony) dostęp jest zablokowany.
export async function onRequest({ request, env, next }) {
  const email = (request.headers.get("cf-access-authenticated-user-email") || "").toLowerCase();
  const allowed = (env.ADMIN_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  if (!email || (allowed.length && !allowed.includes(email))) {
    return new Response(JSON.stringify({ error: "Brak dostępu. Zaloguj się przez Cloudflare Access." }), { status: 403, headers: { "content-type": "application/json" } });
  }
  return next();
}
