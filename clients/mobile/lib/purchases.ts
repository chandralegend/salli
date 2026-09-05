import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { Platform } from "react-native";

/**
 * RevenueCat, which is how iOS buys credits.
 *
 * Paddle cannot serve this: its external checkout is United States only, and
 * Apple's other carve-outs from the in-app-purchase requirement are the EU and
 * South Korea. Salli's users are in Sri Lanka, so StoreKit is the only
 * compliant route and RevenueCat sits on top of it.
 *
 * ## The one thing that must not be wrong
 *
 * `Purchases.logIn(userId)` sets RevenueCat's `app_user_id`, and that value is
 * what arrives in the webhook the backend attributes the grant to. If it is
 * anything other than the Supabase user id — an anonymous id because logIn was
 * never called, or the access token because someone grabbed the wrong field —
 * the purchase succeeds, Apple takes the money, and the credits land on a user
 * that does not exist. The failure is silent and on the wrong side: the
 * customer has paid.
 *
 * That is why the store carries `userId` separately from `token`, and why
 * `identify()` below is the only place logIn is called.
 */

// Public, and embedded in the app bundle like any client-side key — RevenueCat
// SDK keys are designed to ship in the binary. Absent until the RevenueCat
// project exists, which is why every entry point below degrades quietly rather
// than throwing.
const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";

function keyForPlatform(): string {
  return Platform.OS === "ios" ? IOS_KEY : ANDROID_KEY;
}

/** Whether purchasing can work at all. False hides every buy affordance. */
export function purchasesAvailable(): boolean {
  return Boolean(keyForPlatform());
}

let configured = false;

/**
 * Configure the SDK once per app launch. Safe to call repeatedly.
 *
 * Deliberately does not take a user id: RevenueCat starts anonymous and is
 * identified separately by `identify()`, because configure happens at mount
 * while auth resolves a moment later.
 */
export function configurePurchases(): void {
  if (configured || !purchasesAvailable()) return;
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey: keyForPlatform() });
  configured = true;
}

/**
 * Bind purchases to the signed-in user, or release them on sign-out.
 *
 * Called on every auth change rather than once, so a device that switches
 * accounts does not attribute the second user's purchase to the first.
 */
export async function identify(userId: string | null): Promise<void> {
  if (!configured) return;
  try {
    if (userId) {
      await Purchases.logIn(userId);
    } else {
      // Back to an anonymous id. Without this, a signed-out device keeps the
      // previous user's app_user_id and any purchase made from it would credit
      // the account that just left.
      await Purchases.logOut();
    }
  } catch {
    // Never fatal. A failed identify means purchases are unattributable, which
    // the UI handles by refusing to sell rather than by crashing the app.
  }
}

/** The product identifiers created in App Store Connect, cheapest first. */
export const CREDIT_PACK_PRODUCTS = [
  "lk.salli.app.credits.10k",
  "lk.salli.app.credits.25k",
  "lk.salli.app.credits.60k",
] as const;

/** How many credits each product grants. Mirrors the server's mapping.
 *
 *  Duplicated here on purpose, and only for display: the *authoritative* grant
 *  is the server's, driven by the RevenueCat webhook. If these ever disagree
 *  the user sees the wrong number briefly and the balance corrects itself,
 *  which is far better than the client being able to assert its own grant. */
/**
 * Credits one conversation costs.
 *
 * Mirrors the server's ACTION_AGENT_MESSAGE base of 10 times the pinned model's
 * x1 multiplier. Duplicated here only so a pack can be described in
 * conversations rather than in credits; if the base or the pinned model ever
 * changes, this moves with it.
 */
export const CREDITS_PER_MESSAGE = 200;

export const CREDITS_BY_PRODUCT: Record<string, number> = {
  "lk.salli.app.credits.10k": 10_000,
  "lk.salli.app.credits.25k": 25_000,
  "lk.salli.app.credits.60k": 60_000,
};
