// Powiadomienia web push bez treści (nie wymagają szyfrowania): tylko podpis VAPID (ES256).
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS push_subs (id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT UNIQUE NOT NULL, created TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)",
];
export async function ensure(db) { for (const q of SCHEMA) await db.prepare(q).run(); }

// Klucze VAPID tworzone automatycznie przy pierwszym użyciu i trzymane w prywatnej bazie D1
export async function vapidKeys(db) {
  await ensure(db);
  const row = await db.prepare("SELECT v FROM kv WHERE k = 'vapid'").first();
  if (row) return JSON.parse(row.v);
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const keys = { pub: b64u(await crypto.subtle.exportKey("raw", kp.publicKey)), priv: await crypto.subtle.exportKey("jwk", kp.privateKey) };
  await db.prepare("INSERT OR IGNORE INTO kv (k, v) VALUES ('vapid', ?1)").bind(JSON.stringify(keys)).run();
  return JSON.parse((await db.prepare("SELECT v FROM kv WHERE k = 'vapid'").first()).v);
}

export async function vapidHeader(keys, endpoint) {
  const enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ typ: "JWT", alg: "ES256" }) + "." + enc({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:quiethours.apps@gmail.com" });
  const key = await crypto.subtle.importKey("jwk", keys.priv, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned));
  return `vapid t=${unsigned}.${b64u(sig)}, k=${keys.pub}`;
}

export const ALLOWED_PUSH = /^https:\/\/([a-z0-9-]+\.)*(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com|push\.api\.chromium\.org)\//i;
