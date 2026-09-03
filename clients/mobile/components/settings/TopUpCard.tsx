import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { PurchasesStoreProduct } from "react-native-purchases";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Rule, SectionLabel } from "@/components/ui/blocks";
import { useBuyCreditPack, useCreditPacks, useRestorePurchases } from "@/hooks/usePurchases";
import { CREDITS_BY_PRODUCT, CREDITS_PER_MESSAGE, purchasesAvailable } from "@/lib/purchases";
import { useThemeColors } from "@/lib/theme";
import { useToast } from "@/lib/toast";

/**
 * Buying credits on iOS.
 *
 * Everything here goes through StoreKit. Apple requires it for digital content
 * consumed in the app, and the external-checkout exemptions cover the US, the
 * EU and South Korea — not Sri Lanka. There is deliberately no link to the web
 * shop anywhere in this component: pointing users off-app to buy is the
 * anti-steering rule Apple enforces outside those regions.
 *
 * Renders nothing at all until purchasing genuinely works, which is the honest
 * state until the Paid Apps Agreement is active and the products are approved.
 * A visible-but-broken buy button is worse than no button.
 *
 * It owns its own rule and section label rather than taking a heading from the
 * caller, precisely because it can render nothing: a caller-supplied label
 * would be left stranded above an empty space on every device where purchasing
 * is unavailable.
 */
export function TopUpCard() {
  const colors = useThemeColors();
  const showToast = useToast();
  const packs = useCreditPacks();
  const buy = useBuyCreditPack();
  const restore = useRestorePurchases();

  // No SDK key, or StoreKit has nothing to sell yet.
  if (!purchasesAvailable() || !packs.data?.length) return null;

  async function purchase(product: PurchasesStoreProduct) {
    try {
      await buy.mutateAsync(product);
      // Careful wording. The grant happens server-side off RevenueCat's
      // webhook, so at this instant the money has moved and the credits have
      // not. Claiming they are already there would be a lie the balance
      // immediately contradicts.
      showToast("Payment received. Your credits will appear shortly.");
    } catch (err) {
      // A user tapping Cancel in Apple's sheet lands here too, and that is not
      // an error worth shouting about.
      const cancelled =
        err && typeof err === "object" && "userCancelled" in err && err.userCancelled;
      if (!cancelled) showToast("That purchase didn't go through.");
    }
  }

  return (
    <>
      <Rule />
      <SectionLabel>Top up</SectionLabel>
      <View className="mt-3 px-5">
        <Text className="text-[15px] leading-[21px] text-muted-foreground">
          A one-off purchase, not a subscription. These credits never expire and are spent after
          your monthly allowance.
        </Text>
      </View>

      <View className="mt-3.5 gap-[9px] px-5">
        {packs.data.map((p) => {
          const credits = CREDITS_BY_PRODUCT[p.identifier];
          const busy = buy.isPending;
          return (
            <AnimatedPressable
              key={p.identifier}
              onPress={() => purchase(p)}
              disabled={busy}
              press="sink"
              accessibilityRole="button"
              accessibilityLabel={`Buy ${credits ? credits.toLocaleString() : p.title} credits for ${p.priceString}`}
              className="flex-row items-center justify-between gap-3 rounded-card border-2 border-foreground bg-card px-3.5 py-3"
            >
              <View className="min-w-0 flex-1">
                <Text className="font-sans-bold text-[16px] text-foreground">
                  {credits ? credits.toLocaleString() : p.title} credits
                </Text>
                <Text className="mt-0.5 text-[13.5px] text-muted-foreground">
                  {credits
                    ? `About ${Math.round(credits / CREDITS_PER_MESSAGE).toLocaleString()} conversations`
                    : p.description}
                </Text>
              </View>
              {busy ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                /* priceString, not our own formatting — StoreKit gives it in the
                   user's currency with local tax already applied, which a
                   hard-coded "$4.99" would get wrong everywhere but the US. */
                <Text className="shrink-0 font-sans-extrabold text-[16px] text-foreground">
                  {p.priceString}
                </Text>
              )}
            </AnimatedPressable>
          );
        })}
      </View>

      <Pressable
        onPress={async () => {
          try {
            await restore.mutateAsync();
            showToast("Purchases restored.");
          } catch {
            showToast("Couldn't restore purchases.");
          }
        }}
        disabled={restore.isPending}
        className="mt-3.5 items-center py-1"
      >
        <Text className="font-sans-semibold text-[15px] text-salli-accent">
          {restore.isPending ? "Restoring…" : "Restore purchases"}
        </Text>
      </Pressable>
    </>
  );
}
