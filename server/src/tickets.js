import crypto from "node:crypto";

function secret() {
  const value = process.env.TICKET_SECRET;
  if (!value) {
    throw new Error("TICKET_SECRET is not set");
  }
  return value;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payloadB64) {
  return crypto.createHmac("sha256", secret()).update(payloadB64).digest("base64url");
}

export function createTicketToken(ticketId, eventId) {
  const payloadB64 = base64url(JSON.stringify({ ticketId, eventId }));
  const sig = signPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyTicketToken(token) {
  if (typeof token !== "string" || !token.includes(".")) {
    return null;
  }
  const lastDot = token.lastIndexOf(".");
  const payloadB64 = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  if (!payloadB64 || !sig) return null;

  const expected = signPayload(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (!payload.ticketId || payload.eventId == null) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createOrganizerSession() {
  const payloadB64 = base64url(
    JSON.stringify({ role: "organizer", exp: Date.now() + 12 * 60 * 60 * 1000 })
  );
  return `${payloadB64}.${signPayload(payloadB64)}`;
}

export function verifyOrganizerSession(token) {
  if (typeof token !== "string" || !token.includes(".")) return false;
  const lastDot = token.lastIndexOf(".");
  const payloadB64 = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expected = signPayload(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    return payload.role === "organizer" && payload.exp > Date.now();
  } catch {
    return false;
  }
}
