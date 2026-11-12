(() => {
  const SITE = location.host || "czworki.pl";
  const EMOJI = ["🟨", "🟩", "🟦", "🟪"];
  const MAX_MISTAKES = 4;
  const $ = (id) => document.getElementById(id);

  // ---- Data dnia w strefie Europe/Warsaw ----
  const todayStr = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(new Date());
  const dayDiff = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);

  const today = todayStr();
  const dayIndex = Math.max(0, dayDiff(START_DATE, today));
  const puzzleNo = dayIndex + 1;
  const raw = PUZZLES[dayIndex % PUZZLES.length];
  const groups = raw.map(([name, words], i) => ({ name, words, level: i }));
  const groupOf = (w) => groups.findIndex((g) => g.words.includes(w));

  // ---- Pamięć lokalna ----
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  let state = store.get("cz-day", null);
  if (!state || state.date !== today) {
    state = { date: today, solved: [], mistakes: 0, history: [], tried: [], done: false, won: false, order: null };
  }
  let stats = store.get("cz-stats", { played: 0, wins: 0, streak: 0, max: 0, lastWin: null });

  const allWords = groups.flatMap((g) => g.words);
  if (!state.order || state.order.length !== allWords.length) state.order = shuffle([...allWords]);
  let selected = [];

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const save = () => store.set("cz-day", state);
  const remaining = () => state.order.filter((w) => !state.solved.includes(groupOf(w)));

  // ---- Rysowanie ----
  function renderSolved() {
    $("solved").innerHTML = state.solved.map((gi) => {
      const g = groups[gi];
      return `<div class="row c${g.level}"><b>${g.name}</b><span>${g.words.join(", ")}</span></div>`;
    }).join("");
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
  function renderLives() {
    $("lives").innerHTML = "<i></i>".repeat(MAX_MISTAKES - state.mistakes);
  }
  function render() { renderSolved(); renderGrid(); renderLives(); if (state.done) showEnd(); }

  function toggle(w) {
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
    if (state.done) return;
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

  function finish(won) {
    state.done = true; state.won = won; selected = [];
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
    $("msg").textContent = "";
    $("end").hidden = false;
    const titles = ["Perfekcyjnie!", "Świetnie!", "Dobra robota!", "Uff, udało się!"];
    $("end-title").textContent = state.won ? titles[Math.min(state.mistakes, 3)] : "Tym razem się nie udało";
    $("end-grid").innerHTML = state.history.map((r) => "<div>" + r.map((l) => `<i class="c${groups[l].level}"></i>`).join("") + "</div>").join("");
    tick();
  }

  function shareText() {
    const rows = state.history.map((r) => r.map((l) => EMOJI[groups[l].level]).join("")).join("\n");
    return `Czwórki #${puzzleNo}\n${rows}\n${SITE}`;
  }
  async function share() {
    const text = shareText();
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try { await navigator.share({ text }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(text); toast("Skopiowano wynik"); }
    catch { prompt("Skopiuj wynik:", text); }
  }

  function tick() {
    const now = new Date();
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(now).map((p) => [p.type, p.value]));
    let s = 86400 - (+parts.hour * 3600 + +parts.minute * 60 + +parts.second);
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
  $("btn-help").onclick = () => $("dlg-help").showModal();
  $("btn-stats").onclick = showStats;
  if (!store.get("cz-seen", false)) { $("dlg-help").showModal(); store.set("cz-seen", true); }
  render();
})();
