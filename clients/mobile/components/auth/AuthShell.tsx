import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

import { useIsTablet } from "@/lib/responsive";

const TABLET_FORM_WIDTH = 440;

/** Shared shell for login/signup/forgot-password: plain canvas,
 * keyboard-avoiding scroll, and a tablet-aware centered column so the form
 * doesn't stretch edge-to-edge on iPad. */
export function AuthShell({ children }: { children: ReactNode }) {
  const isTablet = useIsTablet();

  return (
    <View className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
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
