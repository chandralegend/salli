import { AlertCircle, CheckCircle2, Info } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useToastStore } from "@/lib/toast";
import { useAppTheme, useThemeColors, useThemeVars } from "@/lib/theme";

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

/**
 * Root-mounted, non-blocking toast — one at a time (a fresh `show()` replaces
 * whatever's currently up). Uses <Modal>, not a plain sibling View, so it
 * renders in its own top layer above any other currently-open Modal (e.g. a
 * Drawer/VoiceCaptureSheet the user is still interacting with when an error
 * fires) — the same reason Drawer/TourOverlay are Modal-based.
 */
export function ToastHost() {
  const toast = useToastStore((s) => s.toast);
  const hide = useToastStore((s) => s.hide);
  const insets = useSafeAreaInsets();
  const themeVars = useThemeVars();
  const colors = useThemeColors();
  const { isDark } = useAppTheme();

  const translateY = useRef(new Animated.Value(-16)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return;
    translateY.setValue(-16);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(hide, toast.duration);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id]);

  if (!toast) return null;

  const Icon = ICONS[toast.variant];
  const iconColor =
    toast.variant === "error"
      ? isDark
        ? "#EF4444"
        : "#DC2626"
      : toast.variant === "success"
        ? colors.success
        : colors.foreground;

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={hide}>
      <View style={[themeVars, { flex: 1 }]} pointerEvents="box-none">
        <Animated.View
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            right: 16,
            opacity,
            transform: [{ translateY }],
          }}
        >
          <Pressable
            onPress={hide}
            className="flex-row items-center gap-2.5 rounded-[16px] border border-foreground/10 bg-card px-4 py-3.5"
            style={{
              shadowColor: "#000000",
              shadowOpacity: 0.2,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 10,
            }}
          >
            <Icon size={18} color={iconColor} strokeWidth={2} />
            <Text className="flex-1 font-sans-medium text-[13px] text-foreground">{toast.message}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
