(async () => {
  const SITE = location.host || "czworki.pl";
  const LEVELS = { zielony: 0, zolty: 1, pomaranczowy: 2, czerwony: 3 };
  const MAX_MISTAKES = 4;
  const $ = (id) => document.getElementById(id);

  // Zgłaszanie błędów gry (tylko komunikat i miejsce, max 3 na wizytę)
  let errSent = 0;
  const report = (m) => {
    if (errSent++ >= 3) return;
    try { navigator.sendBeacon("api/blad", new Blob([JSON.stringify({ m: String(m).slice(0, 220) })], { type: "application/json" })); } catch {}
  };
  window.addEventListener("error", (e) => report(`${e.message} @ ${(e.filename || "").split("/").pop()}:${e.lineno}`));
  window.addEventListener("unhandledrejection", (e) => report("Promise: " + (e.reason && (e.reason.message || e.reason))));

  // ---- Data dnia w strefie Europe/Warsaw ----
  const todayStr = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(new Date());
  const dayDiff = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
  const qs = new URLSearchParams(location.search);
  const adminNow = (() => { try { return localStorage.getItem("cz-admin") === "1" || qs.has("admin"); } catch { return false; } })();
  const realToday = todayStr();
  const askedDay = /^\d{4}-\d{2}-\d{2}$/.test(qs.get("dzien") || "") ? qs.get("dzien") : null;
  // Przeszłe dni (archiwum) może otworzyć każdy, przyszłe tylko admin
  const today = askedDay && (askedDay < realToday || adminNow) ? askedDay : realToday;
  const isArchive = today !== realToday;
  const stateKey = isArchive ? "cz-arch-" + today : "cz-day";

  // ---- Baza zagadek (zagadki.csv) ----
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
  // Dane zagadki: najpierw serwer (Cloudflare: /api/dzis, przyszłe dni tylko dla admina),
  // a gdy go nie ma (np. stary hosting), plik zagadki.csv.
  let startDate, puzzleNo, dayRows;
  try {
    const api = today > realToday ? "panel/api/dzien?d=" : "api/dzis?d=";
    const r = await fetch(api + today, { cache: "no-store" });
    if (!r.ok || !(r.headers.get("content-type") || "").includes("json")) throw new Error("brak API");
    const j = await r.json();
    startDate = j.startDate; puzzleNo = j.nr; dayRows = j.rows;
  } catch (apiErr) {
    if (location.hostname.endsWith("czworki.pl")) report("API zagadki niedostępne: " + (apiErr && apiErr.message));
    try {
      const res = await fetch("zagadki.csv?d=" + today, { cache: "no-cache" });
      const rows = parseCSV(await res.text());
      const byDate = new Map();
      rows.forEach((r) => { if (!byDate.has(r.data)) byDate.set(r.data, []); byDate.get(r.data).push(r); });
      const dates = [...byDate.keys()].sort();
      startDate = dates[0];
      const dayIndex = Math.max(0, dayDiff(startDate, today));
      puzzleNo = dayIndex + 1;
      dayRows = byDate.get(today) || byDate.get(dates[dayIndex % dates.length]);
    } catch (e) {
      $("msg").textContent = "Nie udało się wczytać zagadki. Odśwież stronę.";
      report("Nie wczytano zagadki: " + (e && e.message));
      return;
    }
  }
  const groups = dayRows
    .map((r) => ({
      name: r.kategoria,
      words: [r.slowo1, r.slowo2, r.slowo3, r.slowo4].map((w) => w.toUpperCase()),
      level: LEVELS[r.kolor] ?? 0,
      img: r.zdjecie,
      credit: r.zdjecie_podpis || "",
      focus: r.zdjecie_kadr || "",
    }))
    .sort((a, b) => a.level - b.level);
  const groupOf = (w) => groups.findIndex((g) => g.words.includes(w));

  // ---- Anonimowe statystyki (licznik zdarzeń na serwerze, bez cookies i identyfikatorów) ----
  const track = (e, ms) => {
    try {
      const body = JSON.stringify(ms ? { e, ms: Math.round(ms) } : { e });
      if (navigator.sendBeacon) navigator.sendBeacon("api/zdarzenie", new Blob([body], { type: "application/json" }));
      else fetch("api/zdarzenie", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
    } catch {}
  };
  // Wizyta liczy się dopiero, gdy strona jest naprawdę na ekranie przez 2 s (bez botów i wczytywania w tle)
  const isBot = navigator.webdriver || /bot|crawl|spider|facebookexternalhit|meta-externalagent|headless|preview|lighthouse/i.test(navigator.userAgent);
  const countVisit = () => {
    try {
      if (isBot || localStorage.getItem("cz-visit") === realToday) return;
      const yesterday = new Date(Date.parse(realToday + "T00:00:00Z") - 864e5).toISOString().slice(0, 10);
      const last = localStorage.getItem("cz-visit");
      track("visit");
      if (last && last >= yesterday) track("visit_return");
      localStorage.setItem("cz-visit", realToday);
    } catch {}
  };
  let visitTimer = null;
  const armVisit = () => { clearTimeout(visitTimer); if (document.visibilityState === "visible") visitTimer = setTimeout(countVisit, 2000); };
  document.addEventListener("visibilitychange", armVisit);
  armVisit();

  // ---- Pamięć lokalna ----
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  // Reset do testów: ?reset (dzisiejsza gra) albo ?reset=all (też statystyki)
  const rq = new URLSearchParams(location.search);
  // Tryb admina: ?admin włącza (zapamiętuje w przeglądarce), ?admin=off wyłącza
  if (rq.has("admin")) {
    try { rq.get("admin") === "off" ? localStorage.removeItem("cz-admin") : localStorage.setItem("cz-admin", "1"); } catch {}
    history.replaceState(null, "", location.pathname + (rq.get("dzien") ? "?dzien=" + rq.get("dzien") : ""));
  }
  const isAdmin = (() => { try { return localStorage.getItem("cz-admin") === "1"; } catch { return false; } })();
  if (rq.has("reset")) {
    try { localStorage.removeItem("cz-day"); if (rq.get("reset") === "all") localStorage.removeItem("cz-stats"); } catch {}
    history.replaceState(null, "", location.pathname);
  }
  let state = store.get(stateKey, null);
  if (!state || state.date !== today) {
    state = { date: today, solved: [], mistakes: 0, history: [], tried: [], done: false, won: false, order: null };
  }
  let stats = store.get("cz-stats", { played: 0, wins: 0, streak: 0, max: 0, lastWin: null });

  const allWords = groups.flatMap((g) => g.words);
  // Zagadka zmieniona w ciągu dnia: kto już skończył, zachowuje wynik; kto był w trakcie, zaczyna od nowa
  if (!state.done && state.order && (state.order.length !== allWords.length || !state.order.every((w) => allWords.includes(w)))) {
    state = { date: today, solved: [], mistakes: 0, history: [], tried: [], done: false, won: false, order: null };
  }
  if (!state.order || state.done) state.order = state.order && state.order.every((w) => allWords.includes(w)) ? state.order : shuffle([...allWords]);
  if (today !== todayStr()) state.replay = true; // podgląd innego dnia nie liczy się do statystyk
  let selected = [];

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const save = () => store.set(stateKey, state);
  const remaining = () => state.order.filter((w) => !state.solved.includes(groupOf(w)));

  // Wysokość kafelków zaokrąglona do pełnych pikseli (ułamki pikseli dają w Firefoksie cienkie kreski)
  const fitTiles = () => {
    const g = $("grid"), gap = parseFloat(getComputedStyle(g).columnGap) || 8;
    const w = (g.clientWidth - 3 * gap) / 4;
    if (w > 0) { g.style.setProperty("--tile-h", Math.round(w / 1.15) + "px"); g.classList.add("px"); }
  };
  window.addEventListener("resize", fitTiles);
  requestAnimationFrame(fitTiles);
  // Zdjęcia grup wczytujemy w tle od razu po starcie gry, więc po trafieniu są już gotowe
  const preloadPhotos = () => groups.forEach((g) => {
    const clean = (t) => t.replace(/[_.…()/]/g, " ").split(/\s+/).filter((w) => w.length > 2).join(" ");
    window.czImage.forGroup(g.img, [clean(g.name), ...g.words.map((w) => w.charAt(0) + w.slice(1).toLowerCase())]).then((im) => { if (im) new Image().src = im.src; }).catch(() => {});
  });
  async function decorate(rowEl, g) {
    const clean = (t) => t.replace(/[_.…()/]/g, " ").split(/\s+/).filter((w) => w.length > 2).join(" ");
    const im = await window.czImage.forGroup(g.img, [clean(g.name), ...g.words.map((w) => w.charAt(0) + w.slice(1).toLowerCase())]);
    if (!im) return;
    const pic = new Image();
    pic.onload = () => {
      // Tło: to samo zdjęcie mocno rozmyte; na wierzchu całe zdjęcie bez przycinania
      const bg = document.createElement("div");
      bg.className = "row-bg";
      bg.style.backgroundImage = `url("${im.src}")`;
      const fg = document.createElement("div");
      fg.className = "row-fg";
      fg.style.backgroundImage = `url("${im.src}")`;
      if (g.focus) fg.style.backgroundPosition = g.focus;
      rowEl.prepend(fg);
      rowEl.prepend(bg);
      rowEl.classList.add("has-img");
      // Zdjęcie świeżo odgadniętej grupy zjeżdża od góry jak roleta (zamiast zwykłego pojawienia się)
      // (tylko gdy zdjęcie zdążyło przed końcem odsłaniania paska; później już tylko płynnie się pojawia)
      if (rowEl.dataset.at && Date.now() - rowEl.dataset.at < 900) { bg.classList.add("curtain"); fg.classList.add("curtain"); }
      requestAnimationFrame(() => { bg.classList.add("on"); fg.classList.add("on"); });
      const pexels = /images\.pexels\.com/.test(im.src);
      const text = g.credit || (im.link ? "fot. Wikipedia" : "");
      if (text) {
        const a = document.createElement(im.link || pexels ? "a" : "span");
        a.className = "credit"; a.textContent = text;
        if (a.tagName === "A") { a.href = im.link || "https://www.pexels.com"; a.target = "_blank"; a.rel = "noopener"; }
        rowEl.appendChild(a);
      }
    };
    pic.src = im.src;
  }

  // ---- Rysowanie ----
  let freshRow = false;
  function renderSolved() {
    const box = $("solved");
    state.solved.forEach((gi, i) => {
      if (box.children[i]) return;
      const g = groups[gi];
      const el = document.createElement("div");
      el.className = `row c${g.level}` + (freshRow ? " fresh" : "");
      if (freshRow) { el.dataset.at = Date.now(); freshRow = false; }
      el.innerHTML = `<div class="row-txt"><b>${g.name}</b><span>${g.words.join(", ")}</span></div>`;
      box.appendChild(el);
      decorate(el, g);
    });
  }
  let enterAnim = true;
  function renderGrid(popWord) {
    const grid = $("grid");
    grid.innerHTML = "";
    if (state.done) return;
    remaining().forEach((w, i) => {
      const b = document.createElement("button");
      b.className = "tile" + (selected.includes(w) ? " sel" : "") + (enterAnim ? " enter" : "") + (w === popWord ? " pop" : "") + (w.length > 9 ? " long" : "");
      if (enterAnim) b.style.animationDelay = i * 28 + "ms";
      b.textContent = w;
      b.onclick = () => toggle(w);
      grid.appendChild(b);
    });
  }
  let shownMistakes = null;
  function renderLives() {
    const left = MAX_MISTAKES - state.mistakes, justLost = shownMistakes !== null && state.mistakes > shownMistakes;
    $("lives").innerHTML = '<span class="hearts">' + Array.from({ length: MAX_MISTAKES }, (_, i) =>
      `<span class="h${i >= left ? " off" : ""}${justLost && i === left ? " lost" : ""}"></span>`).join("") + "</span>";
    shownMistakes = state.mistakes;
  }
  function render() {
    renderSolved(); renderGrid(); enterAnim = false; renderLives();
    if (!state.done) return;
    // Zaraz po wygranej: najpierw chwila na przeczytanie ostatniej kategorii (odsłonięcie 1,5 s + 1,5 s), potem ekran wyniku
    if (justFinished && !endTimer) { $("actions").hidden = true; $("lives").parentElement.hidden = true; endTimer = setTimeout(showEnd, 3000); }
    else if (!justFinished) showEnd();
  }
  let endTimer = null;

  function toggle(w) {
    if (busy) return;
    if (!state.startedAt) { state.startedAt = Date.now(); save(); if (!state.replay) track(isArchive ? "archive_start" : "start"); }
    $("msg").textContent = "";
    if (selected.includes(w)) selected = selected.filter((x) => x !== w);
    else if (selected.length < 4) selected.push(w);
    else return;
    renderGrid(w);
  }

  function toast(t) {
    const el = $("toast"); el.textContent = t; el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 1800);
  }

  // ---- Logika ----
  function check() {
    if (!$("hint").hidden) { $("hint").hidden = true; store.set("cz-help-at", Date.now()); }
    if (state.done || busy) return;
    if (selected.length !== 4) { $("msg").textContent = "Zaznacz 4 słowa"; return; }
    const key = [...selected].sort().join("|");
    if (state.tried.includes(key)) { toast("Ta czwórka już była"); return; }
    state.tried.push(key);
    state.history.push(selected.map(groupOf));

    const gi = groupOf(selected[0]);
    if (selected.every((w) => groupOf(w) === gi)) {
      // Trafione: zaznaczone kafelki znikają, pasek grupy odsłania się od góry (kurtyna),
      // a pozostałe kafelki płynnie podjeżdżają na nowe miejsca.
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const done = () => {
        const before = new Map([...document.querySelectorAll("#grid .tile")].map((t) => [t.textContent, t.getBoundingClientRect()]));
        state.solved.push(gi);
        selected = [];
        freshRow = true;
        if (state.solved.length === 4) finish(true);
        else if (state.solved.length === 3) setTimeout(autoLast, 0);
        save(); render(); busy = false;
        if (!reduce) document.querySelectorAll("#grid .tile").forEach((t) => {
          const a = before.get(t.textContent), b = t.getBoundingClientRect();
          const dx = Math.round(a ? a.left - b.left : 0), dy = Math.round(a ? a.top - b.top : 0);
          if (a && (dx || dy)) t.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)" });
        });
      };
      if (reduce) { done(); return; }
      busy = true;
      document.querySelectorAll("#grid .tile.sel").forEach((t) => t.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.85)" }], { duration: 350, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }));
      setTimeout(done, 350);
      return;
    } else {
      state.mistakes++;
      const best = Math.max(...[0, 1, 2, 3].map((i) => selected.filter((w) => groupOf(w) === i).length));
      $("msg").textContent = best === 3 ? "Prawie! Jedno słowo nie pasuje" : "Nie tym razem";
      $("msg").classList.remove("bump"); void $("msg").offsetWidth; $("msg").classList.add("bump");
      document.querySelectorAll(".tile.sel").forEach((t) => { t.classList.add("shake"); setTimeout(() => t.classList.remove("shake"), 400); });
      if (state.mistakes >= MAX_MISTAKES) {
        groups.forEach((g, i) => { if (!state.solved.includes(i)) state.solved.push(i); });
        finish(false);
      }
    }
    save();
    setTimeout(render, state.done ? 0 : 380);
    renderLives();
  }

  // Ostatnia grupa jest oczywista: zaznaczamy ją sami z animacją
  let busy = false;
  function autoLast() {
    if (state.done || busy) return;
    const rest = remaining();
    if (rest.length !== 4) return;
    busy = true; selected = []; renderGrid();
    rest.forEach((w, i) => setTimeout(() => {
      selected.push(w); renderGrid();
      const t = [...document.querySelectorAll(".tile")].find((x) => x.textContent === w);
      if (t) t.classList.add("auto");
    }, 220 * (i + 1)));
    setTimeout(() => $("grid").classList.add("closing"), 220 * 5 + 250);
    setTimeout(() => {
      $("grid").classList.remove("closing");
      state.history.push(rest.map(groupOf));
      state.solved.push(groupOf(rest[0]));
      selected = []; busy = false; freshRow = true;
      finish(true); save(); render();
    }, 220 * 5 + 550);
  }

  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function countUp(el, ms) {
    if (calm || !ms || el.dataset.done === String(ms)) { el.textContent = fmtTime(ms); return; }
    el.dataset.done = String(ms);
    const t0 = performance.now(), dur = 700;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = fmtTime(ms * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function celebrate(won) {
    if (!won || calm) return;
    const c = document.createElement("canvas"); c.className = "confetti";
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    c.width = W * dpr; c.height = H * dpr; document.body.appendChild(c);
    const x = c.getContext("2d"); x.scale(dpr, dpr);
    const cols = ["#F6DF94", "#141413", "#FFFFFF", "#E5484D", "#F6DF94"];
    const ps = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - 0.5) * 80, y: H * 0.35, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 13 - 4, s: 6 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: cols[(Math.random() * cols.length) | 0] }));
    const t0 = performance.now();
    const frame = (t) => {
      const age = t - t0; x.clearRect(0, 0, W, H);
      ps.forEach((p) => { p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.globalAlpha = Math.max(0, 1 - age / 2600);
        x.fillStyle = p.c; x.strokeStyle = "rgba(0,0,0,.25)"; x.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); x.strokeRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); x.restore(); });
      if (age < 2600) requestAnimationFrame(frame); else c.remove();
    };
    requestAnimationFrame(frame);
  }

  function finish(won) {
    state.done = true; state.won = won; selected = []; justFinished = true;
    state.timeMs = Date.now() - (state.startedAt || Date.now());
    if (!isArchive && !state.replay) store.set("cz-arch-" + today, { date: today, done: true, won, timeMs: state.timeMs, mistakes: state.mistakes });
    setTimeout(() => celebrate(won), 350);
    if (state.replay) { save(); return; }
    if (isArchive) { if (won) track("archive_win", state.timeMs); }
    else track(won ? "win" : "loss", won ? state.timeMs : 0);
    stats.played++;
    if (won) {
      stats.wins++;
      const yesterday = new Date(Date.parse(today + "T00:00:00Z") - 864e5).toISOString().slice(0, 10);
      stats.streak = stats.lastWin === yesterday ? stats.streak + 1 : 1;
      stats.max = Math.max(stats.max, stats.streak);
      stats.lastWin = today;
    } else {
      stats.streak = 0;
    }
    store.set("cz-stats", stats);
    save();
    if (typeof gtag === "function") gtag("event", won ? "win" : "loss", { puzzle: puzzleNo, mistakes: state.mistakes });
  }

  let justFinished = false;
  function showEnd() {
    // Ekran po grze: wynik i reklama na górze, rozwiązane grupy zwinięte poniżej (dotknięcie rozwija)
    if (!document.body.classList.contains("finished")) {
      document.body.classList.add("finished");
      $("end").querySelector(".end-card").after($("ad-slot"));
      $("solved").before($("end"));
      const lab = document.createElement("p");
      lab.className = "groups-label";
      lab.textContent = isArchive ? "Grupy z tej zagadki" : "Dzisiejsze grupy";
      $("solved").before(lab);
      $("solved").addEventListener("click", (e) => { const r = e.target.closest(".row"); if (r && !e.target.closest("a")) r.classList.toggle("open"); });
    }
    if (justFinished) { justFinished = false; setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 450); }
    $("actions").hidden = true;
    $("lives").parentElement.hidden = true;
    $("msg").textContent = "";
    $("end").hidden = false;
    const titles = ["Perfekcyjnie!", "Świetnie!", "Dobra robota!", "Uff, udało się!"];
    $("end-title").textContent = state.won ? titles[Math.min(state.mistakes, 3)] : "Tym razem się nie udało";
    $("e-mist").textContent = state.mistakes;
    $("e-streak").textContent = stats.streak;
    // Seria dni z rzędu: delikatnie, tylko gdy trwa co najmniej 2 dni
    $("e-streak").nextElementSibling.textContent = stats.streak >= 2 ? "dni z rzędu 🔥" : "seria";
    const sn = $("streak-note");
    if (sn) {
      sn.hidden = isArchive || state.replay || !state.won || stats.streak < 1;
      sn.textContent = stats.streak >= 2 ? `🔥 ${stats.streak} dni z rzędu. Wróć jutro, żeby nie przerwać serii.` : "Wróć jutro, a zaczniesz serię dni z rzędu 🔥";
    }
    countUp($("e-time"), state.timeMs);
    if (state.replay) { $("with-score").checked = false; $("with-score").closest("label").hidden = true; }
    updateWa();
    // Przycisk do poprzedniej zagadki (dzień przed tą, którą właśnie rozwiązano)
    const prev = new Date(Date.parse(today + "T00:00:00Z") - 864e5).toISOString().slice(0, 10);
    if (prev >= startDate) {
      $("btn-prev").href = "./?dzien=" + prev;
      $("btn-prev").querySelector("span").textContent = isArchive ? `Zagraj w poprzednią (#${puzzleNo - 1})` : "Zagraj we wczorajszą zagadkę";
    } else $("btn-prev").hidden = true;
    if (isArchive) document.querySelector(".next").innerHTML = '<a href="./">Zagraj w dzisiejszą zagadkę →</a>';
    else tick();
  }

  const gameUrl = () => `https://${SITE}${location.pathname.replace(/index\.html$/, "")}${isArchive ? "?dzien=" + today : ""}`;
  function fmtTime(ms) {
    const t = Math.max(0, Math.round((ms || 0) / 1000)), m = Math.floor(t / 60), sec = t % 60;
    return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
  }
  function shareText() {
    if (!$("with-score").checked) return gameUrl();
    const tag = isArchive ? ` (z archiwum)` : "";
    if (!state.won) return `Czwórki #${puzzleNo}${tag} – tym razem mnie pokonały 🙈 Spróbuj Ty!\n${gameUrl()}`;
    const m = state.mistakes || 0;
    const how = ["bez ani jednej pomyłki! 🏆", "prawie idealnie! 💪", "z dwiema pomyłkami 😅", "na ostatnim sercu! 😅"][Math.min(m, 3)];
    return `Czwórki #${puzzleNo}${tag} – ${how} ${fmtTime(state.timeMs)}\n${gameUrl()}`;
  }
  function updateWa() {
    const t = encodeURIComponent(shareText()), u = encodeURIComponent(gameUrl());
    $("sh-wa").href = "https://wa.me/?text=" + t;
    $("sh-ms").href = "fb-messenger://share/?link=" + u;
    $("sh-fb").href = "https://www.facebook.com/sharer/sharer.php?u=" + u;
    $("sh-sms").href = (/iPhone|iPad/i.test(navigator.userAgent) ? "sms:&body=" : "sms:?body=") + t;
    $("sh-x").href = "https://x.com/intent/post?text=" + t;
  }
  // ---- Przypomnienia o nowej zagadce (powiadomienia, codziennie 8:00) ----
  (() => {
    const box = $("remind"), btn = $("btn-remind"), info = $("remind-info");
    const ua = navigator.userAgent, inApp = /FBAN|FBAV|FB_IAB|Instagram|Messenger/i.test(ua), ios = /iPhone|iPad/i.test(ua);
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    const can = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && window.isSecureContext;
    const on = () => store.get("cz-push", false) && Notification.permission === "granted";
    const show = () => {
      box.hidden = false;
      if (on()) { btn.innerHTML = '<span aria-hidden="true">✅</span> <b>Przypomnienia włączone</b><small>codziennie o 8:00 · dotknij, by wyłączyć</small>'; btn.classList.add("on"); info.textContent = ""; return; }
      btn.classList.remove("on");
      btn.innerHTML = '<span aria-hidden="true">🔔</span> <b>Przypominaj mi o nowej zagadce</b><small>codziennie o 8:00 · bez konta</small>';
    };
    if (inApp) { box.hidden = false; btn.hidden = true; info.innerHTML = "🔔 Chcesz codzienne przypomnienie? Otwórz <b>czworki.pl</b> w przeglądarce (⋮ → „Otwórz w przeglądarce”)."; }
    else if (ios && !standalone) { box.hidden = false; btn.hidden = true; info.innerHTML = "🔔 Chcesz codzienne przypomnienie? Dodaj Czwórki do ekranu początkowego (Udostępnij → „Do ekranu początk.”)."; }
    else if (can) show();
    const b64 = (s) => { const p = "=".repeat((4 - (s.length % 4)) % 4), r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
    // Klucz pobieramy zawczasu, a przycisk zmienia się od razu (zapis na serwerze idzie w tle)
    let keyP = null;
    const getKey = () => (keyP = keyP || fetch("api/push/klucz").then((r) => r.json()).then((j) => j.key));
    if (can && !inApp) setTimeout(() => getKey().catch(() => { keyP = null; }), 3000);
    const busy = (t) => { btn.classList.add("busy"); btn.querySelector("b").textContent = t; };
    btn.onclick = async () => {
      if (btn.classList.contains("busy")) return;
      try {
        if (on()) {
          store.set("cz-push", false); track("push_off"); show(); info.textContent = "Przypomnienia wyłączone.";
          const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
          if (sub) { fetch("api/push/zapis", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }); sub.unsubscribe(); }
          return;
        }
        busy("Włączam przypomnienia…");
        if ((await Notification.requestPermission()) !== "granted") { btn.classList.remove("busy"); show(); info.textContent = "Bez zgody na powiadomienia przypomnienie nie zadziała. Możesz ją włączyć w ustawieniach przeglądarki."; return; }
        const [reg, key] = await Promise.all([navigator.serviceWorker.ready, getKey()]);
        const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }));
        store.set("cz-push", true); btn.classList.remove("busy"); show();
        info.textContent = "Gotowe! Jutro o 8:00 dostaniesz powiadomienie o nowej zagadce.";
        fetch("api/push/zapis", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) })
          .then((r) => { if (!r.ok) throw new Error("zapis " + r.status); track("push_on"); })
          .catch((e) => { store.set("cz-push", false); show(); info.textContent = "Nie udało się zapisać przypomnienia. Spróbuj ponownie."; report("push: " + e.message); });
      } catch (e) { btn.classList.remove("busy"); show(); info.textContent = "Nie udało się włączyć przypomnień w tej przeglądarce."; report("push: " + (e && e.message)); }
    };
  })();
  if (/[?&]src=push/.test(location.search)) track("push_open");
  // Zapasowy wyzwalacz codziennych przypomnień: pierwsza wizyta po 8:00 prosi serwer o wysyłkę
  // (serwer wysyła każdemu najwyżej raz dziennie, więc kolejne prośby nic nie robią)
  try {
    const h = +new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", hourCycle: "h23" }).format(new Date());
    if (h >= 8 && !isArchive && store.get("cz-push-kick", "") !== realToday) {
      store.set("cz-push-kick", realToday);
      setTimeout(() => navigator.sendBeacon && navigator.sendBeacon("api/push/wyslij"), 4000);
    }
  } catch {}

  const shareTrack = (k) => { track("share_" + k); if ($("with-score").checked) track("share_time"); };
  async function share() {
    const text = shareText();
    const linkOnly = !$("with-score").checked;
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try { await navigator.share(linkOnly ? { title: "Czwórki", url: text } : { text }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(text); toast("Skopiowano link"); }
    catch { prompt("Skopiuj wynik:", text); }
  }

  function tick() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((p) => [p.type, p.value]));
    const s = 86400 - (+parts.hour * 3600 + +parts.minute * 60 + +parts.second);
    const pad = (n) => String(n).padStart(2, "0");
    $("countdown").textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    if (s <= 1) setTimeout(() => location.reload(), 1500);
    clearTimeout(tick.t); tick.t = setTimeout(tick, 1000);
  }

  function showStats() {
    $("st-played").textContent = stats.played;
    $("st-win").textContent = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
    $("st-streak").textContent = stats.streak;
    $("st-max").textContent = stats.max;
    $("dlg-stats").showModal();
  }

  // ---- Start ----
  if (isArchive) {
    const d = new Date(today + "T12:00:00Z").toLocaleDateString("pl-PL", { day: "numeric", month: "long" });
    // Stały pasek w archiwum: poprzednia/następna zagadka, lista, zacznij od nowa, powrót do dzisiejszej
    const shift = (n) => new Date(Date.parse(today + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
    const prev = shift(-1), next = shift(1);
    const sub = $("subtitle");
    sub.className = "arch-nav";
    sub.innerHTML =
      `<a class="an-btn" ${prev >= startDate ? `href="./?dzien=${prev}"` : 'aria-disabled="true"'} aria-label="Poprzednia zagadka">‹</a>` +
      `<a class="an-mid" href="archiwum.html" aria-label="Lista poprzednich zagadek"><span class="arch-badge">Archiwum</span><b>#${puzzleNo}</b><span class="an-d">${new Date(today + "T12:00:00Z").toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}</span><i aria-hidden="true">▾</i></a>` +
      `<a class="an-btn" href="${next < realToday ? `./?dzien=${next}` : "./"}" aria-label="Następna zagadka">›</a>` +
      `<button class="an-btn" id="an-reset" type="button" aria-label="Zacznij od nowa" title="Zacznij od nowa">↺</button>` +
      `<a class="an-today" href="./">Dzisiejsza</a>`;
    $("an-reset").onclick = () => {
      const started = state.solved.length || state.mistakes || state.done;
      if (started && !confirm("Zacząć tę zagadkę od nowa?")) return;
      store.set(stateKey, { date: today, solved: [], mistakes: 0, history: [], tried: [], done: false, won: false, order: null, replay: true });
      location.reload();
    };
    document.body.classList.add("is-archive");
  } else {
    const y = new Date(Date.parse(realToday + "T00:00:00Z") - 864e5).toISOString().slice(0, 10);
    const live = stats.streak >= 2 && (stats.lastWin === y || stats.lastWin === realToday);
    $("subtitle").innerHTML = `Zagadka #${puzzleNo} · ułóż 4 grupy po 4 słowa` + (live ? ` <span class="streak-chip" title="Tyle dni z rzędu rozwiązujesz Czwórki">🔥 ${stats.streak}</span>` : "");
  }
  $("btn-check").onclick = check;
  $("btn-clear").onclick = () => { selected = []; $("msg").textContent = ""; renderGrid(); };
  $("btn-shuffle").onclick = () => {
    if (busy) return;
    $("grid").classList.add("shuffling");
    setTimeout(() => { $("grid").classList.remove("shuffling"); state.order = shuffle(state.order); save(); enterAnim = true; renderGrid(); enterAnim = false; }, 180);
  };
  $("btn-share").onclick = share;
  $("with-score").onchange = updateWa;
  $("btn-reset").onclick = () => {
    track("replay");
    store.set(stateKey, { date: today, solved: [], mistakes: 0, history: [], tried: [], done: false, won: false, order: null, replay: true });
    location.reload();
  };
  [["sh-wa", "wa"], ["sh-ms", "ms"], ["sh-fb", "fb"], ["sh-sms", "sms"], ["sh-x", "x"]].forEach(([id, k]) => $(id).addEventListener("click", () => shareTrack(k)));
  $("btn-share").addEventListener("click", () => shareTrack("native"));
  $("sh-copy").onclick = async () => {
    shareTrack("copy");
    try { await navigator.clipboard.writeText(shareText()); toast("Skopiowano"); } catch { prompt("Skopiuj:", shareText()); }
  };
  if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) document.body.classList.add("is-mobile");
  $("btn-help").onclick = () => $("dlg-help").showModal();
  $("foot-help").onclick = (e) => { e.preventDefault(); $("dlg-help").showModal(); };
  $("btn-stats").onclick = showStats;
  // Samouczek: przy pierwszej wizycie, potem dopiero po 30 dniach od ostatniego pokazania
  const HELP_EVERY = 30 * 864e5, seenAt = store.get("cz-help-at", 0) || (store.get("cz-seen", false) ? Date.now() : 0);
  // Zamiast okna z instrukcją od razu plansza + krótka podpowiedź nad nią (pełny samouczek pod „Jak grać?”)
  const hideHint = () => { $("hint").hidden = true; store.set("cz-help-at", Date.now()); };
  $("hint").hidden = !((!seenAt || Date.now() - seenAt > HELP_EVERY) && !state.done);
  $("hint-x").onclick = hideHint;
  $("hint-more").onclick = () => { $("dlg-help").showModal(); hideHint(); };
  if (seenAt && !store.get("cz-help-at", 0)) store.set("cz-help-at", seenAt);
  render();
  if (!state.done && state.solved.length === 3) setTimeout(autoLast, 500);
  if (!state.done) setTimeout(preloadPhotos, 1200);
})();

// ---- Motyw: jasny domyślnie, przełącznik na ciemny ----
(() => {
  const btn = document.getElementById("btn-theme");
  const apply = (t) => {
    document.documentElement.dataset.theme = t;
    btn.textContent = t === "dark" ? "☀" : "☾";
    btn.setAttribute("aria-label", t === "dark" ? "Włącz jasny motyw" : "Włącz ciemny motyw");
  };
  apply(document.documentElement.dataset.theme || "light");
  btn.onclick = () => {
    const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    apply(t);
    try { localStorage.setItem("cz-theme", t); } catch {}
  };
})();

// Instalacja jako aplikacja (PWA)
if ("serviceWorker" in navigator && location.protocol === "https:") window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
