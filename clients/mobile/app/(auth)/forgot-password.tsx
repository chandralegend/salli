import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Mail } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { Logo } from "@/components/Logo";
import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import { sendPasswordReset } from "@/lib/auth";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setError(null);
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={["#f5310f", "#b8280f", "#5c1f13", "#16130f", "#000000"]}
        locations={[0, 0.3, 0.55, 0.8, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 430 }}
      />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center px-6 pb-9">
            <Logo size={80} />
            <Text className="mt-[22px] font-sans-bold text-[26px] tracking-tight text-white">
              Forgot password?
            </Text>
            <Text className="mt-2.5 text-center text-[13px] text-white/45">
              We&apos;ll email you a link to reset it.
            </Text>
          </View>

          {sent ? (
            <View className="items-center gap-3 px-6">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-salli-accent/20">
                <Mail size={22} color="#f5310f" strokeWidth={2} />
              </View>
              <Text className="text-center font-sans-semibold text-[16px] text-white">
                Check your inbox
              </Text>
              <Text className="text-center text-[13px] text-white/40">
                We&apos;ve sent a reset link to {email}.
              </Text>
              <PillButton className="mt-3 h-[54px] w-full" onPress={() => router.replace("/(auth)/login")}>
                <Text className="font-sans-semibold text-[17px] text-black">Back to sign in</Text>
              </PillButton>
            </View>
          ) : (
            <View className="gap-2.5 px-6">
              <TextField
                className="rounded-[16px] px-[18px] py-[14px]"
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@example.com"
              />

              {error ? (
                <View className="rounded-control border border-destructive/30 bg-destructive/10 px-4 py-3">
                  <Text className="text-[13px] text-destructive">{error}</Text>
                </View>
              ) : null}

              <PillButton className="mt-1 h-[54px]" loading={loading} disabled={!email} onPress={handleSend}>
                <Text className="font-sans-semibold text-[17px] text-black">Send reset link</Text>
              </PillButton>

              <Pressable className="items-center py-2" onPress={() => router.back()}>
                <Text className="text-[13px] text-white/40">Back to sign in</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
