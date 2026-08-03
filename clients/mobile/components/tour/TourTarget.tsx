import { type ReactNode, useEffect, useRef } from "react";
import { View } from "react-native";

import { useSalliStore } from "@/lib/store";

/**
 * Wraps a tour-anchor element and registers its measured screen rect (in
 * window coordinates, since the spotlight overlay renders in a separate
 * `Modal` that portals outside this tree) into the tour store, keyed by id.
 * Re-measures on every layout so tab-bar/theme-driven reflows stay accurate.
 * `className` passes through so wrapping a flex child (e.g. `flex-1` in a
 * stat-tile row) doesn't break the surrounding layout.
 */
export function TourTarget({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const ref = useRef<View>(null);
  const registerTourTarget = useSalliStore((s) => s.registerTourTarget);
  const unregisterTourTarget = useSalliStore((s) => s.unregisterTourTarget);

  const measure = () => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) registerTourTarget(id, { x, y, width, height });
    });
  };

  useEffect(() => {
    return () => unregisterTourTarget(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <View ref={ref} onLayout={measure} collapsable={false} className={className}>
      {children}
    </View>
  );
}
