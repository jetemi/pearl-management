"use server";

import { createClient } from "@/lib/supabase/server";
import { sendBulkEmails } from "@/lib/resend";

const ESTATE_NAME =
  process.env.NEXT_PUBLIC_ESTATE_NAME ?? "Estate Management";

export async function sendNoticeToResidents(noticeId: string) {
  const supabase = await createClient();

  const { data: notice, error: noticeError } = await supabase
    .from("notices")
    .select("title, body")
    .eq("id", noticeId)
    .single();

  if (noticeError || !notice) {
    return { success: false, error: "Notice not found" };
  }

  const { data: units } = await supabase
    .from("units")
    .select("email")
    .eq("is_active", true);

  const recipients = (units ?? []).filter(
    (u): u is { email: string } => !!u.email && u.email.includes("@")
  );

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">${ESTATE_NAME} — Notice</h2>
  <h3 style="color: #1a1a1a;">${escapeHtml(notice.title)}</h3>
  <div style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(notice.body)}</div>
  <p style="margin-top: 24px; color: #666; font-size: 14px;">— ${ESTATE_NAME} Management</p>
</body>
</html>`;

  return sendBulkEmails(
    recipients,
    `[${ESTATE_NAME}] ${notice.title}`,
    html
  );
}

export async function sendNewCycleAnnouncement(
  cycleNumber: number,
  amountPerUnit: number,
  startDate: string
) {
  const supabase = await createClient();

  const { data: units } = await supabase
    .from("units")
    .select("email")
    .eq("is_active", true);

  const recipients = (units ?? []).filter(
    (u): u is { email: string } => !!u.email && u.email.includes("@")
  );

  const bankDetails =
    process.env.NEXT_PUBLIC_BANK_DETAILS ?? "Contact treasurer";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">${ESTATE_NAME} — New Diesel Cycle</h2>
  <p>Diesel Fund Cycle #${cycleNumber} has started.</p>
  <p><strong>Amount per unit:</strong> ₦${amountPerUnit.toLocaleString()}</p>
  <p><strong>Start date:</strong> ${startDate}</p>
  <p><strong>Please pay to:</strong> ${escapeHtml(bankDetails)}</p>
  <p style="margin-top: 24px; color: #666; font-size: 14px;">— ${ESTATE_NAME} Management</p>
</body>
</html>`;

  return sendBulkEmails(
    recipients,
    `[${ESTATE_NAME}] Diesel Fund Cycle ${cycleNumber} Started`,
    html
  );
}

export async function sendServiceChargeOverdueReminder(
  periodLabel: string,
  amountPerUnit: number,
  defaulters: { flat_number: string; owner_name: string; email: string }[]
) {
  const recipients = defaulters.filter((d) => d.email?.includes("@"));

  if (recipients.length === 0) {
    return { success: false, error: "No valid email addresses for defaulters" };
  }

  const bankDetails =
    process.env.NEXT_PUBLIC_BANK_DETAILS ?? "Contact treasurer";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">${ESTATE_NAME} — Service Charge Reminder</h2>
  <p>This is a reminder that your service charge payment for <strong>${escapeHtml(periodLabel)}</strong> is outstanding.</p>
  <p><strong>Amount due:</strong> ₦${amountPerUnit.toLocaleString()}</p>
  <p><strong>Please pay to:</strong> ${escapeHtml(bankDetails)}</p>
  <p style="margin-top: 24px; color: #666; font-size: 14px;">— ${ESTATE_NAME} Management</p>
</body>
</html>`;

  return sendBulkEmails(
    recipients.map((r) => ({ email: r.email })),
    `[${ESTATE_NAME}] Service Charge Reminder: ${periodLabel}`,
    html
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
