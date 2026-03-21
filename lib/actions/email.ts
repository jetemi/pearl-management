"use server";

import { createClient } from "@/lib/supabase/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { sendBulkEmails, sendEmail } from "@/lib/resend";

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
    .select("email, diesel_participates")
    .eq("is_active", true);

  const recipients = (units ?? [])
    .filter(
      (u) =>
        !!u.email &&
        u.email.includes("@") &&
        (u.diesel_participates ?? true)
    )
    .map((u) => ({ email: u.email as string }));

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
    process.env.NEXT_PUBLIC_FACILITY_BANK_DETAILS ?? "Contact treasurer";

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

export async function notifyFacilityManagersOfRequest(
  requestId: string,
  title: string,
  body: string
) {
  const supabase = await createClient();
  const { data: rpcEmails } = await supabase.rpc("get_facility_manager_emails");

  const recipients = [
    ...new Set(
      Array.isArray(rpcEmails)
        ? rpcEmails.filter(
            (e): e is string => typeof e === "string" && e.includes("@")
          )
        : []
    ),
  ];

  if (recipients.length === 0) {
    console.warn(
      "notifyFacilityManagersOfRequest: no emails for users with role facility_manager"
    );
    return { success: false, error: "No facility manager emails" };
  }

  const base = getAppBaseUrl();
  const openUrl = `${base}/admin/requests/${requestId}`;
  const excerpt =
    body.length > 400 ? `${body.slice(0, 400)}…` : body;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">${ESTATE_NAME} — New resident request</h2>
  <p style="color: #444; font-size: 15px;">A resident submitted a request that needs your attention.</p>
  <h3 style="color: #1a1a1a;">${escapeHtml(title)}</h3>
  <div style="white-space: pre-wrap; line-height: 1.6; color: #333;">${escapeHtml(excerpt)}</div>
  <p style="margin-top: 28px;">
    <a href="${openUrl}" style="display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">Open request</a>
  </p>
  <p style="margin-top: 16px; font-size: 13px; color: #666;">If the button does not work, copy this link:<br/><span style="word-break: break-all;">${escapeHtml(openUrl)}</span></p>
  <p style="margin-top: 24px; color: #666; font-size: 14px;">— ${ESTATE_NAME}</p>
</body>
</html>`;

  const subject = `[${ESTATE_NAME}] New request: ${title}`;
  const results = await Promise.all(
    recipients.map((email) => sendEmail({ to: email, subject, html }))
  );
  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    return {
      success: false,
      error: `Failed to reach ${failed.length} recipient(s)`,
    };
  }
  return { success: true, data: results };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
