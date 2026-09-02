import { Coins } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { PurchasesStoreProduct } from "react-native-purchases";

import { Card } from "@/components/ui/card";
import { useBuyCreditPack, useCreditPacks, useRestorePurchases } from "@/hooks/usePurchases";
import { CREDITS_BY_PRODUCT, purchasesAvailable } from "@/lib/purchases";
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
      showToast("Payment received — your credits will appear shortly.");
    } catch (err) {
      // A user tapping Cancel in Apple's sheet lands here too, and that is not
      // an error worth shouting about.
      const cancelled =
        err && typeof err === "object" && "userCancelled" in err && err.userCancelled;
      if (!cancelled) showToast("That purchase didn't go through.");
    }
  }

  return (
    <Card className="p-4">
      <View className="mb-1 flex-row items-center gap-2">
        <Coins size={18} color={colors.mutedForeground} />
        <Text className="font-sans-semibold text-[17px] text-foreground">Top up credits</Text>
      </View>
      <Text className="mb-3 text-[15px] leading-[22px] text-muted-foreground">
        A one-off purchase, not a subscription. Purchased credits never expire and are used only
        after your monthly allowance runs out.
      </Text>

      <View className="gap-3.5">
        {packs.data.map((p) => {
          const credits = CREDITS_BY_PRODUCT[p.identifier];
          const busy = buy.isPending;
          return (
            <Pressable
              key={p.identifier}
              onPress={() => purchase(p)}
              disabled={busy}
              className="flex-row items-center justify-between rounded-card border border-foreground/10 p-3"
            >
              <View>
                <Text className="font-sans-medium text-[16px] text-foreground">
                  {credits ? credits.toLocaleString() : p.title} credits
                </Text>
                <Text className="mt-0.5 text-[14px] text-muted-foreground">
                  {credits ? `About ${Math.round(credits / 30).toLocaleString()} Sonnet conversations` : p.description}
                </Text>
              </View>
              {busy ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                /* priceString, not our own formatting — StoreKit gives it in the
                   user's currency with local tax already applied, which a
                   hard-coded "$4.99" would get wrong everywhere but the US. */
                <Text className="font-sans-semibold text-[16px] text-salli-accent">
                  {p.priceString}
                </Text>
              )}
            </Pressable>
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
        className="mt-3 items-center py-1.5"
      >
        <Text className="text-[15px] text-muted-foreground underline">
          {restore.isPending ? "Restoring…" : "Restore purchases"}
        </Text>
      </Pressable>
    </Card>
  );
}
