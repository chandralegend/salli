import { type ReactNode, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

import { useIsTablet } from "@/lib/responsive";

const TABLET_FORM_WIDTH = 440;

/** Shared shell for login/signup/forgot-password: plain canvas,
 * keyboard-avoiding scroll, and a tablet-aware centered column so the form
 * doesn't stretch edge-to-edge on iPad.
 *
 * The scroll only engages when the content genuinely does not fit. A
 * ScrollView is still needed, because a raised keyboard can halve the
 * available height and short devices run out of room, but leaving it always
 * scrollable meant a form that fits perfectly still rubber-banded under the
 * finger. That bounce is what makes a native screen feel like a web page: a
 * screen that fits should be immovable.
 *
 * Measured rather than guessed. Content height comes from
 * `onContentSizeChange` and viewport height from `onLayout`, so the same shell
 * behaves correctly on a small phone, on an iPad, and with the keyboard up,
 * without hard-coding a breakpoint that would be wrong on the next device.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const isTablet = useIsTablet();
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  // Strictly greater: equal heights fit, and allowing a scroll there would
  // reintroduce the bounce this is here to remove.
  const overflows = contentHeight > viewportHeight;

  return (
    <View className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={overflows}
          // `bounces` alone is not enough on iOS: a ScrollView whose content
          // fits will still bounce vertically unless this is also off.
          bounces={overflows}
          alwaysBounceVertical={false}
          showsVerticalScrollIndicator={overflows}
          onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
          onContentSizeChange={(_w, h) => setContentHeight(h)}
        >
          <View className="items-center px-6">
            <View style={{ width: "100%", maxWidth: isTablet ? TABLET_FORM_WIDTH : undefined }}>
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
