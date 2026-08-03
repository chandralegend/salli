import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Modal, View, useWindowDimensions } from "react-native";

import { TourCard } from "@/components/tour/TourCard";
import { TOUR_STEPS } from "@/lib/tour/steps";
import { useSalliStore } from "@/lib/store";

/**
 * Root-mounted spotlight overlay — survives every route change (unlike the
 * per-screen `TourTarget`s it highlights, which Expo Router's tab navigator
 * genuinely unmounts when you leave their screen). Navigates to each step's
 * route, then waits for that screen's target to register a rect before
 * drawing the spotlight around it. The card itself is always shown
 * regardless, so a target that never registers (e.g. the screen's data
 * hasn't loaded yet) can't get the tour stuck — it just stays a plain
 * full-screen scrim instead of a spotlight until the rect appears.
 */
export function TourOverlay() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const active = useSalliStore((s) => s.tourActive);
  const stepIndex = useSalliStore((s) => s.tourStepIndex);
  const targetRects = useSalliStore((s) => s.tourTargetRects);
  const loadTourComplete = useSalliStore((s) => s.loadTourComplete);
  const nextTourStep = useSalliStore((s) => s.nextTourStep);
  const prevTourStep = useSalliStore((s) => s.prevTourStep);
  const skipTour = useSalliStore((s) => s.skipTour);

  // Tracks the route we're actually ON (not "the route we last tried to push
  // for step N") — several consecutive steps share the same screen (e.g. the
  // first four all live on Dashboard), and re-pushing that same route on every
  // step transition was forcing an unnecessary re-navigation that raced with
  // — and sometimes cleared — the already-registered target rects, which is
  // why the early steps intermittently showed no spotlight at all.
  const lastNavigatedRoute = useRef<string | null>(null);

  useEffect(() => {
    loadTourComplete();
  }, [loadTourComplete]);

  const step = active ? TOUR_STEPS[stepIndex] : null;

  // Navigate only when the destination route actually differs from the
  // previous step's route. Step 0 is assumed to already be on its target
  // route — both entry points (Dashboard auto-start, Settings' "Take a
  // tour") navigate there themselves before calling startTour().
  useEffect(() => {
    if (!step) {
      lastNavigatedRoute.current = null;
      return;
    }
    const previousRoute = stepIndex === 0 ? step.route : TOUR_STEPS[stepIndex - 1]?.route;
    if (previousRoute !== step.route && lastNavigatedRoute.current !== step.route) {
      router.push(step.route as never);
    }
    lastNavigatedRoute.current = step.route;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, active]);

  if (!step) return null;

  const spotlight = targetRects[step.targetId];
  // Keep the card clear of the target: pin it opposite whichever half of the
  // screen the spotlight sits in (e.g. the tab-bar targets near the very
  // bottom would otherwise render right underneath — or behind — the card).
  const cardPlacement: "top" | "bottom" = spotlight && spotlight.y > height * 0.55 ? "top" : "bottom";

  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={skipTour}>
      <View style={{ flex: 1 }}>
        {spotlight ? (
          <>
            {/* Four bands boxing the spotlight rect — simpler and cheaper than an SVG mask. */}
            <View style={{ position: "absolute", left: 0, top: 0, width, height: Math.max(0, spotlight.y - 6), backgroundColor: "rgba(0,0,0,0.7)" }} />
            <View
              style={{
                position: "absolute",
                left: 0,
                top: spotlight.y + spotlight.height + 6,
                width,
                height: Math.max(0, height - (spotlight.y + spotlight.height + 6)),
                backgroundColor: "rgba(0,0,0,0.7)",
              }}
            />
            <View
              style={{
                position: "absolute",
                left: 0,
                top: Math.max(0, spotlight.y - 6),
                width: Math.max(0, spotlight.x - 6),
                height: spotlight.height + 12,
                backgroundColor: "rgba(0,0,0,0.7)",
              }}
            />
            <View
              style={{
                position: "absolute",
                left: spotlight.x + spotlight.width + 6,
                top: Math.max(0, spotlight.y - 6),
                width: Math.max(0, width - (spotlight.x + spotlight.width + 6)),
                height: spotlight.height + 12,
                backgroundColor: "rgba(0,0,0,0.7)",
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: spotlight.x - 6,
                top: spotlight.y - 6,
                width: spotlight.width + 12,
                height: spotlight.height + 12,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: "rgba(249,115,22,0.9)",
              }}
            />
          </>
        ) : (
          <View style={{ position: "absolute", left: 0, top: 0, width, height, backgroundColor: "rgba(0,0,0,0.7)" }} />
        )}

        <TourCard
          step={step}
          index={stepIndex}
          total={TOUR_STEPS.length}
          placement={cardPlacement}
          onNext={nextTourStep}
          onPrev={prevTourStep}
          onSkip={skipTour}
        />
      </View>
    </Modal>
  );
}
