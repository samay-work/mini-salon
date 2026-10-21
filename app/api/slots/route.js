import { db, freeSlots, todayIST } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET(req) {
  const p = new URL(req.url).searchParams, date = p.get("date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || date < todayIST()) return Response.json({ slots: [] });
  const { data: s } = await db.from("services").select("duration").eq("id", p.get("service_id")).single();
  if (!s) return Response.json({ slots: [] });
  return Response.json({ slots: await freeSlots(date, s.duration, +p.get("exclude") || 0) });
}
