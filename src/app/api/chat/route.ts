import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit, incrementUsage } from "@/utils/usage";
import { AI_MODELS } from "@/lib/models";

export async function POST(req: NextRequest) {
  // Auth check
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

  // Usage gate — prevent deficit
  const usage = await checkUsageLimit(user.id);
  if (!usage.allowed) {
    return NextResponse.json({ error: usage.reason }, { status: 403 });
  }

  // Call OpenRouter
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://replica-hub.com",
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
    console.error("OpenRouter error:", err);
    return NextResponse.json(
      { error: "Model request failed. Please try again." },
      { status: 502 }
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  // Increment usage only on success
  await incrementUsage(user.id);

  return NextResponse.json({ content });
}
