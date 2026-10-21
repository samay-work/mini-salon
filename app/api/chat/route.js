import fs from "fs";
import path from "path";
import { db } from "@/lib/db";

export async function POST(req) {
  const { messages = [] } = await req.json().catch(() => ({}));
  const { data: services } = await db.from("services").select("name,price,duration").order("id");
  // Services are injected on every request so the bot can never quote stale prices.
  const list = (services || []).map((s) => `- ${s.name}: Rs ${s.price}, ${s.duration} minutes`).join("\n");
  const prompt = fs.readFileSync(path.join(process.cwd(), "chatbot_system_prompt.txt"), "utf8").replace("{{SERVICES}}", list);
  const contents = messages.slice(-10).map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: String(m.text).slice(0, 500) }] }));
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: prompt }] }, contents, generationConfig: { temperature: 0.3, maxOutputTokens: 300 } }),
  });
  const j = await r.json();
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
  return Response.json({ reply: text || "Sorry, I'm having trouble right now. Please call the salon or use the booking form." });
}
