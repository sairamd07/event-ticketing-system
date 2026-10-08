import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

function formatWhen(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/events")
      .then(setEvents)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section>
      <p className="kicker">STUDENT PORTAL</p>
      <h1>Campus events this season</h1>
      <p className="lede">
        Register while seats last. A signed QR ticket is emailed to you and scanned at the door.
      </p>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {events.map((event) => {
          const full = event.spotsLeft <= 0;
          return (
            <article className="card" key={event.id}>
              <h2>{event.title}</h2>
              <p className="meta">
                {formatWhen(event.startsAt)}
                <br />
                {event.venue}
              </p>
              <p className={`spots ${full ? "full" : ""}`}>
                {full ? "Sold out" : `${event.spotsLeft} of ${event.capacity} seats left`}
              </p>
              <Link className="btn" to={`/events/${event.id}`}>
                {full ? "View details" : "Register"}
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
