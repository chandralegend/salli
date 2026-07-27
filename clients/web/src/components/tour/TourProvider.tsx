"use client";

import { Suspense } from "react";
import { NextStep, NextStepProvider } from "nextstepjs";
import { setTourComplete } from "@/lib/store";
import { TourCard } from "./TourCard";
import { TourAutoStart } from "./TourAutoStart";
import { TOUR_STEPS } from "./steps";

export function TourProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextStepProvider>
      <NextStep
        steps={TOUR_STEPS}
        cardComponent={TourCard}
        onComplete={() => setTourComplete()}
        onSkip={() => setTourComplete()}
        noInViewScroll
      >
        {children}
        <Suspense fallback={null}>
          <TourAutoStart />
        </Suspense>
      </NextStep>
    </NextStepProvider>
  );
}
