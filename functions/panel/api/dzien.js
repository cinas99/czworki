// GET /panel/api/dzien?d=… → dowolny dzień, także przyszły (podgląd dla admina)
import { isDate, json, puzzleFor, warsawToday } from "../../_lib/util.js";
export async function onRequestGet({ request }) {
  const d = new URL(request.url).searchParams.get("d");
  return json({ today: warsawToday(), ...puzzleFor(isDate(d) ? d : warsawToday()) });
}
