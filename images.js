// Zdjęcia grup. Kolumna "zdjecie" w zagadki.csv: adres URL zdjęcia (np. z Pexels) albo hasła
// z polskiej Wikipedii oddzielone "|" (np. "Rzeka|Wisła"). Kolumna "zdjecie_podpis": podpis autora.
window.czImage = (() => {
  const cache = {};
  async function wiki(title) {
    try {
      const r = await fetch("https://pl.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title.trim().replace(/ /g, "_")));
      if (!r.ok) return null;
      const j = await r.json();
      if (j.type === "disambiguation" || !j.thumbnail) return null;
      const src = j.originalimage && j.originalimage.width <= 1600 ? j.originalimage.source : j.thumbnail.source.replace(/\/\d+px-/, "/640px-");
      return { src, link: j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page, title: j.title };
    } catch { return null; }
  }
  const fn = async function (spec, fresh) {
    spec = (spec || "").trim();
    if (!spec) return null;
    if (fresh) delete cache[spec];
    if (spec in cache) return cache[spec];
    let found = null;
    if (/^https?:\/\//.test(spec)) found = { src: spec, link: null, title: spec };
    else for (const t of spec.split("|").filter(Boolean)) { found = await wiki(t); if (found) break; }
    return (cache[spec] = found);
  };
  fn.isWiki = (spec) => !!spec && !/^https?:\/\//.test(spec.trim());
  fn.source = (spec) => !spec ? "" : /images\.pexels\.com/.test(spec) ? "Pexels" : /^https?:/.test(spec) ? "własny adres" : "Wikipedia";

  // ---- Wyszukiwarka zdjęć (panel) ----
  // Pexels: profesjonalne zdjęcia, wymaga darmowego klucza API (pexels.com/api)
  fn.pexels = async function (q, key, n = 15) {
    if (!key) return { items: [], error: "brak klucza Pexels" };
    try {
      const r = await fetch(`https://api.pexels.com/v1/search?locale=pl-PL&orientation=landscape&per_page=${n}&query=` + encodeURIComponent(q), { headers: { Authorization: key } });
      if (r.status === 401 || r.status === 403) return { items: [], error: "nieprawidłowy klucz Pexels" };
      if (r.status === 429) return { items: [], error: "limit zapytań Pexels wyczerpany, spróbuj za godzinę" };
      const j = await r.json();
      return {
        items: (j.photos || []).map((p) => ({
          kind: "Pexels", label: p.alt || p.photographer, thumb: p.src.medium,
          value: p.src.original ? p.src.original.split("?")[0] + "?auto=compress&cs=tinysrgb&w=1600" : p.src.large2x || p.src.large, credit: `fot. ${p.photographer} / Pexels`,
        })),
      };
    } catch { return { items: [], error: "Pexels nie odpowiada" }; }
  };
  // Openverse: zdjęcia na licencjach CC do użytku komercyjnego, bez klucza (niski limit zapytań)
  fn.openverse = async function (q) {
    try {
      const r = await fetch("https://api.openverse.org/v1/images/?license_type=commercial&aspect_ratio=wide&page_size=12&q=" + encodeURIComponent(q));
      if (r.status === 429) return { items: [], error: "limit Openverse wyczerpany" };
      const j = await r.json();
      const lic = (x) => (x.license === "cc0" || x.license === "pdm" ? "" : `, CC ${x.license.toUpperCase()} ${x.license_version || ""}`.trim());
      return {
        items: (j.results || []).filter((x) => x.url).map((x) => ({
          kind: "Openverse", label: x.title || x.creator || "", thumb: x.thumbnail || x.url,
          value: x.url, credit: `fot. ${x.creator || "autor nieznany"}${lic(x)}`,
        })),
      };
    } catch { return { items: [], error: "Openverse nie odpowiada" }; }
  };
  fn.wikiSearch = async function (q) {
    const items = [];
    try {
      const u = "https://pl.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=9&prop=pageimages&piprop=thumbnail&pithumbsize=400&gsrsearch=" + encodeURIComponent(q);
      const j = await (await fetch(u)).json();
      Object.values((j.query && j.query.pages) || {}).sort((a, b) => a.index - b.index).forEach((p) => {
        if (p.thumbnail) items.push({ kind: "Wikipedia", label: p.title, value: p.title, thumb: p.thumbnail.source, credit: "" });
      });
    } catch {}
    return { items };
  };
  fn.search = async function (q, key) {
    const [a, b, c] = await Promise.all([fn.pexels(q, key), fn.openverse(q), fn.wikiSearch(q)]);
    return { items: [...a.items, ...b.items, ...c.items], errors: [a.error, b.error].filter(Boolean) };
  };
  return fn;
})();
