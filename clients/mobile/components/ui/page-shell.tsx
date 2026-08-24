import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIsTablet } from "../../lib/responsive";
import { useThemeColors } from "../../lib/theme";
import { cn } from "../../lib/utils";

/** On tablet, page content is capped to a readable column and centered
 * instead of stretching every card/row edge-to-edge across the screen — same
 * pattern as AuthShell and Buddy Mode's chat column, just a bit wider since
 * these pages hold multi-cell grids (stat tiles, budget breakdowns) rather
 * than a single form or message thread. */
const TABLET_CONTENT_MAX_WIDTH = 720;

type PageShellProps = ScrollViewProps & {
  children: ReactNode;
  /**
   * Rendered pinned above the scroll area instead of scrolling away with the
   * content. Pass the screen's `<ScreenHeader />` here on any page long enough
   * to scroll — otherwise its back button leaves the screen and the only way
   * out is to scroll all the way back to the top.
   *
   * Rendered outside the ScrollView rather than via `stickyHeaderIndices`,
   * which needs the sticky child to paint its own opaque background (a
   * transparent `ScreenHeader` would let content slide visibly underneath it)
   * and only works when the header is literally child index 0.
   */
  header?: ReactNode;
  /**
   * Cross-fade the scroll content whenever this value changes — pass the active
   * in-screen tab. Without it, switching Accounts/Journal or Overview/Strategy
   * swaps the whole body in a single frame, which reads as a glitch rather than
   * a navigation.
   *
   * Enter-only by design: React has already replaced the outgoing content by
   * the time the effect runs, so there is nothing left to fade out. The pinned
   * header is deliberately excluded — the tab pill should stay put while the
   * panel beneath it moves.
   */
  animateOn?: string;
  /** Extra bottom padding to clear the fixed tab bar (56px + safe area). */
  tabBarInset?: boolean;
  /** Make the shell transparent so a parent-rendered background (e.g. the
   * Dashboard hero gradient sitting behind it) shows through. */
  transparent?: boolean;
  className?: string;
};

/** Base scroll container every screen sits in: theme background, safe-area top
 * inset, and (when shown under the tab bar) enough bottom padding to clear the
 * fixed 56px bar so the last card isn't hidden behind it. */
export function PageShell({
  children,
  header,
  animateOn,
  tabBarInset = true,
  transparent = false,
  className,
  contentContainerStyle,
  onScroll,
  scrollEventThrottle,
  ...props
}: PageShellProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const isTablet = useIsTablet();

  // Drives the divider under a pinned header. Kept off until the content has
  // actually moved: a permanent hairline on a page that doesn't scroll reads as
  // stray chrome, while on a scrolled page it's what stops the header from
  // looking like it's floating over the rows passing beneath it.
  const [scrolled, setScrolled] = useState(false);

  // The header has to share the content column exactly, or on tablet the title
  // sits against the screen edge while the cards it belongs to are centered.
  const column = {
    width: "100%" as const,
    maxWidth: isTablet ? TABLET_CONTENT_MAX_WIDTH : undefined,
    alignSelf: "center" as const,
  };

  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentShift = useRef(new Animated.Value(0)).current;
  const firstPanel = useRef(true);

  useEffect(() => {
    if (animateOn === undefined) return;
    // Skip the initial mount — the screen already has the navigator's own
    // push/fade, and stacking a second one on top just looks busy.
    if (firstPanel.current) {
      firstPanel.current = false;
      return;
    }
    contentOpacity.setValue(0);
    contentShift.setValue(8);
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(contentShift, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [animateOn, contentOpacity, contentShift]);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (header) setScrolled(e.nativeEvent.contentOffset.y > 4);
    onScroll?.(e);
  }

  return (
    <View style={{ flex: 1, backgroundColor: transparent ? "transparent" : colors.background }}>
      {header ? (
        <View
          style={{
            paddingTop: insets.top,
            paddingBottom: 10,
            // Opaque even when the shell is transparent. A pinned header has to
            // hide what passes beneath it, and a see-through one would show
            // rows sliding across the title. The ambient glow behind a
            // `transparent` screen is faintest at the very top, so covering
            // that strip costs almost nothing visually.
            backgroundColor: colors.background,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: scrolled ? colors.border : "transparent",
            zIndex: 10,
          }}
        >
          <View style={column}>{header}</View>
        </View>
      ) : null}
      <ScrollView
        style={{ paddingTop: header ? 0 : insets.top, backgroundColor: "transparent" }}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle ?? 16}
        contentContainerStyle={[
          {
            paddingBottom: tabBarInset ? 56 + insets.bottom + 16 : insets.bottom + 24,
            ...column,
          },
          contentContainerStyle,
        ]}
        className={cn(className)}
        {...props}
      >
        {animateOn === undefined ? (
          children
        ) : (
          <Animated.View
            style={{ opacity: contentOpacity, transform: [{ translateY: contentShift }] }}
          >
            {children}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
