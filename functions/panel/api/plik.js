// GET  /panel/api/plik?p=zagadki.csv → {text, sha}
// PUT  /panel/api/plik {p, text, sha, message} → zapis (commit) do repo na GitHubie
const FILES = new Set(["zagadki.csv", "zapas.csv"]);
const gh = (env, path, init = {}) => fetch(`https://api.github.com/repos/${env.GITHUB_REPO || "cinas99/czworki"}/contents/${path}`, {
  ...init,
  headers: { Authorization: "Bearer " + env.GITHUB_TOKEN, Accept: "application/vnd.github+json", "User-Agent": "czworki-panel", ...(init.headers || {}) },
});
const out = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const dec = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
const enc = (s) => { const u = new TextEncoder().encode(s); let bin = ""; for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(bin); };

export async function onRequestGet({ request, env }) {
  const p = new URL(request.url).searchParams.get("p");
  if (!FILES.has(p)) return out({ error: "zły plik" }, 400);
  if (!env.GITHUB_TOKEN) return out({ error: "Brak GITHUB_TOKEN w ustawieniach Cloudflare" }, 500);
  const r = await gh(env, p + "?ref=" + (env.GITHUB_BRANCH || "main"));
  if (r.status === 404 && p === "zapas.csv") return out({ text: "kategoria,slowo1,slowo2,slowo3,slowo4,zdjecie,wyjasnienie\n", sha: null });
  if (!r.ok) return out({ error: "GitHub: " + r.status }, 502);
  const j = await r.json();
  return out({ text: dec(j.content), sha: j.sha });
}

export async function onRequestPut({ request, env }) {
  const b = await request.json().catch(() => ({}));
  if (!FILES.has(b.p) || typeof b.text !== "string") return out({ error: "złe dane" }, 400);
  const who = request.headers.get("cf-access-authenticated-user-email") || "panel";
  const r = await gh(env, b.p, { method: "PUT", body: JSON.stringify({ message: (b.message || "Panel: zmiana") + ` [${who}]`, content: enc(b.text), branch: env.GITHUB_BRANCH || "main", ...(b.sha ? { sha: b.sha } : {}) }) });
  if (!r.ok) { const j = await r.json().catch(() => ({})); return out({ error: r.status === 409 ? "Plik zmienił się w międzyczasie. Odśwież panel." : (j.message || "Błąd zapisu " + r.status) }, r.status === 409 ? 409 : 502); }
  return out({ sha: (await r.json()).content.sha });
}
