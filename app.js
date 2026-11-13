(async () => {
  const SITE = location.host || "czworki.pl";
  const EMOJI = ["🟩", "🟨", "🟧", "🟥"];
  const LEVELS = { zielony: 0, zolty: 1, pomaranczowy: 2, czerwony: 3 };
  const MAX_MISTAKES = 4;
  const $ = (id) => document.getElementById(id);

  // ---- Data dnia w strefie Europe/Warsaw ----
  const todayStr = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(new Date());
  const dayDiff = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
  const qs = new URLSearchParams(location.search);
  const adminNow = (() => { try { return localStorage.getItem("cz-admin") === "1" || qs.has("admin"); } catch { return false; } })();
  const today = adminNow && /^\d{4}-\d{2}-\d{2}$/.test(qs.get("dzien") || "") ? qs.get("dzien") : todayStr();

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
  let rows;
  try {
    const res = await fetch("zagadki.csv?d=" + today, { cache: "no-cache" });
    rows = parseCSV(await res.text());
  } catch (e) {
    $("msg").textContent = "Nie udało się wczytać zagadki. Odśwież stronę.";
    return;
  }
  const byDate = new Map();
  rows.forEach((r) => { if (!byDate.has(r.data)) byDate.set(r.data, []); byDate.get(r.data).push(r); });
  const dates = [...byDate.keys()].sort();
  const startDate = dates[0];
  const dayIndex = Math.max(0, dayDiff(startDate, today));
  const puzzleNo = dayIndex + 1;
  const dayRows = byDate.get(today) || byDate.get(dates[dayIndex % dates.length]);
  const groups = dayRows
    .map((r) => ({
      name: r.kategoria,
      words: [r.slowo1, r.slowo2, r.slowo3, r.slowo4].map((w) => w.toUpperCase()),
      level: LEVELS[r.kolor] ?? 0,
      img: r.zdjecie,
    }))
    .sort((a, b) => a.level - b.level);
  const groupOf = (w) => groups.findIndex((g) => g.words.includes(w));

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
  let state = store.get("cz-day", null);
  if (!state || state.date !== today) {
    state = { date: today, solved: [], mistakes: 0, history: [], tried: [], done: false, won: false, order: null };
  }
  let stats = store.get("cz-stats", { played: 0, wins: 0, streak: 0, max: 0, lastWin: null });

  const allWords = groups.flatMap((g) => g.words);
  if (state.order && (state.order.length !== allWords.length || !state.order.every((w) => allWords.includes(w)))) {
    state = { date: today, solved: [], mistakes: 0, history: [], tried: [], done: false, won: false, order: null };
  }
  if (!state.order) state.order = shuffle([...allWords]);
  if (today !== todayStr()) state.replay = true; // podgląd innego dnia nie liczy się do statystyk
  let selected = [];

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const save = () => store.set("cz-day", state);
  const remaining = () => state.order.filter((w) => !state.solved.includes(groupOf(w)));

  async function decorate(rowEl, g) {
    const im = await window.czImage(g.img);
    if (!im) return;
    const pic = new Image();
    pic.onload = () => {
      const bg = document.createElement("div");
      bg.className = "row-bg";
      bg.style.backgroundImage = `url("${im.src}")`;
      rowEl.prepend(bg);
      rowEl.classList.add("has-img");
      requestAnimationFrame(() => bg.classList.add("on"));
      if (im.link) {
        const a = document.createElement("a");
        a.className = "credit"; a.href = im.link; a.target = "_blank"; a.rel = "noopener"; a.textContent = "fot. Wikipedia";
        rowEl.appendChild(a);
      }
    };
    pic.src = im.src;
  }

  // ---- Rysowanie ----
  function renderSolved() {
    const box = $("solved");
    state.solved.forEach((gi, i) => {
      if (box.children[i]) return;
      const g = groups[gi];
      const el = document.createElement("div");
      el.className = `row c${g.level}`;
      el.innerHTML = `<div class="row-txt"><b>${g.name}</b><span>${g.words.join(", ")}</span></div>`;
      box.appendChild(el);
      decorate(el, g);
    });
  }
  function renderGrid() {
    const grid = $("grid");
    grid.innerHTML = "";
    if (state.done) return;
    remaining().forEach((w) => {
      const b = document.createElement("button");
      b.className = "tile" + (selected.includes(w) ? " sel" : "");
      b.textContent = w;
      b.onclick = () => toggle(w);
      grid.appendChild(b);
    });
  }
  function renderLives() { $("lives").innerHTML = "<i></i>".repeat(MAX_MISTAKES - state.mistakes); }
  function render() { renderSolved(); renderGrid(); renderLives(); if (state.done) showEnd(); }

  function toggle(w) {
    if (busy) return;
    $("msg").textContent = "";
    if (selected.includes(w)) selected = selected.filter((x) => x !== w);
    else if (selected.length < 4) selected.push(w);
    renderGrid();
  }

  function toast(t) {
    const el = $("toast"); el.textContent = t; el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 1800);
  }

  // ---- Logika ----
  function check() {
    if (state.done || busy) return;
    if (selected.length !== 4) { $("msg").textContent = "Zaznacz 4 słowa"; return; }
    const key = [...selected].sort().join("|");
    if (state.tried.includes(key)) { toast("Ta czwórka już była"); return; }
    state.tried.push(key);
    state.history.push(selected.map(groupOf));

    const gi = groupOf(selected[0]);
    if (selected.every((w) => groupOf(w) === gi)) {
      state.solved.push(gi);
      selected = [];
      if (state.solved.length === 4) finish(true);
      else if (state.solved.length === 3) setTimeout(autoLast, 650);
    } else {
      state.mistakes++;
      const best = Math.max(...[0, 1, 2, 3].map((i) => selected.filter((w) => groupOf(w) === i).length));
      $("msg").textContent = best === 3 ? "Prawie! Jedno słowo nie pasuje" : "Nie tym razem";
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
      selected = []; busy = false;
      finish(true); save(); render();
    }, 220 * 5 + 550);
  }

  function finish(won) {
    state.done = true; state.won = won; selected = [];
    if (state.replay) { save(); return; }
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

  function showEnd() {
    $("actions").hidden = true;
    $("lives").parentElement.hidden = true;
    $("msg").textContent = "";
    $("end").hidden = false;
    const titles = ["Perfekcyjnie!", "Świetnie!", "Dobra robota!", "Uff, udało się!"];
    $("end-title").textContent = state.won ? titles[Math.min(state.mistakes, 3)] : "Tym razem się nie udało";
    $("e-mist").textContent = state.mistakes;
    $("e-streak").textContent = stats.streak;
    $("end-grid").innerHTML = state.history.map((r) => "<div>" + r.map((l) => `<i class="c${groups[l].level}"></i>`).join("") + "</div>").join("");
    updateWa();
    tick();
  }

  const gameUrl = () => `https://${SITE}${location.pathname.replace(/index\.html$/, "")}`;
  function shareText() {
    if (!$("with-score").checked) return gameUrl();
    const rows = state.history.map((r) => r.map((l) => EMOJI[groups[l].level]).join("")).join("\n");
    return `Czwórki #${puzzleNo}\n${rows}\nZagraj: ${gameUrl()}`;
  }
  function updateWa() {
    const t = encodeURIComponent(shareText()), u = encodeURIComponent(gameUrl());
    $("sh-wa").href = "https://wa.me/?text=" + t;
    $("sh-ms").href = "fb-messenger://share/?link=" + u;
    $("sh-fb").href = "https://www.facebook.com/sharer/sharer.php?u=" + u;
    $("sh-sms").href = (/iPhone|iPad/i.test(navigator.userAgent) ? "sms:&body=" : "sms:?body=") + t;
    $("sh-x").href = "https://x.com/intent/post?text=" + t;
  }
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
  $("subtitle").textContent = `Zagadka #${puzzleNo} · ułóż 4 grupy po 4 słowa`;
  $("btn-check").onclick = check;
  $("btn-clear").onclick = () => { selected = []; $("msg").textContent = ""; renderGrid(); };
  $("btn-shuffle").onclick = () => { state.order = shuffle(state.order); save(); renderGrid(); };
  $("btn-share").onclick = share;
  $("with-score").onchange = updateWa;
  $("btn-reset").hidden = !isAdmin;
  $("btn-reset").onclick = () => {
    store.set("cz-day", { date: today, solved: [], mistakes: 0, history: [], tried: [], done: false, won: false, order: null, replay: true });
    location.reload();
  };
  $("sh-copy").onclick = async () => {
    try { await navigator.clipboard.writeText(shareText()); toast("Skopiowano"); } catch { prompt("Skopiuj:", shareText()); }
  };
  if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) document.body.classList.add("is-mobile");
  $("btn-help").onclick = () => $("dlg-help").showModal();
  $("btn-stats").onclick = showStats;
  if (!store.get("cz-seen", false)) { $("dlg-help").showModal(); store.set("cz-seen", true); }
  render();
  if (!state.done && state.solved.length === 3) setTimeout(autoLast, 500);
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
