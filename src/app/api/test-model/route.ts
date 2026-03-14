import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

export async function GET() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return NextResponse.json({ error: "No REPLICATE_API_TOKEN set" }, { status: 500 });

  const slugsToTest = [
    "anthropic/claude-sonnet-4-5",
    "anthropic/claude-4.5-sonnet",
  ];

  const results: Record<string, unknown> = {};

  // Test model metadata via Replicate REST API (no prediction cost)
  for (const slug of slugsToTest) {
    const res = await fetch(`https://api.replicate.com/v1/models/${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    results[slug] = { status: res.status, body };
  }

  // Also attempt a real prediction on the first slug to see the raw error/response
  let predictionResult: unknown = null;
  try {
    const output = await replicate.run(
      "anthropic/claude-sonnet-4-5" as `${string}/${string}`,
      { input: { prompt: "Say: hello", max_tokens: 10 } }
    );
    predictionResult = { success: true, output };
  } catch (err: unknown) {
    predictionResult = { success: false, error: String(err) };
  }

  return NextResponse.json({ modelLookups: results, predictionResult });
}
