import PUZZLES from "../_generated/puzzles.js";

export const warsawToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(new Date());
export const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "");
export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });

const byDate = new Map();
for (const r of PUZZLES) { if (!byDate.has(r.data)) byDate.set(r.data, []); byDate.get(r.data).push(r); }
export const DATES = [...byDate.keys()].sort();
export const START = DATES[0];
const dayDiff = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);

// Zagadka na dany dzień; gdy dnia brak w bazie, gra powtarza starsze (jak wcześniej w przeglądarce)
export function puzzleFor(d) {
  const idx = Math.max(0, dayDiff(START, d));
  return { date: d, nr: idx + 1, startDate: START, rows: byDate.get(d) || byDate.get(DATES[idx % DATES.length]) };
}
export const pastDays = (today) => DATES.filter((d) => d < today);
export const rowsFor = (d) => byDate.get(d) || [];
