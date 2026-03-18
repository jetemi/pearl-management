import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = "onboarding@resend.dev";
const FROM_NAME = process.env.NEXT_PUBLIC_ESTATE_NAME ?? "Estate Management";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — email not sent:", { to, subject });
    return { success: false, error: "Resend not configured" };
  }

  const { data, error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });

  if (error) {
    console.error("Resend error:", error);
    return { success: false, error };
  }

  return { success: true, data };
}

export async function sendBulkEmails(
  recipients: { email: string }[],
  subject: string,
  html: string
) {
  const emails = recipients
    .map((r) => r.email)
    .filter((e) => e && e.includes("@"));

  if (emails.length === 0) {
    return { success: false, error: "No valid email addresses" };
  }

  return sendEmail({ to: emails, subject, html });
}
