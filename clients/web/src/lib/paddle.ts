"use client";

// Loads Paddle.js on demand and opens the hosted checkout overlay with the data
// returned by POST /billing/checkout. Mobile never calls this — it opens checkout
// in a browser instead.

type CheckoutData = {
  environment?: string;
  price_id?: string;
  customer_id?: string | null;
  customer_email?: string | null;
  custom_data?: Record<string, unknown>;
};

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

const PADDLE_SRC = "https://cdn.paddle.com/paddle/v2/paddle.js";

let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as unknown as { Paddle?: unknown }).Paddle) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = PADDLE_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Paddle.js"));
    document.head.appendChild(s);
  });
  return loading;
}

export async function openPaddleCheckout(
  data: CheckoutData,
  onCompleted?: () => void,
): Promise<void> {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) throw new Error("Billing not configured");
  if (!data.price_id) throw new Error("No price for this plan");

  await loadScript();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Paddle = (window as any).Paddle;
  Paddle.Environment.set(data.environment === "production" ? "production" : "sandbox");
  Paddle.Initialize({
    token,
    // Fires when the buyer finishes paying in the overlay — the caller uses this to
    // refetch subscription state so the UI reflects the new plan without a reload.
    eventCallback: (event: { name?: string }) => {
      if (event?.name === "checkout.completed") onCompleted?.();
    },
  });

  Paddle.Checkout.open({
    items: [{ priceId: data.price_id, quantity: 1 }],
    customer: data.customer_id
      ? { id: data.customer_id }
      : data.customer_email
        ? { email: data.customer_email }
        : undefined,
    customData: data.custom_data,
    settings: { displayMode: "overlay", theme: prefersDark() ? "dark" : "light" },
  });
}
