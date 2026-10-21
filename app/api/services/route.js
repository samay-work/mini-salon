import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  const { data, error } = await db.from("services").select("*").order("id");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
