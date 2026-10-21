import { db, freeSlots, todayIST, isAdmin } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const name = (b.customer_name || "").trim(), phone = String(b.phone || "").trim();
  const errors = {};
  if (name.length < 2) errors.customer_name = "Enter your name";
  if (!/^\d{10}$/.test(phone)) errors.phone = "Phone must be 10 digits";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || "") || b.date < todayIST()) errors.date = "Pick today or a future date";
  if (!/^\d{2}:\d{2}$/.test(b.time || "")) errors.time = "Pick a time";
  const { data: svc } = await db.from("services").select("*").eq("id", b.service_id).single();
  if (!svc) errors.service_id = "Pick a service";
  if (Object.keys(errors).length) return Response.json({ errors }, { status: 400 });

  // Re-check availability on the server: the UI list may be stale (someone else booked meanwhile)
  if (!(await freeSlots(b.date, svc.duration)).includes(b.time))
    return Response.json({ errors: { time: "That slot was just taken. Please pick another." } }, { status: 409 });

  const { data, error } = await db.from("bookings")
    .insert({ customer_name: name, phone, service_id: svc.id, date: b.date, time: b.time })
    .select("*, services(name,price,duration)").single();
  if (error) { // unique index catches the race between the check above and the insert
    const taken = error.code === "23505";
    return Response.json({ errors: { time: taken ? "That slot was just taken." : error.message } }, { status: taken ? 409 : 500 });
  }
  return Response.json(data, { status: 201 });
}

export async function GET(req) {
  if (!isAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const p = new URL(req.url).searchParams;
  let q = db.from("bookings").select("*, services(name,price,duration)").order("date").order("time");
  if (p.get("date")) q = q.eq("date", p.get("date"));
  if (p.get("status")) q = q.eq("status", p.get("status"));
  const { data, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
