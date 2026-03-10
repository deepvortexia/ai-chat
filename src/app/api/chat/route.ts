import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { AI_MODELS, formatMessagesAsPrompt } from "@/lib/models";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

export async function POST(req: NextRequest) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to start chatting." }, { status: 401 });
  }

  // ── Credits gate ──────────────────────────────────────────────────────────
  const svc = await createServiceClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  if (!profile || profile.credits < 1) {
    return NextResponse.json(
      { error: "Not enough credits. Purchase more to keep chatting." },
      { status: 403 }
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  const { modelId, messages } = (await req.json()) as {
    modelId: string;
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const model = AI_MODELS[modelId];
  if (!model) {
    return NextResponse.json({ error: "Invalid model." }, { status: 400 });
  }

  const prompt = formatMessagesAsPrompt(messages);
  const systemPrompt = `You are ${model.name}. ${model.tagline} Be helpful, concise and direct.`;

  // ── Replicate streaming ───────────────────────────────────────────────────
  const encoder = new TextEncoder();
  let credited  = false;

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = replicate.stream(
          model.replicateId as `${string}/${string}`,
          { input: { prompt, system_prompt: systemPrompt, max_new_tokens: 2048, temperature: 0.7 } }
        );

        for await (const event of await stream) {
          const text = event.toString();
          if (!text) continue;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }

        // Deduct 1 credit on successful stream completion
        if (!credited) {
          credited = true;
          await svc.rpc("decrement_credits", { user_id: user.id });
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
