import { BlurView } from "expo-blur";
import { X } from "lucide-react-native";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIsTablet } from "@/lib/responsive";
import { useAppTheme, useThemeColors, useThemeVars } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Backdrop tint layered over the blur, keyed by theme so the scrim reads as
 * the same "material" in both modes rather than a fixed black overlay. */
const BACKDROP_TINT = { dark: "rgba(16,15,14,0.55)", light: "rgba(28,24,21,0.16)" };

/** On tablet, the sheet is capped to a comfortable width and centered instead
 * of spanning the full screen edge-to-edge — matches how iPadOS's own sheets
 * (share sheet, popovers) stay a bounded width rather than stretching. */
const TABLET_SHEET_MAX_WIDTH = 560;

type DrawerProps = {
  visible: boolean;
  onClose: () => void;
  /** Header row with title + circular X close. Omit for a chromeless sheet. */
  title?: string;
  /** Wrap children in a ScrollView (keyboardShouldPersistTaps). Default true. */
  scroll?: boolean;
  /** Wrap in KeyboardAvoidingView so the keyboard doesn't cover inputs. Default true. */
  keyboardAvoiding?: boolean;
  /** Sheet height cap as a % of the window. Default 88. */
  maxHeightPct?: number;
  /** Pinned element below the scroll area (e.g. a Save button). */
  footer?: ReactNode;
  children: ReactNode;
  /** Extra classes on the sheet container. */
  className?: string;
};

/**
 * Shared bottom-sheet drawer — one implementation for every sheet in the app.
 * Built on RN core (Modal + Animated + PanResponder) so it needs no native deps:
 * drag the grab handle down to dismiss, tap the scrim or X to close, and (by
 * default) it avoids the keyboard and respects the bottom safe-area. Theme vars
 * are reapplied on the sheet because RN Modal content portals outside the tree.
 */
export function Drawer({
  visible,
  onClose,
  title,
  scroll = true,
  keyboardAvoiding = true,
  maxHeightPct = 88,
  footer,
  children,
  className,
}: DrawerProps) {
  const colors = useThemeColors();
  const themeVars = useThemeVars();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { height } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Drive the entrance ourselves (Modal's own animationType is "none") so the
  // backdrop fades in place while only the sheet slides — RN's built-in
  // "slide" animationType moves the whole modal subtree as one unit, which
  // made the backdrop tint visibly slide up together with the sheet.
  useEffect(() => {
    if (visible) {
      translateY.setValue(height);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 240, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity, height]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: height, duration: 180, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      onClose();
    });
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Only claim the gesture on a clear downward drag from the handle.
        onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => {
          if (g.dy > 0) translateY.setValue(g.dy);
        },
        onPanResponderRelease: (_e, g) => {
          if (g.dy > 120 || g.vy > 0.8) {
            dismiss();
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [height],
  );

  const body = scroll ? (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View>{children}</View>
  );

  const sheet = (
    <Pressable onPress={() => {}}>
      <Animated.View
        style={[
          themeVars,
          {
            transform: [{ translateY }],
            maxHeight: (height * maxHeightPct) / 100,
            paddingBottom: insets.bottom + 12,
            width: "100%",
            maxWidth: isTablet ? TABLET_SHEET_MAX_WIDTH : undefined,
            alignSelf: "center",
          },
        ]}
        className={cn("rounded-t-[24px] border-t border-foreground/10 bg-background px-4 pt-2.5", className)}
      >
        <View {...pan.panHandlers} className="items-center pb-1 pt-0.5">
          <View className="h-1 w-10 rounded-full bg-foreground/20" />
        </View>

        {title ? (
          <View className="flex-row items-center px-0.5 pb-3 pt-1">
            <Text className="flex-1 font-sans-bold text-[18px] text-foreground">{title}</Text>
            <Pressable
              onPress={dismiss}
              hitSlop={8}
              className="h-[30px] w-[30px] items-center justify-center rounded-full bg-foreground/[0.08]"
            >
              <X size={14} color={colors.mutedForeground} strokeWidth={2} />
            </Pressable>
          </View>
        ) : null}

        {body}
        {footer ? <View className="pt-2.5">{footer}</View> : null}
      </Animated.View>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <Pressable className="flex-1 justify-end" onPress={dismiss}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: backdropOpacity }]}>
          <BlurView intensity={35} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFillObject} />
          <View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: BACKDROP_TINT[isDark ? "dark" : "light"] }]}
          />
        </Animated.View>
        {keyboardAvoiding ? (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>{sheet}</KeyboardAvoidingView>
        ) : (
          sheet
        )}
      </Pressable>
    </Modal>
  );
}
