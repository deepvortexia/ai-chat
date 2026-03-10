import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit, incrementUsage } from "@/utils/usage";
import { AI_MODELS, formatMessagesAsPrompt } from "@/lib/models";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(req: NextRequest) {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("REPLICATE_API_TOKEN is not set.");
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // ── Usage gate (subscription + 500-message cap) ───────────────────────────
  const usage = await checkUsageLimit(user.id);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: usage.reason, remaining: usage.remaining },
      { status: 403 }
    );
  }

  // ── Build Replicate input ─────────────────────────────────────────────────
  const prompt = formatMessagesAsPrompt(messages);
  const systemPrompt =
    `You are ${model.name}, an AI assistant. ${model.tagline} Be concise and helpful.`;

  // ── Streaming via Replicate SDK ───────────────────────────────────────────
  const encoder = new TextEncoder();
  let didIncrement = false;

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = replicate.stream(model.replicateId as `${string}/${string}`, {
          input: {
            prompt,
            system_prompt: systemPrompt,
            max_new_tokens: 2048,
            temperature: 0.7,
          },
        });

        for await (const event of await stream) {
          const text = event.toString();
          if (!text) continue;

          // SSE format: "data: <json>\n\n"
          const chunk = `data: ${JSON.stringify({ text })}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        }

        // Increment usage once the stream completes successfully
        if (!didIncrement) {
          didIncrement = true;
          await incrementUsage(user.id);
        }

        // Signal done — client reads this to finalize the message
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (err) {
        console.error(`Replicate stream error [${model.replicateId}]:`, err);
        const errorChunk = `data: ${JSON.stringify({ error: "Stream interrupted." })}\n\n`;
        controller.enqueue(encoder.encode(errorChunk));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disables Nginx proxy buffering on Vercel
    },
  });
}
