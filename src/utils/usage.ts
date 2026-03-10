import { createServiceClient } from "@/lib/supabase/server";
import { MONTHLY_MESSAGE_LIMIT } from "@/lib/models";

export interface UsageStatus {
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
  isSubscribed: boolean;
  reason?: string;
}

/**
 * Check if a user is allowed to send a message.
 * Resets monthly count if last_reset_at is in a previous month.
 */
export async function checkUsageLimit(userId: string): Promise<UsageStatus> {
  const supabase = await createServiceClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_subscribed, message_count, last_reset_at, message_limit")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return {
      allowed: false,
      remaining: 0,
      used: 0,
      limit: MONTHLY_MESSAGE_LIMIT,
      isSubscribed: false,
      reason: "Profile not found.",
    };
  }

  // Reset monthly count if we've crossed into a new month
  const lastReset = new Date(profile.last_reset_at);
  const now = new Date();
  const isNewMonth =
    now.getFullYear() > lastReset.getFullYear() ||
    now.getMonth() > lastReset.getMonth();

  if (isNewMonth) {
    await supabase
      .from("profiles")
      .update({ message_count: 0, last_reset_at: now.toISOString() })
      .eq("id", userId);
    profile.message_count = 0;
  }

  if (!profile.is_subscribed) {
    return {
      allowed: false,
      remaining: 0,
      used: profile.message_count,
      limit: MONTHLY_MESSAGE_LIMIT,
      isSubscribed: false,
      reason: "An active subscription is required to send messages.",
    };
  }

  const limit = profile.message_limit ?? MONTHLY_MESSAGE_LIMIT;
  const used = profile.message_count;
  const remaining = Math.max(0, limit - used);

  if (remaining === 0) {
    return {
      allowed: false,
      remaining: 0,
      used,
      limit,
      isSubscribed: true,
      reason: `Monthly limit of ${limit} messages reached. Resets next month.`,
    };
  }

  return { allowed: true, remaining, used, limit, isSubscribed: true };
}

/**
 * Increment the user's message count after a successful message.
 */
export async function incrementUsage(userId: string): Promise<void> {
  const supabase = await createServiceClient();
  await supabase.rpc("increment_message_count", { user_id: userId });
}
