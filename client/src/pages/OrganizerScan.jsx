import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { api, clearOrganizerToken, getOrganizerToken } from "../api.js";

export default function OrganizerScan() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [stats, setStats] = useState(null);
  const [manual, setManual] = useState("");
  const [result, setResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const [busy, setBusy] = useState(false);
  const scannerRef = useRef(null);
  const lastToken = useRef("");
  const lastAt = useRef(0);

  useEffect(() => {
    if (!getOrganizerToken()) {
      navigate("/organizer");
    }
  }, [navigate]);

  useEffect(() => {
    api("/api/events")
      .then((list) => {
        setEvents(list);
        if (list[0]) setEventId(String(list[0].id));
      })
      .catch((err) => setScanError(err.message));
  }, []);

  useEffect(() => {
    if (!eventId) return undefined;
    let cancelled = false;
    async function load() {
      try {
        const data = await api(`/api/events/${eventId}/stats`);
        if (!cancelled) setStats(data);
      } catch (err) {
        if (err.status === 401) {
          clearOrganizerToken();
          navigate("/organizer");
        }
      }
    }
    load();
    const timer = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [eventId, navigate]);

  const verify = useCallback(
    async (token) => {
      const cleaned = token.trim();
      if (!cleaned) return;
      const now = Date.now();
      if (cleaned === lastToken.current && now - lastAt.current < 2500) return;
      lastToken.current = cleaned;
      lastAt.current = now;
      setBusy(true);
      setScanError("");
      try {
        const data = await api("/api/check-in", {
          method: "POST",
          body: JSON.stringify({ token: cleaned }),
        });
        setResult(data);
      } catch (err) {
        if (err.status === 401) {
          clearOrganizerToken();
          navigate("/organizer");
          return;
        }
        setScanError(err.message);
      } finally {
        setBusy(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;
    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (!cameras.length) {
          setScanError("No camera found — use manual token entry.");
          return;
        }
        const rear = cameras.find((c) => /back|rear|environment/i.test(c.label));
        const id = (rear || cameras[0]).id;
        return scanner.start(
          id,
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            verify(decoded);
          }
        );
      })
      .catch(() => {
        setScanError("Camera permission denied — use manual token entry.");
      });

    return () => {
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {});
    };
  }, [verify]);

  function onManual(e) {
    e.preventDefault();
    verify(manual);
  }

  const tone = result?.result === "CHECKED_IN" ? "ok" : result?.result === "ALREADY_USED" ? "warn" : "bad";

  return (
    <section>
      <p className="kicker">LIVE CHECK-IN</p>
      <h1>Scan QR tickets</h1>
      <label>
        Event for live counts
        <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      </label>
      {stats && (
        <div className="stats">
          <div className="stat">
            <b>{stats.registered}</b>
            registered
          </div>
          <div className="stat">
            <b>{stats.checkedIn}</b>
            checked in
          </div>
          <div className="stat">
            <b>{stats.spotsLeft}</b>
            seats left
          </div>
        </div>
      )}
      <div className="panel">
        <div id="reader" />
        {scanError && <p className="error">{scanError}</p>}
        <form onSubmit={onManual}>
          <label>
            Manual token (testing fallback)
            <input value={manual} onChange={(e) => setManual(e.target.value)} />
          </label>
          <button className="btn" disabled={busy} type="submit">
            Verify token
          </button>
        </form>
      </div>
      {result && (
        <div className={`banner ${tone}`}>
          <h2>{result.result.replaceAll("_", " ")}</h2>
          <p>{result.message}</p>
          {result.attendee && (
            <p>
              {result.attendee.name} · {result.attendee.studentId}
              <br />
              {result.attendee.eventTitle}
            </p>
          )}
          {result.result === "ALREADY_USED" && result.checkedInAt && (
            <p>Original check-in: {new Date(result.checkedInAt).toLocaleString("en-IN")}</p>
          )}
        </div>
      )}
    </section>
  );
}
