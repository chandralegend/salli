import { MessageCircle } from "lucide-react-native";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, useWindowDimensions, View } from "react-native";

import { Logo } from "@/components/Logo";
import { useModeSwitch } from "@/hooks/useModeSwitch";
import { useSalliStore } from "@/lib/store";
import { useThemeColors } from "@/lib/theme";

const EDGE_WIDTH = 24;
const COMMIT_DISTANCE = 120;
const COMMIT_VELOCITY = 0.8;

/**
 * Bidirectional Buddy Mode <-> Pro Mode switch, available from any screen in
 * either mode. One PanResponder (no reanimated, no gesture-handler — both are
 * unavailable in this project, see components/ui/drawer.tsx for the same
 * PanResponder + core Animated technique) claims drags starting within
 * EDGE_WIDTH of the right edge; there are only two modes, so the same gesture
 * always toggles to "the other one" — no direction-specific logic needed.
 *
 * Visual: not a live second navigator tree (expo-router's Stack can't be
 * legitimately co-mounted twice from a generic wrapper) — a placeholder
 * overlay for the target mode slides in from the right, driven by the same
 * Animated.Value that slides the real screen out to the left, so they move
 * together edge-to-edge. On commit, the mode + route swap happens at the
 * exact frame the overlay still fully covers the screen.
 */
export function EdgeSwipeModeSwitcher({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const colors = useThemeColors();
  const mode = useSalliStore((s) => s.mode);
  const modeChosen = useSalliStore((s) => s.modeChosen);
  const { enter } = useModeSwitch();

  const [dragging, setDragging] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const targetMode = mode === "buddy" ? "pro" : "buddy";

  const commit = () => {
    Animated.timing(translateX, { toValue: -width, duration: 180, useNativeDriver: true }).start(() => {
      // Same helper every other entry point uses, so the stored mode and the
      // visible screen can't drift apart. replace, not push: swiping between
      // modes shouldn't grow the back stack.
      enter(targetMode, { replace: true });
      translateX.setValue(0);
      setDragging(false);
    });
  };

  const cancel = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start(() =>
      setDragging(false),
    );
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Edge-origin + horizontally-dominant-drag only — a plain tap in this
        // strip, or a drag starting anywhere else (incl. internal ScrollViews
        // and the FI tab strip), never claims the responder.
        // Edge-origin is already guaranteed by this view's own bounds (only a
        // touch starting within the EDGE_WIDTH-wide strip ever reaches these
        // handlers) — gestureState.x0 is unreliable for this on this RN
        // version, so direction-dominance is the only extra check needed here.
        onMoveShouldSetPanResponder: (_e, g) => g.dx < -6 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => setDragging(true),
        onPanResponderMove: (_e, g) => {
          if (g.dx < 0) translateX.setValue(g.dx);
        },
        onPanResponderRelease: (_e, g) => {
          if (-g.dx > COMMIT_DISTANCE || -g.vx > COMMIT_VELOCITY) commit();
          else cancel();
        },
        onPanResponderTerminate: cancel,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, mode],
  );

  if (!modeChosen) return <>{children}</>;

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={{ flex: 1, transform: [{ translateX }] }}>{children}</Animated.View>

      {dragging ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: width,
            width,
            backgroundColor: colors.background,
            transform: [{ translateX }],
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {targetMode === "buddy" ? (
            <MessageCircle size={40} color={colors.accent} strokeWidth={1.75} />
          ) : (
            <Logo size={36} className="text-foreground" />
          )}
        </Animated.View>
      ) : null}

      <View
        {...pan.panHandlers}
        pointerEvents="auto"
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: EDGE_WIDTH }}
      />
    </View>
  );
}
