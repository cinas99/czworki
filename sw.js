// Czwórki: service worker. Pozwala zainstalować grę jako aplikację i otworzyć ją bez sieci
// (wtedy z ostatnio pobranych plików). Zagadka i statystyki zawsze idą z sieci.
const CACHE = "cz-v1";
const SHELL = ["/", "/style.css", "/app.js", "/images.js", "/archiwum.html", "/jak-grac.html", "/manifest.webmanifest", "/ikony/ikona-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  if (u.pathname.startsWith("/api/") || u.pathname.startsWith("/panel") || u.pathname.startsWith("/cdn-cgi/")) return;
  // Najpierw sieć (żeby zawsze była najnowsza wersja), a bez sieci kopia z pamięci
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) => m || caches.match("/")))
  );
});
