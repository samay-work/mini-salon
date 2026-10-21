import { createClient } from "@supabase/supabase-js";
export const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
export const OPEN = 10, CLOSE = 20, STEP = 30; // salon hours 10:00-20:00, 30-min grid
export const toMin = (t) => { const [h, m] = t.split(":"); return +h * 60 + +m; };
export const toTime = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const ist = () => new Date(Date.now() + 5.5 * 3600e3);
export const todayIST = () => ist().toISOString().slice(0, 10);
export const isAdmin = (req) => req.headers.get("x-admin-key") === process.env.ADMIN_KEY;

// Free start times for a date, given the service duration. Overlap-aware, skips past times today.
export async function freeSlots(date, duration, excludeId = 0) {
  const { data } = await db.from("bookings").select("id,time,services(duration)").eq("date", date).neq("status", "Cancelled");
  const busy = (data || []).filter((b) => b.id !== excludeId).map((b) => [toMin(b.time), toMin(b.time) + b.services.duration]);
  const now = ist(), nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const out = [];
  for (let s = OPEN * 60; s + duration <= CLOSE * 60; s += STEP) {
    if (date === todayIST() && s <= nowMin) continue;
    if (!busy.some(([a, b]) => s < b && s + duration > a)) out.push(toTime(s));
  }
  return out;
}
