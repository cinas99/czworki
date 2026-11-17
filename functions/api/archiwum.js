// GET /api/archiwum → wszystkie zagadki sprzed dzisiaj (z odpowiedziami i wyjaśnieniami)
import { warsawToday, json, pastDays, rowsFor, START } from "../_lib/util.js";

export async function onRequestGet() {
  const today = warsawToday();
  return json({ today, startDate: START, days: pastDays(today).map((d) => ({ date: d, rows: rowsFor(d) })) });
}
