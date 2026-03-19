"use server";

import { createClient } from "@/lib/supabase/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { getCurrentResident } from "@/lib/auth";
import { isCommittee, isFacilityManager } from "@/lib/auth-roles";
import { notifyFacilityManagersOfRequest } from "@/lib/actions/email";
import {
  buildFacilityRequestWhatsAppMessageText,
  buildFacilityRequestWhatsAppUrl,
} from "@/lib/utils";

export type ResidentRequestStatus = "open" | "in_progress" | "closed";

export type CreateRequestWhatsAppLink = { url: string; label: string };

export async function createResidentRequest(title: string, body: string) {
  const resident = await getCurrentResident();
  if (!resident) {
    return { success: false as const, error: "Not signed in" };
  }
  if (isFacilityManager(resident.role)) {
    return { success: false as const, error: "Facility managers cannot create requests" };
  }
  if (!resident.unit_id) {
    return { success: false as const, error: "Your account is not linked to a unit" };
  }

  const t = title.trim();
  const b = body.trim();
  if (!t || !b) {
    return { success: false as const, error: "Title and message are required" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resident_requests")
    .insert({
      created_by: resident.id,
      unit_id: resident.unit_id,
      title: t,
      body: b,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false as const,
      error: error?.message ?? "Failed to create request",
    };
  }

  await notifyFacilityManagersOfRequest(data.id, t, b);

  const { data: phoneRows } = await supabase.rpc("get_facility_manager_phones");
  const digitsList = [
    ...new Set(
      Array.isArray(phoneRows)
        ? phoneRows
            .filter(
              (p): p is string =>
                typeof p === "string" && p.replace(/\D/g, "").length >= 8
            )
            .map((p) => p.replace(/\D/g, ""))
        : []
    ),
  ];

  const requestUrl = `${getAppBaseUrl()}/admin/requests/${data.id}`;
  const messageText = buildFacilityRequestWhatsAppMessageText(t, b, requestUrl);

  const whatsappLinks: CreateRequestWhatsAppLink[] =
    digitsList.length > 0
      ? digitsList.map((digits) => ({
          url: buildFacilityRequestWhatsAppUrl(messageText, digits),
          label:
            digits.length > 4
              ? `WhatsApp · …${digits.slice(-4)}`
              : "WhatsApp",
        }))
      : [
          {
            url: buildFacilityRequestWhatsAppUrl(messageText, null),
            label: "Share via WhatsApp",
          },
        ];

  return {
    success: true as const,
    id: data.id,
    whatsappLinks,
  };
}

export async function updateResidentRequestStatus(
  requestId: string,
  status: ResidentRequestStatus
) {
  const resident = await getCurrentResident();
  if (!resident) {
    return { success: false as const, error: "Not signed in" };
  }
  if (!isCommittee(resident.role) && !isFacilityManager(resident.role)) {
    return { success: false as const, error: "Not allowed" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("resident_requests")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    return { success: false as const, error: error.message };
  }

  return { success: true as const };
}
