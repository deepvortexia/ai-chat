import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          recurring: { interval: "month" },
          product_data: {
            name: "Replica Hub — All Access",
            description:
              "Unlimited access to Gemini 2.5 Flash, DeepSeek v3.1, Claude 4.5 Sonnet & GPT-5 (500 msg/mo)",
          },
          unit_amount: 599, // $5.99 in cents
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: user.id,
    },
    success_url: `${origin}/chat/gemini-flash?subscribed=true`,
    cancel_url: `${origin}/pricing?canceled=true`,
  });

  return NextResponse.json({ url: session.url });
}
