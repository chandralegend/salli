import { type ReactNode, useEffect, useRef } from "react";
import { View } from "react-native";

import { useSalliStore } from "@/lib/store";

/**
 * Wraps a tour-anchor element and registers its measured screen rect (in
 * window coordinates, since the spotlight overlay renders in a separate
 * `Modal` that portals outside this tree) into the tour store, keyed by id.
 * Re-measures on every layout, AND whenever the tour opens or advances a step.
 * The layout pass alone is not enough: it fires once, while the screen may
 * still be mid-transition (the overlay navigates to a step's route before
 * showing it), and the rect it captured then is never refreshed — the store
 * even documents that it keeps stale rects deliberately. The symptom is a
 * spotlight landing on whatever happens to sit where the target used to be.
 * `className` passes through so wrapping a flex child (e.g. `flex-1` in a
 * stat-tile row) doesn't break the surrounding layout.
 */
export function TourTarget({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const ref = useRef<View>(null);
  const registerTourTarget = useSalliStore((s) => s.registerTourTarget);
  const unregisterTourTarget = useSalliStore((s) => s.unregisterTourTarget);
  const tourActive = useSalliStore((s) => s.tourActive);
  const tourStepIndex = useSalliStore((s) => s.tourStepIndex);

  const measure = () => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) registerTourTarget(id, { x, y, width, height });
    });
  };

  useEffect(() => {
    return () => unregisterTourTarget(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Re-measure when the tour opens and on every step change. The delay lets a
  // just-navigated screen finish its transition — measuring mid-slide is what
  // produced the stale rect in the first place.
  useEffect(() => {
    if (!tourActive) return;
    const timer = setTimeout(measure, 140);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, tourStepIndex, id]);

  return (
    <View ref={ref} onLayout={measure} collapsable={false} className={className}>
      {children}
    </View>
  );
}
