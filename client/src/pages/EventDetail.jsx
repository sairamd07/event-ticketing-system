import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";

function formatWhen(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", studentId: "" });

  useEffect(() => {
    api(`/api/events/${id}`)
      .then(setEvent)
      .catch((err) => setError(err.message));
  }, [id]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!event || event.spotsLeft <= 0) return;
    setBusy(true);
    setError("");
    try {
      const result = await api(`/api/events/${id}/register`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      navigate("/register/success", { state: result });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!event && !error) return <p className="lede">Loading event…</p>;
  if (!event) return <p className="error">{error}</p>;

  const full = event.spotsLeft <= 0;

  return (
    <section className="panel">
      <p className="kicker">REGISTRATION</p>
      <h1>{event.title}</h1>
      <p className="meta">
        {formatWhen(event.startsAt)} · {event.venue}
      </p>
      <p className="lede">{event.description}</p>
      <p className={`spots ${full ? "full" : ""}`}>
        {full ? "This event has reached venue capacity." : `${event.spotsLeft} seats remaining`}
      </p>
      {error && <p className="error">{error}</p>}
      <form onSubmit={onSubmit}>
        <label>
          Full name
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label>
          Campus email
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          Student ID
          <input
            required
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
          />
        </label>
        <button className="btn" disabled={busy || full} type="submit">
          {full ? "Registration closed" : busy ? "Reserving seat…" : "Get QR ticket"}
        </button>
      </form>
    </section>
  );
}
