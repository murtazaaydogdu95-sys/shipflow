import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_FROM = process.env.EMAIL_FROM || "ShipFlow <notifications@shipflow.dev>";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    // Graceful degradation: no-op if RESEND_API_KEY not configured
    if (process.env.NODE_ENV === "development") {
      console.log(`[email] Would send to ${to}: ${subject}`);
    }
    return null;
  }

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[email] Failed to send:", error);
    return null;
  }

  return data;
}
