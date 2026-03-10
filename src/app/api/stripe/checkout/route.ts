import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = req.headers.get("origin") ?? "https://chat.deepvortexai.art";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: user.email,
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!, // $6.99/mo recurring
        quantity: 1,
      },
    ],
    metadata: { user_id: user.id },
    success_url: `${origin}/?subscribed=true`,
    cancel_url:  `${origin}/?canceled=true`,
  });

  return NextResponse.json({ url: session.url });
}
