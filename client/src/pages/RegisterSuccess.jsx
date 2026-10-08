import { Link, useLocation } from "react-router-dom";

export default function RegisterSuccess() {
  const { state } = useLocation();

  if (!state?.ok) {
    return (
      <section>
        <h1>No registration to show</h1>
        <p className="lede">Start from the events list to claim a seat.</p>
        <Link className="btn" to="/">
          Browse events
        </Link>
      </section>
    );
  }

  return (
    <section>
      <p className="kicker">CONFIRMED</p>
      <h1>Seat reserved for {state.event.title}</h1>
      {state.emailSent ? (
        <p className="lede">
          A confirmation email with your signed QR ticket was sent to {state.attendee.email}.
          Bring it to {state.event.venue}.
        </p>
      ) : (
        <>
          <p className="lede">
            Your seat is saved, but email could not be sent
            {state.emailError ? ` (${state.emailError})` : ""}. Use this token at the
            organizer desk or paste it in the scanner for testing.
          </p>
          {state.token && <pre className="token-box">{state.token}</pre>}
        </>
      )}
      <Link className="btn" to="/">
        Back to events
      </Link>
    </section>
  );
}
