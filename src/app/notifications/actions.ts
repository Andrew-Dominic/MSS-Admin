'use server';

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase service configuration");
  }

  return createSupabaseClient(url, key);
}

export type NotificationType = "new_schemes" | "reminders" | "updates" | "profile" | "system";

export interface BroadcastNotificationInput {
  title: string;
  message: string;
  notificationType: NotificationType;
  targetState?: string;
  targetGender?: string;
}

export interface PromoAlert {
  id: string;
  title: string;
  badge_text: string;
  badge_text_color?: string;
  badge_bg_color?: string;
  bg_gradient_start?: string;
  bg_gradient_end?: string;
  btn_text?: string;
  btn_color?: string;
  target_route?: string;
  graphic_type?: string;
  target_gender?: string | null;
  target_state?: string | null;
  created_at: string;
}

export interface RecentBroadcast {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  recipient_count: number;
  created_at: string;
}

/**
 * Dispatches a broadcast notification to all mobile users or a segmented demographic
 */
export async function dispatchBroadcastNotification(input: BroadcastNotificationInput): Promise<{
  success: boolean;
  recipientsCount?: number;
  error?: string;
}> {
  try {
    const supabase = getAdminClient();

    // 1. Query target profiles
    let query = supabase.from("profiles").select("id");
    if (input.targetState && input.targetState !== "All India") {
      query = query.eq("state", input.targetState);
    }
    if (input.targetGender && input.targetGender !== "All") {
      query = query.eq("gender", input.targetGender);
    }

    const { data: profiles, error: profileError } = await query;
    if (profileError) {
      console.error("[dispatchBroadcastNotification] Error querying profiles:", profileError);
      return { success: false, error: profileError.message };
    }

    if (!profiles || profiles.length === 0) {
      // If no profiles registered yet, create a system log or fallback notice
      return {
        success: false,
        error: "No registered mobile users match the selected demographic filter.",
      };
    }

    // 2. Prepare notifications batch
    const notificationsToInsert = profiles.map((p) => ({
      user_id: p.id,
      title: input.title,
      message: input.message,
      notification_type: input.notificationType,
      is_read: false,
    }));

    // Insert in batches of 200
    const chunkSize = 200;
    for (let i = 0; i < notificationsToInsert.length; i += chunkSize) {
      const chunk = notificationsToInsert.slice(i, i + chunkSize);
      const { error: insertError } = await supabase.from("notifications").insert(chunk);
      if (insertError) {
        console.error("[dispatchBroadcastNotification] Error inserting batch:", insertError);
        return { success: false, error: insertError.message };
      }
    }

    revalidatePath("/notifications");
    revalidatePath("/");

    return { success: true, recipientsCount: profiles.length };
  } catch (err: any) {
    console.error("[dispatchBroadcastNotification] Unexpected error:", err);
    return { success: false, error: err.message || "Failed to dispatch notification" };
  }
}

/**
 * Fetches recent notifications dispatched by the system
 */
export async function fetchRecentBroadcasts(): Promise<{
  data: RecentBroadcast[];
  error?: string;
}> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, notification_type, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.warn("[fetchRecentBroadcasts] Error:", error.message);
      return { data: [] };
    }

    // Group by title + created_at timestamp (minute precision) to reconstruct broadcast batches
    const grouped = new Map<string, RecentBroadcast>();
    for (const row of data || []) {
      const key = `${row.title}_${row.created_at?.slice(0, 16)}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: row.id,
          title: row.title,
          message: row.message,
          notification_type: row.notification_type || "updates",
          recipient_count: 1,
          created_at: row.created_at,
        });
      } else {
        const item = grouped.get(key)!;
        item.recipient_count += 1;
      }
    }

    return { data: Array.from(grouped.values()).slice(0, 15) };
  } catch (err: any) {
    console.warn("[fetchRecentBroadcasts] Unexpected error:", err);
    return { data: [] };
  }
}

/**
 * Fetches mobile home-screen promo carousel banners
 */
export async function fetchPromoAlerts(): Promise<{
  data: PromoAlert[];
  error?: string;
}> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("promo_alerts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[fetchPromoAlerts] Error:", error.message);
      return { data: [] };
    }

    return { data: (data as PromoAlert[]) || [] };
  } catch (err: any) {
    console.warn("[fetchPromoAlerts] Unexpected error:", err);
    return { data: [] };
  }
}

/**
 * Creates a new home-screen promo carousel banner for the mobile app
 */
export async function createPromoAlert(payload: {
  title: string;
  badge_text: string;
  btn_text?: string;
  target_route?: string;
  target_state?: string;
  badge_bg_color?: string;
  badge_text_color?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAdminClient();

    const { error } = await supabase.from("promo_alerts").insert({
      title: payload.title,
      badge_text: payload.badge_text,
      badge_bg_color: payload.badge_bg_color || "#FFF7ED",
      badge_text_color: payload.badge_text_color || "#EA580C",
      bg_gradient_start: "#FFF7ED",
      bg_gradient_end: "#FFEDD5",
      btn_text: payload.btn_text || "View Details",
      btn_color: "#EA580C",
      target_route: payload.target_route || "notifications",
      target_state: payload.target_state === "All India" ? null : payload.target_state,
      graphic_type: "calendar",
    });

    if (error) {
      console.error("[createPromoAlert] Error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/notifications");
    return { success: true };
  } catch (err: any) {
    console.error("[createPromoAlert] Unexpected error:", err);
    return { success: false, error: err.message || "Failed to create promo alert" };
  }
}

/**
 * Deletes a home-screen promo carousel banner
 */
export async function deletePromoAlert(alertId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from("promo_alerts").delete().eq("id", alertId);

    if (error) {
      console.error("[deletePromoAlert] Error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/notifications");
    return { success: true };
  } catch (err: any) {
    console.error("[deletePromoAlert] Unexpected error:", err);
    return { success: false, error: err.message || "Failed to delete promo alert" };
  }
}
