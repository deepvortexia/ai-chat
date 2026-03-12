import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { AI_MODELS, formatMessagesAsPrompt } from "@/lib/models";

const FREE_TRIAL_LIMIT      = 8;
const SUBSCRIBER_MONTHLY_LIMIT = 450;
const RESET_INTERVAL_MS     = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

export async function POST(req: NextRequest) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  // Primary: Bearer token from client (reliable in serverless — bypasses
  // cookie-propagation issues that cause "ghost login" 401s).
  // Fallback: cookie-based server session.
  let user = null;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const svcCheck = createServiceClient();
    const { data } = await svcCheck.auth.getUser(token);
    user = data.user ?? null;
  }

  if (!user) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  }

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to start chatting.", authRequired: true },
      { status: 401 }
    );
  }

  // ── Subscription / free-trial gate ────────────────────────────────────────
  const svc = createServiceClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("is_subscribed, message_count, last_reset_at")
    .eq("id", user.id)
    .single();

  const isSubscribed = profile?.is_subscribed ?? false;
  let   messageCount = profile?.message_count ?? 0;

  if (isSubscribed) {
    // ── Monthly auto-reset for subscribers ──────────────────────────────────
    const lastReset     = profile?.last_reset_at ? new Date(profile.last_reset_at) : new Date(0);
    const msSinceReset  = Date.now() - lastReset.getTime();

    if (msSinceReset >= RESET_INTERVAL_MS) {
      await svc
        .from("profiles")
        .update({ message_count: 0, last_reset_at: new Date().toISOString() })
        .eq("id", user.id);
      messageCount = 0;
    }

    // ── Block if monthly cap reached ─────────────────────────────────────────
    if (messageCount >= SUBSCRIBER_MONTHLY_LIMIT) {
      return NextResponse.json(
        {
          error: "Monthly limit reached (450 messages). Your count resets automatically every 30 days.",
          monthlyLimit: true,
        },
        { status: 403 }
      );
    }
  } else {
    // ── Block free users who exhausted the 8-message trial ──────────────────
    if (messageCount >= FREE_TRIAL_LIMIT) {
      return NextResponse.json(
        {
          error: "Your free trial has ended. Subscribe to keep chatting.",
          paywall: true,
        },
        { status: 403 }
      );
    }
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  const { modelId, messages } = (await req.json()) as {
    modelId: string;
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const model = AI_MODELS[modelId];
  if (!model) return NextResponse.json({ error: "Invalid model." }, { status: 400 });

  const prompt       = formatMessagesAsPrompt(messages);
  const systemPrompt = `You are ${model.name}. ${model.tagline} Be helpful, concise and direct.`;

  // Build model-specific input — Anthropic models use different param names
  const replicateInput = model.inputFormat === "anthropic"
    ? { prompt, system: systemPrompt, max_tokens: 2048, temperature: 0.7 }
    : { prompt, system_prompt: systemPrompt, max_new_tokens: 2048, temperature: 0.7 };

  // ── Increment usage BEFORE streaming ─────────────────────────────────────
  // Must happen here, not inside the stream callback — if Replicate errors the
  // stream callback's catch block fires and the increment would be skipped,
  // leaving message_count at 0 and the gate permanently open.
  await svc.rpc("increment_message_count", { user_id: user.id });

  // ── Replicate streaming ───────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = replicate.stream(
          model.replicateId as `${string}/${string}`,
          { input: replicateInput }
        );

        for await (const event of await stream) {
          const text = event.toString();
          if (!text) continue;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error(`Replicate [${model.replicateId}] error:`, err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "Stream interrupted. Please try again." })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
