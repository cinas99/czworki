// GET /api/dzis?d=RRRR-MM-DD → zagadka na dziś albo na przeszły dzień (archiwum).
// Przyszłych zagadek ten adres nie zwraca nikomu.
import { warsawToday, isDate, json, puzzleFor } from "../_lib/util.js";

export async function onRequestGet({ request }) {
  const today = warsawToday();
  const asked = new URL(request.url).searchParams.get("d");
  const d = isDate(asked) && asked <= today ? asked : today;
  return json({ today, ...puzzleFor(d) });
}
