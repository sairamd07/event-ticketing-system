import nodemailer from "nodemailer";
import QRCode from "qrcode";

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function formatWhen(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function sendTicketEmail({ to, name, event, token }) {
  if (!hasSmtpConfig()) {
    return { sent: false, reason: "SMTP is not configured" };
  }

  const qrDataUrl = await QRCode.toDataURL(token, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 280,
  });
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

  const html = `
    <div style="font-family:Georgia,serif;background:#0f172a;padding:32px;color:#e2e8f0;">
      <div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:16px;overflow:hidden;">
        <div style="padding:28px 28px 8px;">
          <p style="margin:0;letter-spacing:0.16em;font-size:11px;color:#94a3b8;">CAMPUS EVENTS</p>
          <h1 style="margin:8px 0 0;font-size:26px;color:#f8fafc;">You're in, ${name.split(" ")[0]}.</h1>
          <p style="color:#cbd5e1;line-height:1.5;">Show this QR at the door. It is unique to you and will be marked used after the first scan.</p>
        </div>
        <div style="margin:16px 28px;background:#0f172a;border-radius:12px;padding:20px;text-align:center;">
          <img src="cid:ticket-qr" alt="Ticket QR code" width="220" height="220" style="display:block;margin:0 auto;" />
          <p style="margin:12px 0 0;font-size:13px;color:#fbbf24;">${event.title}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">${formatWhen(event.startsAt)} · ${event.venue}</p>
        </div>
        <p style="padding:0 28px 28px;font-size:12px;color:#64748b;">If the image does not load, ask an organizer to enter your ticket at the desk. Do not forward this email.</p>
      </div>
    </div>
  `;

  await transporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `Your ticket: ${event.title}`,
    html,
    attachments: [
      {
        filename: "ticket-qr.png",
        content: qrBuffer,
        cid: "ticket-qr",
      },
    ],
  });

  return { sent: true };
}
