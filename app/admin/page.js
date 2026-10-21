"use client";
import { useEffect, useState, useCallback } from "react";

const fmtT = (t) => { const [h, m] = t.split(":"); return `${+h % 12 || 12}:${m} ${+h >= 12 ? "PM" : "AM"}`; };
const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

export default function Admin() {
  const [key, setKey] = useState(""); const [ok, setOk] = useState(false); const [tab, setTab] = useState("day");
  useEffect(() => { const k = sessionStorage.getItem("ak"); if (k) { setKey(k); setOk(true); } }, []);
  if (!ok) return (
    <div className="wrap" style={{ maxWidth: 420 }}>
      <h1 style={{ fontSize: "2rem" }}>Owner login</h1>
      <form className="card" style={{ marginTop: 16 }} onSubmit={(e) => { e.preventDefault(); sessionStorage.setItem("ak", key); setOk(true); }}>
        <label htmlFor="k">Admin password</label><input id="k" type="password" value={key} onChange={(e) => setKey(e.target.value)} />
        <button className="btn" style={{ width: "100%", marginTop: 16 }}>Open dashboard</button>
      </form>
    </div>
  );
  return (
    <div className="wrap">
      <div className="noprint">
        <h1 style={{ fontSize: "2rem" }}>Salon dashboard</h1>
        <div className="tabs">
          <button className={"btn " + (tab === "day" ? "" : "ghost")} onClick={() => setTab("day")}>Bookings</button>
          <button className={"btn " + (tab === "bill" ? "" : "ghost")} onClick={() => setTab("bill")}>Billing</button>
        </div>
      </div>
      {tab === "day" ? <Day k={key} onBad={() => { sessionStorage.removeItem("ak"); setOk(false); }} /> : <Billing />}
    </div>
  );
}

function Day({ k, onBad }) {
  const [date, setDate] = useState(today()); const [status, setStatus] = useState(""); const [q, setQ] = useState("");
  const [rows, setRows] = useState([]); const [msg, setMsg] = useState(""); const [rs, setRs] = useState(null);
  const H = { "Content-Type": "application/json", "x-admin-key": k };
  const load = useCallback(async () => {
    const p = new URLSearchParams(); if (date) p.set("date", date); if (status) p.set("status", status);
    const r = await fetch("/api/bookings?" + p, { headers: H });
    if (r.status === 401) return onBad();
    setRows(await r.json());
  }, [date, status]);
  useEffect(() => { load(); }, [load]);
  async function patch(id, body) {
    const r = await fetch("/api/bookings/" + id, { method: "PATCH", headers: H, body: JSON.stringify(body) });
    const d = await r.json(); setMsg(r.ok ? "" : d.error); if (r.ok) setRs(null); load();
  }
  const shown = rows.filter((b) => !q || (b.customer_name + b.phone).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="noprint">
      <div className="row">
        <div><label htmlFor="fd">Date</label><input id="fd" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label htmlFor="fs">Status</label><select id="fs" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{["Pending", "Confirmed", "Done", "Cancelled"].map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label htmlFor="fq">Search</label><input id="fq" placeholder="Name or phone" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {msg && <div className="err" role="alert">{msg}</div>}
      <div className="card" style={{ marginTop: 16 }}>
        {!shown.length && <div className="empty">No bookings for this filter.</div>}
        {shown.map((b) => (
          <div className="slot" key={b.id}>
            <time>{fmtT(b.time)}</time>
            <div>
              <b>{b.customer_name}</b> <span className={"pill " + b.status}>{b.status}</span>
              <div style={{ color: "var(--mute)" }}>{b.services.name} · ₹{b.services.price} · {b.phone}{!date && ` · ${b.date}`}</div>
              <div className="acts">
                {b.status === "Pending" && <button className="btn sm" onClick={() => patch(b.id, { status: "Confirmed" })}>Confirm</button>}
                {b.status === "Confirmed" && <button className="btn sm" onClick={() => patch(b.id, { status: "Done" })}>Mark done</button>}
                {["Pending", "Confirmed"].includes(b.status) && <>
                  <button className="btn sm ghost" onClick={() => setRs(rs === b.id ? null : b.id)}>Reschedule</button>
                  <button className="btn sm ghost" onClick={() => confirm("Cancel this booking?") && patch(b.id, { status: "Cancelled" })}>Cancel</button></>}
              </div>
              {rs === b.id && <Resched b={b} onSave={(d, t) => patch(b.id, { date: d, time: t })} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Resched({ b, onSave }) {
  const [d, setD] = useState(b.date); const [t, setT] = useState(""); const [slots, setSlots] = useState([]);
  useEffect(() => { fetch(`/api/slots?date=${d}&service_id=${b.service_id}&exclude=${b.id}`).then((r) => r.json()).then((x) => setSlots(x.slots || [])); }, [d]);
  return (
    <div className="row" style={{ marginTop: 10 }}>
      <input type="date" min={today()} value={d} onChange={(e) => setD(e.target.value)} />
      <select value={t} onChange={(e) => setT(e.target.value)}><option value="">{slots.length ? "New time" : "No free slots"}</option>{slots.map((s) => <option key={s} value={s}>{fmtT(s)}</option>)}</select>
      <button className="btn sm" disabled={!t} onClick={() => onSave(d, t)}>Save new time</button>
    </div>
  );
}

function Billing() {
  const [services, setServices] = useState([]); const [pick, setPick] = useState({}); const [cust, setCust] = useState("");
  useEffect(() => { fetch("/api/services").then((r) => r.json()).then(setServices); }, []);
  const items = services.filter((s) => pick[s.id]); const total = items.reduce((a, s) => a + s.price, 0);
  return (
    <>
      <div className="card bill noprint">
        <h2>New bill</h2>
        <label htmlFor="c">Customer name</label><input id="c" value={cust} onChange={(e) => setCust(e.target.value)} />
        <label>Services</label>
        {services.map((s) => (
          <label key={s.id} style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 400, margin: "6px 0" }}>
            <input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={!!pick[s.id]} onChange={(e) => setPick({ ...pick, [s.id]: e.target.checked })} />
            <span style={{ flex: 1 }}>{s.name}</span><b>₹{s.price}</b>
          </label>
        ))}
        <div className="price"><span>Total</span><span>₹{total}</span></div>
        <button className="btn" style={{ marginTop: 16 }} disabled={!items.length} onClick={() => window.print()}>Print or save as PDF</button>
      </div>
      <div className="inv bill">
        <h1>Glow Mini Salon</h1><p>Invoice · {new Date().toLocaleDateString("en-IN")} · Customer: {cust || "Walk-in"}</p>
        <table><thead><tr><th>Service</th><th>Price</th></tr></thead><tbody>{items.map((s) => <tr key={s.id}><td>{s.name}</td><td>₹{s.price}</td></tr>)}</tbody>
          <tfoot><tr><th>Total</th><th>₹{total}</th></tr></tfoot></table>
        <p>Thank you for visiting!</p>
      </div>
    </>
  );
}
