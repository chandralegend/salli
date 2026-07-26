"use client";

import { X } from "lucide-react";
import type { CardComponentProps } from "nextstepjs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TOUR_CARD_LAYOUT, type TourArrowPosition } from "./steps";

/** Caret placement on the card edge. The element is a small square rotated 45°,
 * so showing only the two borders facing away from the card turns it into a
 * triangle pointing outward. */
const ARROW_CLASSES: Record<Exclude<TourArrowPosition, "none">, string> = {
  "left-top": "-left-[7px] top-6 border-b border-l",
  "left-center": "-left-[7px] top-1/2 -translate-y-1/2 border-b border-l",
  "left-bottom": "-left-[7px] bottom-6 border-b border-l",
  "right-top": "-right-[7px] top-6 border-t border-r",
  "right-center": "-right-[7px] top-1/2 -translate-y-1/2 border-t border-r",
  "right-bottom": "-right-[7px] bottom-6 border-t border-r",
  "top-left": "-top-[7px] left-6 border-t border-l",
  "top-center": "-top-[7px] left-1/2 -translate-x-1/2 border-t border-l",
  "top-right": "-top-[7px] right-6 border-t border-l",
  "bottom-left": "-bottom-[7px] left-6 border-b border-r",
  "bottom-center": "-bottom-[7px] left-1/2 -translate-x-1/2 border-b border-r",
  "bottom-right": "-bottom-[7px] right-6 border-b border-r",
};

export function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
}: CardComponentProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  // Card position + caret placement come from our own per-step config rather
  // than the library's `side` handling — see the note on TOUR_CARD_LAYOUT.
  const layout = TOUR_CARD_LAYOUT[currentStep] ?? {};
  const { offsetX = 0, offsetY = 0, arrow = "none" } = layout;
  const offsetStyle =
    offsetX || offsetY ? { transform: `translate(${offsetX}px, ${offsetY}px)` } : undefined;

  return (
    <div
      style={offsetStyle}
      className="relative w-[340px] rounded-lg border bg-card p-5 text-card-foreground shadow-lg ring-1 ring-foreground/10"
    >
      {arrow !== "none" && (
        <div className={cn("absolute size-3.5 rotate-45 bg-card", ARROW_CLASSES[arrow])} />
      )}
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">
          Step {currentStep + 1} of {totalSteps}
        </p>
        {skipTour && (
          <button
            type="button"
            aria-label="Skip tour"
            onClick={skipTour}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {step.icon}
        <h3 className="text-[15px] font-semibold">{step.title}</h3>
      </div>
      <div className="text-[13px] text-muted-foreground leading-relaxed mt-1.5">{step.content}</div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        {!isFirst ? (
          <Button variant="ghost" size="sm" onClick={prevStep}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button size="sm" onClick={nextStep}>
          {isLast ? "Finish" : "Next"}
        </Button>
      </div>
    </div>
  );
}
