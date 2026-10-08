import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setOrganizerToken } from "../api.js";

export default function OrganizerLogin() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api("/api/organizer/login", {
        method: "POST",
        body: JSON.stringify({ pin }),
      });
      setOrganizerToken(data.token);
      navigate("/organizer/scan");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <p className="kicker">ORGANIZER</p>
      <h1>Door staff login</h1>
      <p className="lede">Enter the shared PIN to open the live QR check-in scanner.</p>
      {error && <p className="error">{error}</p>}
      <form onSubmit={onSubmit}>
        <label>
          PIN
          <input
            required
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </label>
        <button className="btn" disabled={busy} type="submit">
          {busy ? "Checking…" : "Open scanner"}
        </button>
      </form>
    </section>
  );
}
