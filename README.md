# Campus Gate — Event Ticketing with QR Check-In

Requires Node.js 22+ (uses the built-in `node:sqlite` module). Students browse campus events, register until venue capacity is reached, and receive a cryptographically signed QR ticket by email. Organizers scan that ticket in a dedicated portal. The first valid scan marks **CHECKED-IN**; later scans return **ALREADY USED** with the original timestamp; forged or malformed codes return **INVALID TICKET**.

## Run locally

```bash
npm install
npm run install:all
copy server\.env.example server\.env
npm run dev
```

- Student portal: http://localhost:5173
- API: http://localhost:4000
- Organizer PIN (default in `.env.example`): `2468`

## Email (free SMTP)

Fill `SMTP_*` in `server/.env`.

- **Gmail:** enable 2FA, create a 16-character App Password, `SMTP_HOST=smtp.gmail.com`, port `587`.
- **Resend free tier:** `SMTP_HOST=smtp.resend.com`, user `resend`, password = API key.

If SMTP is missing or send fails, registration still succeeds and the success page shows the raw token so you can test check-in.

## Capacity

Open Mic is seeded with 2 seats, Hackathon with 3, Freshers Night with 4 so you can fill an event quickly during a demo.
