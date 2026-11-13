// Zdjęcia grup. Kolumna "zdjecie" w zagadki.csv: adres URL albo hasła z polskiej Wikipedii
// oddzielone "|" (np. "Rzeka|Wisła"). Bierzemy pierwsze hasło, które ma zdjęcie.
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
  return async function (spec) {
    spec = (spec || "").trim();
    if (!spec) return null;
    if (spec in cache) return cache[spec];
    let found = null;
    if (/^https?:\/\//.test(spec)) found = { src: spec, link: null, title: spec };
    else for (const t of spec.split("|").filter(Boolean)) { found = await wiki(t); if (found) break; }
    return (cache[spec] = found);
  };
})();
