import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import Purchases, { type PurchasesStoreProduct } from "react-native-purchases";

import { useSalliStore } from "@/lib/store";
import {
  CREDIT_PACK_PRODUCTS,
  configurePurchases,
  identify,
  purchasesAvailable,
} from "@/lib/purchases";

/**
 * Keeps RevenueCat pointed at the signed-in user for the life of the app.
 *
 * Mounted once, at the root. Runs on every change of `userId` rather than only
 * at launch, so switching accounts on one device re-identifies instead of
 * attributing the next purchase to whoever was signed in first.
 */
export function usePurchasesIdentity(): void {
  const userId = useSalliStore((s) => s.userId);

  useEffect(() => {
    configurePurchases();
    void identify(userId);
  }, [userId]);
}

/**
 * The credit packs, priced by the App Store.
 *
 * Prices come from StoreKit rather than from our own config, so they are
 * already in the user's currency with their local tax treatment applied.
 * Hard-coding "$4.99" would be wrong for every user outside the US.
 */
export function useCreditPacks() {
  return useQuery({
    queryKey: ["credit-packs"],
    enabled: purchasesAvailable(),
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<PurchasesStoreProduct[]> => {
      const products = await Purchases.getProducts([...CREDIT_PACK_PRODUCTS]);
      // StoreKit returns only products it can actually sell. An empty result is
      // the normal state before the Paid Apps Agreement is active or the
      // products are approved — not an error to surface.
      return products.sort((a, b) => a.price - b.price);
    },
  });
}

export function useBuyCreditPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: PurchasesStoreProduct) => {
      await Purchases.purchaseStoreProduct(product);
    },
    onSuccess: () => {
      // The balance is not updated here. Credits are granted server-side from
      // RevenueCat's webhook, which may land after this resolves, so the UI
      // refetches and tells the user it is coming rather than asserting a
      // number the server has not agreed to yet.
      qc.invalidateQueries({ queryKey: ["entitlements"] });
    },
  });
}

/**
 * Restore purchases.
 *
 * Consumables are not restorable in the StoreKit sense — once granted they are
 * spent. This exists for the case where a purchase succeeded but the webhook
 * did not land: restoring re-syncs the receipt with RevenueCat, which re-fires
 * the event and lets the server's idempotency settle it to one grant.
 */
export function useRestorePurchases() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await Purchases.restorePurchases();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entitlements"] }),
  });
}
