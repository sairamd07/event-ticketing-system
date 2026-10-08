import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  listEvents,
  getEvent,
  getEventStats,
  registerAttendee,
  checkInRegistration,
} from "./db.js";
import {
  createTicketToken,
  verifyTicketToken,
  createOrganizerSession,
  verifyOrganizerSession,
} from "./tickets.js";
import { sendTicketEmail } from "./mailer.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);
app.use(express.json({ limit: "32kb" }));

function requireOrganizer(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!verifyOrganizerSession(token)) {
    return res.status(401).json({ error: "Organizer login required" });
  }
  next();
}

app.get("/api/events", (_req, res) => {
  res.json(listEvents());
});

app.get("/api/events/:id", (req, res) => {
  const event = getEvent(Number(req.params.id));
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json(event);
});

app.post("/api/events/:id/register", async (req, res) => {
  const eventId = Number(req.params.id);
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const studentId = String(req.body?.studentId || "").trim();

  if (!name || !email || !studentId) {
    return res.status(400).json({ error: "Name, email, and student ID are required" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address" });
  }

  const ticketId = crypto.randomUUID();
  let event;
  try {
    event = registerAttendee({ eventId, name, email, studentId, ticketId });
  } catch (err) {
    if (err.message === "EVENT_NOT_FOUND") {
      return res.status(404).json({ error: "Event not found" });
    }
    if (err.message === "AT_CAPACITY") {
      return res.status(409).json({ error: "Event is at capacity" });
    }
    if (String(err.message).includes("UNIQUE constraint failed")) {
      return res.status(409).json({ error: "This email is already registered for the event" });
    }
    console.error(err);
    return res.status(500).json({ error: "Could not complete registration" });
  }

  const token = createTicketToken(ticketId, eventId);
  let emailSent = false;
  let emailError = null;
  try {
    const result = await sendTicketEmail({ to: email, name, event, token });
    emailSent = result.sent;
    emailError = result.reason || null;
  } catch (err) {
    console.error("Email send failed:", err.message);
    emailError = err.message;
  }

  res.status(201).json({
    ok: true,
    emailSent,
    emailError,
    event: {
      id: event.id,
      title: event.title,
      venue: event.venue,
      startsAt: event.startsAt,
    },
    attendee: { name, email, studentId },
    token: emailSent ? undefined : token,
  });
});

app.post("/api/organizer/login", (req, res) => {
  const pin = String(req.body?.pin || "");
  if (!process.env.ORGANIZER_PIN || pin !== process.env.ORGANIZER_PIN) {
    return res.status(401).json({ error: "Incorrect organizer PIN" });
  }
  res.json({ token: createOrganizerSession() });
});

app.get("/api/events/:id/stats", requireOrganizer, (req, res) => {
  const stats = getEventStats(Number(req.params.id));
  if (!stats) return res.status(404).json({ error: "Event not found" });
  res.json(stats);
});

app.post("/api/check-in", requireOrganizer, (req, res) => {
  const raw = String(req.body?.token || "").trim();
  const payload = verifyTicketToken(raw);
  if (!payload) {
    return res.json({
      result: "INVALID_TICKET",
      message: "This QR is counterfeit, truncated, or not a campus ticket.",
    });
  }

  const outcome = checkInRegistration(payload.ticketId);
  if (outcome.code === "INVALID_TICKET") {
    return res.json({
      result: "INVALID_TICKET",
      message: "Signature was valid but no matching registration exists.",
    });
  }

  const person = outcome.registration;
  if (payload.eventId !== person.eventId) {
    return res.json({
      result: "INVALID_TICKET",
      message: "Ticket payload does not match this registration.",
    });
  }

  if (outcome.code === "ALREADY_USED") {
    return res.json({
      result: "ALREADY_USED",
      message: "This ticket was already scanned.",
      checkedInAt: person.checkedInAt,
      attendee: {
        name: person.name,
        studentId: person.studentId,
        eventTitle: person.eventTitle,
      },
    });
  }

  res.json({
    result: "CHECKED_IN",
    message: "Welcome — first valid scan recorded.",
    checkedInAt: person.checkedInAt,
    attendee: {
      name: person.name,
      studentId: person.studentId,
      eventTitle: person.eventTitle,
    },
  });
});

app.listen(port, () => {
  console.log(`Ticketing API on http://localhost:${port}`);
});
