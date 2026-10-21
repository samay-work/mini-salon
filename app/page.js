"use client";
import { useEffect, useState, useRef } from "react";

const fmtT = (t) => { const [h, m] = t.split(":"); const H = +h; return `${H % 12 || 12}:${m} ${H >= 12 ? "PM" : "AM"}`; };
const fmtD = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

export default function Home() {
  const [services, setServices] = useState([]);
  const [f, setF] = useState({ customer_name: "", phone: "", service_id: "", date: today(), time: "" });
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLS] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const svc = services.find((s) => String(s.id) === String(f.service_id));

  useEffect(() => { fetch("/api/services").then((r) => r.json()).then(setServices); }, []);
  useEffect(() => {
    set("time", "");
    if (!f.service_id || !f.date) return setSlots([]);
    setLS(true);
    fetch(`/api/slots?date=${f.date}&service_id=${f.service_id}`).then((r) => r.json()).then((d) => setSlots(d.slots || [])).finally(() => setLS(false));
  }, [f.service_id, f.date]);

  function validate() {
    const e = {};
    if (f.customer_name.trim().length < 2) e.customer_name = "Enter your name";
    if (!/^\d{10}$/.test(f.phone)) e.phone = "Phone must be exactly 10 digits";
    if (!f.service_id) e.service_id = "Pick a service";
    if (!f.date || f.date < today()) e.date = "Pick today or a future date";
    if (!f.time) e.time = "Pick a time";
    return e;
  }
  async function submit(ev) {
    ev.preventDefault();
    const e = validate(); setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const r = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await r.json(); setBusy(false);
    if (r.ok) return setDone(d);
    setErrors(d.errors || { time: "Something went wrong. Try again." });
    if (r.status === 409) set("date", f.date + ""), refresh();
  }
  const refresh = () => fetch(`/api/slots?date=${f.date}&service_id=${f.service_id}`).then((r) => r.json()).then((d) => { setSlots(d.slots || []); set("time", ""); });

  return (
    <div className="wrap">
      <div className="grid">
        <section>
          <h1>Book your chair at Glow</h1>
          <p className="lead">Pick a service, choose a time that is actually free, and you are booked. Open daily, 10 AM to 8 PM.</p>
          <ul className="menu" aria-label="Service menu">
            {services.map((s) => (
              <li key={s.id} className={String(s.id) === String(f.service_id) ? "on" : ""} onClick={() => set("service_id", String(s.id))}>
                <b>{s.name}</b><small>{s.duration} min</small><span className="dots" /><b>₹{s.price}</b>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          {done ? (
            <div className="done">
              <h2>You are booked, {done.customer_name.split(" ")[0]}.</h2>
              <p className="lead" style={{ margin: "8px 0 0" }}>Your booking is confirmed for {fmtT(done.time)}, {fmtD(done.date)}.</p>
              <dl><dt>Service</dt><dd>{done.services.name}</dd><dt>Date</dt><dd>{fmtD(done.date)}</dd><dt>Time</dt><dd>{fmtT(done.time)}</dd><dt>Price</dt><dd>₹{done.services.price}</dd><dt>Phone</dt><dd>{done.phone}</dd></dl>
              <p style={{ color: "var(--mute)" }}>Need to change or cancel? Call the salon with your phone number.</p>
              <button className="btn" onClick={() => { setDone(null); setF({ ...f, time: "" }); }}>Book another</button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <h2>Your details</h2>
              <label htmlFor="n">Name</label><input id="n" value={f.customer_name} onChange={(e) => set("customer_name", e.target.value)} autoComplete="name" />
              {errors.customer_name && <div className="err">{errors.customer_name}</div>}
              <label htmlFor="p">Phone</label><input id="p" inputMode="numeric" maxLength={10} value={f.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))} autoComplete="tel" />
              {errors.phone && <div className="err">{errors.phone}</div>}
              <label htmlFor="s">Service</label>
              <select id="s" value={f.service_id} onChange={(e) => set("service_id", e.target.value)}>
                <option value="">Choose a service</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} (₹{s.price})</option>)}
              </select>
              {errors.service_id && <div className="err">{errors.service_id}</div>}
              {svc && <div className="price"><span>{svc.name}, {svc.duration} min</span><span>₹{svc.price}</span></div>}
              <label htmlFor="d">Date</label><input id="d" type="date" min={today()} value={f.date} onChange={(e) => set("date", e.target.value)} />
              {errors.date && <div className="err">{errors.date}</div>}
              <label htmlFor="t">Time</label>
              <select id="t" value={f.time} onChange={(e) => set("time", e.target.value)} disabled={!f.service_id}>
                <option value="">{!f.service_id ? "Pick a service first" : loadingSlots ? "Checking availability..." : slots.length ? "Choose a time" : "No free slots this day"}</option>
                {slots.map((t) => <option key={t} value={t}>{fmtT(t)}</option>)}
              </select>
              {errors.time && <div className="err">{errors.time}</div>}
              <button className="btn" style={{ width: "100%", marginTop: 20 }} disabled={busy}>{busy ? "Booking..." : "Confirm booking"}</button>
            </form>
          )}
        </section>
      </div>
      <Chat />
    </div>
  );
}

function Chat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ role: "bot", text: "Hi! Ask me about our services, prices or timing. Hindi, Marathi or Hinglish is fine." }]);
  const [text, setText] = useState(""); const [wait, setWait] = useState(false); const end = useRef();
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, open]);
  async function send(e) {
    e.preventDefault(); if (!text.trim() || wait) return;
    const next = [...msgs, { role: "user", text: text.trim() }]; setMsgs(next); setText(""); setWait(true);
    const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(1).map((m) => ({ role: m.role, text: m.text })) }) });
    const d = await r.json().catch(() => ({})); setWait(false);
    setMsgs([...next, { role: "bot", text: d.reply || "Sorry, something went wrong." }]);
  }
  if (!open) return <button className="btn chatbtn" onClick={() => setOpen(true)}>Ask Glow</button>;
  return (
    <div className="chat" role="dialog" aria-label="Chat assistant">
      <header>Ask Glow<button onClick={() => setOpen(false)} aria-label="Close chat">×</button></header>
      <div className="msgs">{msgs.map((m, i) => <div key={i} className={"msg " + (m.role === "user" ? "u" : "")}>{m.text}</div>)}{wait && <div className="msg">...</div>}<div ref={end} /></div>
      <form onSubmit={send}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your question" maxLength={300} /><button className="btn">Send</button></form>
    </div>
  );
}
