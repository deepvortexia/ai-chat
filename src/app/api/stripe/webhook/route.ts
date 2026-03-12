import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

/**
 * Stripe webhook handler.
 *
 * Events handled:
 *  - checkout.session.completed       → activate subscription
 *  - customer.subscription.updated   → re-activate on renewal, deactivate on cancel/unpaid
 *  - customer.subscription.deleted   → deactivate subscription
 *
 * Register this URL in the Stripe dashboard:
 *   https://chat.deepvortexai.art/api/stripe/webhook
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Webhook signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  const svc = createServiceClient();

  try {
    switch (event.type) {

      // ── Payment completed → activate immediately ───────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId  = session.metadata?.user_id;

        if (!userId || !session.subscription) {
          console.warn("checkout.session.completed: missing user_id or subscription", session.id);
          break;
        }

        const { error } = await svc.rpc("activate_subscription", {
          p_user_id:            userId,
          p_stripe_customer_id: session.customer   as string,
          p_stripe_sub_id:      session.subscription as string,
        });

        if (error) console.error("activate_subscription RPC error:", error);
        else       console.log(`✓ Subscription activated for user ${userId}`);
        break;
      }

      // ── Subscription updated (renewal, status change) ──────────────────────
      case "customer.subscription.updated": {
        const sub        = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const { data: profile } = await svc
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!profile) {
          console.warn("subscription.updated: no profile found for customer", customerId);
          break;
        }

        if (sub.status === "active") {
          await svc.rpc("activate_subscription", {
            p_user_id:            profile.id,
            p_stripe_customer_id: customerId,
            p_stripe_sub_id:      sub.id,
          });
          console.log(`✓ Subscription renewed for customer ${customerId}`);
        } else if (sub.status === "canceled" || sub.status === "unpaid") {
          await svc.rpc("deactivate_subscription", { p_user_id: profile.id });
          console.log(`✓ Subscription deactivated (${sub.status}) for customer ${customerId}`);
        }
        break;
      }

      // ── Subscription canceled / deleted ────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub        = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const { data: profile } = await svc
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!profile) {
          console.warn("subscription.deleted: no profile found for customer", customerId);
          break;
        }

        await svc.rpc("deactivate_subscription", { p_user_id: profile.id });
        console.log(`✓ Subscription deleted for customer ${customerId}`);
        break;
      }

      default:
        // Ignore unhandled event types
        break;
    }
  } catch (err) {
    console.error(`Error processing webhook event "${event.type}":`, err);
    // Return 200 so Stripe does not keep retrying for processing errors
    return NextResponse.json({ received: true, warning: "Internal processing error" });
  }

  return NextResponse.json({ received: true });
}
