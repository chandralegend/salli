"use client";

import { X } from "lucide-react";
import type { CardComponentProps } from "nextstepjs";
import { Button } from "@/components/ui/button";

export function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}: CardComponentProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <div className="relative w-[340px] rounded-lg border bg-card p-5 text-card-foreground shadow-lg ring-1 ring-foreground/10">
      <span className="text-card">{arrow}</span>
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
