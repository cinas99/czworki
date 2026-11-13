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
  // Wyszukiwarka zdjęć dla panelu: artykuły z polskiej Wikipedii + pliki z Wikimedia Commons
  fn.search = async function (q) {
    const out = [];
    try {
      const u = "https://pl.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=12&prop=pageimages&piprop=thumbnail&pithumbsize=400&gsrsearch=" + encodeURIComponent(q);
      const j = await (await fetch(u)).json();
      Object.values((j.query && j.query.pages) || {}).sort((a, b) => a.index - b.index).forEach((p) => {
        if (p.thumbnail) out.push({ kind: "Wikipedia", label: p.title, value: p.title, thumb: p.thumbnail.source });
      });
    } catch {}
    try {
      const u = "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=16&prop=imageinfo&iiprop=url|mime&iiurlwidth=640&gsrsearch=" + encodeURIComponent(q + " filetype:bitmap");
      const j = await (await fetch(u)).json();
      Object.values((j.query && j.query.pages) || {}).sort((a, b) => a.index - b.index).forEach((p) => {
        const ii = p.imageinfo && p.imageinfo[0];
        if (ii && ii.thumburl && /jpeg|png|webp/.test(ii.mime || "")) out.push({ kind: "Commons", label: p.title.replace(/^File:|^Plik:/, ""), value: ii.thumburl, thumb: ii.thumburl });
      });
    } catch {}
    return out;
  };
  return fn;
})();
