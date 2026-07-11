import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/Logo";

/** Mirrors clients/web/src/components/auth/AuthShell.tsx, adapted to a mobile canvas. */
export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full">
            <View className="flex-row items-center gap-2.5 mb-8">
              <Logo size={40} />
              <Text
                className="text-foreground"
                style={{ fontFamily: "DMSans_900Black", fontSize: 24, letterSpacing: -1.5 }}
              >
                salli
              </Text>
            </View>

            <Text
              className="text-foreground mb-1.5"
              style={{ fontFamily: "DMSans_700Bold", fontSize: 26, letterSpacing: -1, lineHeight: 30 }}
            >
              {title}
            </Text>
            <Text className="text-muted-foreground text-[14px] mb-7">{subtitle}</Text>

            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
