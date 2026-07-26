"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useNextStep } from "nextstepjs";
import { getTourComplete } from "@/lib/store";
import { TOUR_NAME } from "./steps";

/** Auto-starts the product tour once on a fresh /dashboard visit, or on
 * demand via /dashboard?tour=1 (used by the Settings "Take a tour" button). */
export function TourAutoStart() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const { startNextStep } = useNextStep();

  useEffect(() => {
    if (pathname !== "/dashboard") return;
    const replay = params.get("tour") === "1";
    if (!replay && getTourComplete()) return;

    const t = setTimeout(() => {
      startNextStep(TOUR_NAME);
      if (replay) router.replace("/dashboard");
    }, 0);
    return () => clearTimeout(t);
  }, [pathname, params, startNextStep, router]);

  return null;
}
