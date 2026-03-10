import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit, incrementUsage } from "@/utils/usage";
import { AI_MODELS } from "@/lib/models";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: NextRequest) {
  // Fail fast if the API key is missing (misconfigured deploy)
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY is not set.");
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  // Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { modelId, messages } = await req.json();
  const model = AI_MODELS[modelId];

  if (!model) {
    return NextResponse.json({ error: "Invalid model." }, { status: 400 });
  }

  // Usage gate — prevents spend deficit
  const usage = await checkUsageLimit(user.id);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: usage.reason, remaining: usage.remaining },
      { status: 403 }
    );
  }

  // OpenRouter — unified gateway for all 4 models:
  //   google/gemini-2.5-flash-preview  (Gemini 2.5 Flash)
  //   deepseek/deepseek-chat-v3-5      (DeepSeek v3.1)
  //   anthropic/claude-sonnet-4-5      (Claude 4.5 Sonnet)
  //   openai/gpt-5                     (GPT-5)
  const response = await fetch(OPENROUTER_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://deepvortexai.art",
      "X-Title": "Replica Hub",
    },
    body: JSON.stringify({
      model: model.openrouterId,
      messages,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`OpenRouter [${model.openrouterId}] error:`, err);
    return NextResponse.json(
      { error: "Model request failed. Please try again." },
      { status: 502 }
    );
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";

  // Increment usage counter only on successful response
  await incrementUsage(user.id);

  return NextResponse.json({
    content,
    usage: {
      remaining: usage.remaining - 1,
      limit: usage.limit,
    },
  });
}
