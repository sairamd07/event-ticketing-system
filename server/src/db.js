import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, "tickets.db"));
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

function runTransaction(fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore rollback if the transaction already aborted
    }
    throw err;
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    venue TEXT NOT NULL,
    startsAt TEXT NOT NULL,
    capacity INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eventId INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    studentId TEXT NOT NULL,
    ticketId TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'REGISTERED',
    checkedInAt TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (eventId) REFERENCES events(id),
    UNIQUE (eventId, email)
  );
`);

const eventCount = db.prepare("SELECT COUNT(*) AS count FROM events").get();
if (eventCount.count === 0) {
  const insert = db.prepare(`
    INSERT INTO events (title, description, venue, startsAt, capacity)
    VALUES (@title, @description, @venue, @startsAt, @capacity)
  `);
  const seed = () => {
    insert.run({
      "@title": "Freshers Night 2026",
      "@description":
        "Welcome concert and club fair for incoming students. Bring your student ID and QR ticket to the main gate.",
      "@venue": "University Auditorium",
      "@startsAt": "2026-10-18T18:30:00",
      "@capacity": 4,
    });
    insert.run({
      "@title": "Hackathon Kickoff",
      "@description":
        "Opening ceremony, team formation, and overnight build space. Snacks provided; laptops required.",
      "@venue": "CS Block Lab 2",
      "@startsAt": "2026-10-25T09:00:00",
      "@capacity": 3,
    });
    insert.run({
      "@title": "Campus Open Mic",
      "@description":
        "Poetry, music, and standup. Limited floor seats — registration closes when the hall fills.",
      "@venue": "Student Activity Center",
      "@startsAt": "2026-11-02T17:00:00",
      "@capacity": 2,
    });
  };
  runTransaction(seed);
}

export function listEvents() {
  return db
    .prepare(
      `
      SELECT
        e.*,
        e.capacity - COUNT(r.id) AS spotsLeft
      FROM events e
      LEFT JOIN registrations r ON r.eventId = e.id
      GROUP BY e.id
      ORDER BY e.startsAt ASC
    `
    )
    .all();
}

export function getEvent(id) {
  return db
    .prepare(
      `
      SELECT
        e.*,
        e.capacity - COUNT(r.id) AS spotsLeft
      FROM events e
      LEFT JOIN registrations r ON r.eventId = e.id
      WHERE e.id = ?
      GROUP BY e.id
    `
    )
    .get(id);
}

export function getEventStats(id) {
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(id);
  if (!event) return null;
  const counts = db
    .prepare(
      `
      SELECT
        COUNT(*) AS registered,
        SUM(CASE WHEN status = 'CHECKED_IN' THEN 1 ELSE 0 END) AS checkedIn
      FROM registrations
      WHERE eventId = ?
    `
    )
    .get(id);
  return {
    event: {
      id: event.id,
      title: event.title,
      venue: event.venue,
      startsAt: event.startsAt,
      capacity: event.capacity,
    },
    registered: counts.registered,
    checkedIn: counts.checkedIn || 0,
    spotsLeft: event.capacity - counts.registered,
  };
}

export function registerAttendee({ eventId, name, email, studentId, ticketId }) {
  const insert = db.prepare(`
    INSERT INTO registrations (eventId, name, email, studentId, ticketId, status, createdAt)
    VALUES (@eventId, @name, @email, @studentId, @ticketId, 'REGISTERED', @createdAt)
  `);

  const run = () => {
    const event = db.prepare("SELECT * FROM events WHERE id = ?").get(eventId);
    if (!event) {
      const err = new Error("EVENT_NOT_FOUND");
      throw err;
    }
    const taken = db
      .prepare("SELECT COUNT(*) AS count FROM registrations WHERE eventId = ?")
      .get(eventId).count;
    if (taken >= event.capacity) {
      const err = new Error("AT_CAPACITY");
      throw err;
    }
    insert.run({
      "@eventId": eventId,
      "@name": name,
      "@email": email,
      "@studentId": studentId,
      "@ticketId": ticketId,
      "@createdAt": new Date().toISOString(),
    });
    return { ...event, spotsLeft: event.capacity - taken - 1 };
  };

  return runTransaction(run);
}

export function findRegistrationByTicketId(ticketId) {
  return db
    .prepare(
      `
      SELECT r.*, e.title AS eventTitle, e.venue, e.startsAt
      FROM registrations r
      JOIN events e ON e.id = r.eventId
      WHERE r.ticketId = ?
    `
    )
    .get(ticketId);
}

export function checkInRegistration(ticketId) {
  const checkIn = () => {
    const row = findRegistrationByTicketId(ticketId);
    if (!row) return { code: "INVALID_TICKET" };
    if (row.status === "CHECKED_IN") {
      return { code: "ALREADY_USED", registration: row };
    }
    const checkedInAt = new Date().toISOString();
    db.prepare(
      `UPDATE registrations SET status = 'CHECKED_IN', checkedInAt = ? WHERE ticketId = ?`
    ).run(checkedInAt, ticketId);
    return {
      code: "CHECKED_IN",
      registration: { ...row, status: "CHECKED_IN", checkedInAt },
    };
  };
  return runTransaction(checkIn);
}

export default db;
