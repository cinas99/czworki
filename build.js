// Build dla Cloudflare Pages: kopiuje stronę do public/ (bez bazy zagadek)
// i wbudowuje zagadki w kod serwera (functions/_generated/puzzles.js).
// Polecenie budowania w Cloudflare: node build.js   Katalog wyjściowy: public
const fs = require("fs");
const path = require("path");

const SITE = ["index.html", "app.js", "images.js", "style.css", "archiwum.html", "jak-grac.html", "polityka-prywatnosci.html", "o-grze.html", "panel.html", "panel-przeglad.html", "ads.txt", "_redirects", "robots.txt", "sitemap.xml", "manifest.webmanifest", "sw.js"];
const out = path.join(__dirname, "public");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of SITE) if (fs.existsSync(f)) fs.copyFileSync(f, path.join(out, f));
for (const dir of ["ikony", ".well-known"]) if (fs.existsSync(dir)) fs.cpSync(dir, path.join(out, dir), { recursive: true });
// Bezpieczeństwo: baza zagadek i pliki pomocnicze nie trafiają na publiczną stronę
fs.writeFileSync(path.join(out, "_headers"), "/panel*\n  X-Robots-Tag: noindex\n  Cache-Control: no-store\n/api/*\n  Cache-Control: no-store\n/sw.js\n  Cache-Control: no-cache\n/.well-known/*\n  Content-Type: application/json\n");

function parseCSV(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  return rows.filter((r) => r.some((x) => x.trim())).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
}
const rows = parseCSV(fs.readFileSync("zagadki.csv", "utf8"));
fs.mkdirSync(path.join(__dirname, "functions/_generated"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "functions/_generated/puzzles.js"), "export default " + JSON.stringify(rows) + ";\n");
// Bazy marketingowe (posty, rolki) – tylko dla panelu
const mk = (f) => fs.existsSync(f) ? parseCSV(fs.readFileSync(f, "utf8")) : [];
const kanaly = fs.existsSync("marketing/kanaly.json") ? JSON.parse(fs.readFileSync("marketing/kanaly.json", "utf8")) : { gry: [] };
fs.writeFileSync(path.join(__dirname, "functions/_generated/marketing.js"), "export default " + JSON.stringify({ posty: mk("marketing/posty-baza.csv"), rolki: mk("marketing/rolki-baza.csv"), kanaly }) + ";\n");
// Informacja o wdrożeniu (Cloudflare podaje commit w zmiennych środowiskowych)
fs.writeFileSync(path.join(__dirname, "functions/_generated/build.js"), "export default " + JSON.stringify({ commit: (process.env.CF_PAGES_COMMIT_SHA || "lokalnie").slice(0, 7), at: new Date().toISOString() }) + ";\n");
console.log(`Zbudowano: ${SITE.length} plików strony, ${rows.length / 4} dni zagadek`);
