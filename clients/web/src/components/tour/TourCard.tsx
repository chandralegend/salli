"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { CardComponentProps } from "nextstepjs";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();

  // Card position + caret placement come from our own per-step config rather
  // than the library's `side` handling — see the note on TOUR_CARD_LAYOUT.
  const layout = TOUR_CARD_LAYOUT[currentStep] ?? {};
  const { offsetX = 0, offsetY = 0, arrow = "none" } = layout;
  // Those offsets (and the caret that pairs with them) were measured against
  // the desktop layout, where there is room beside the target. They are skipped
  // on mobile, which uses the pinned layout below instead.
  const offsetStyle =
    !isMobile && (offsetX || offsetY)
      ? { transform: `translate(${offsetX}px, ${offsetY}px)` }
      : undefined;

  const card = (
    <div
      style={offsetStyle}
      className={cn(
        "rounded-lg border bg-card p-5 text-card-foreground shadow-lg ring-1 ring-foreground/10",
        // Mobile pins the card to the bottom of the screen. There is no room to
        // sit a 340px card beside a target on a 375px viewport — anchored, the
        // library placed step 1 at left 90 / top -90, i.e. half off-screen. The
        // spotlight still marks the target; the card just stops chasing it.
        isMobile
          ? "fixed inset-x-4 bottom-4 z-[9999] w-auto"
          : "relative w-[340px]"
      )}
    >
      {arrow !== "none" && !isMobile && (
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
            // Negative margin absorbs the padding, so the tap area grows to
            // 32px without shifting the header row it sits in.
            className="-m-2 p-2 text-muted-foreground hover:text-foreground"
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

  // The library wraps this card in an element it positions with a transform,
  // and a transformed ancestor becomes the containing block for `fixed`
  // descendants — so pinning only escapes that wrapper through a portal.
  return isMobile ? createPortal(card, document.body) : card;
}
