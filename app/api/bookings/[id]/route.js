import { db, freeSlots, todayIST, isAdmin } from "@/lib/db";
const STATUSES = ["Pending", "Confirmed", "Done", "Cancelled"];

// PATCH: change status, and/or reschedule (date + time). Admin only.
export async function PATCH(req, { params }) {
  if (!isAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = +params.id, b = await req.json().catch(() => ({})), upd = {};
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) return Response.json({ error: "Invalid status" }, { status: 400 });
    upd.status = b.status;
  }
  if (b.date || b.time) {
    const { data: cur } = await db.from("bookings").select("services(duration)").eq("id", id).single();
    if (!cur) return Response.json({ error: "Not found" }, { status: 404 });
    if (!b.date || !b.time || b.date < todayIST() || !(await freeSlots(b.date, cur.services.duration, id)).includes(b.time))
      return Response.json({ error: "That slot is not available" }, { status: 409 });
    upd.date = b.date; upd.time = b.time;
  }
  if (!Object.keys(upd).length) return Response.json({ error: "Nothing to update" }, { status: 400 });
  const { data, error } = await db.from("bookings").update(upd).eq("id", id).select("*, services(name,price,duration)").single();
  if (error) return Response.json({ error: error.message }, { status: error.code === "23505" ? 409 : 500 });
  return Response.json(data);
}
