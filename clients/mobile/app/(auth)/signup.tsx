import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Mail } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { Logo } from "@/components/Logo";
import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import { signUpWithPassword } from "@/lib/auth";

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSignUp = async () => {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await signUpWithPassword(email.trim(), password);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={["#0B20E0", "#0912B0", "#060A6A", "#020518", "#000000"]}
        locations={[0, 0.3, 0.55, 0.8, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 430 }}
      />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="items-center px-6 pb-13 pt-[60px]">
            <Logo size={80} />
            <Text className="mt-[22px] font-sans-bold text-[26px] tracking-tight text-white">
              Create account
            </Text>
            <Text className="mt-2.5 text-center text-[13px] text-white/45">
              Set up your Salli account to get started.
            </Text>
          </View>

          {sent ? (
            <View className="items-center gap-3 px-6">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-salli-accent/20">
                <Mail size={22} color="#2563EB" strokeWidth={2} />
              </View>
              <Text className="text-center font-sans-semibold text-[16px] text-white">
                Check your inbox
              </Text>
              <Text className="text-center text-[13px] text-white/40">
                We&apos;ve sent a confirmation link to {email}.
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
              <TextField
                className="rounded-[16px] px-[18px] py-[14px]"
                label="Password"
                optionalHint="min 8 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder="••••••••"
              />

              {error ? (
                <View className="rounded-control border border-destructive/30 bg-destructive/10 px-4 py-3">
                  <Text className="text-[13px] text-destructive">{error}</Text>
                </View>
              ) : null}

              <PillButton
                className="mt-1 h-[54px]"
                loading={loading}
                disabled={!email || !password}
                onPress={handleSignUp}
              >
                <Text className="font-sans-semibold text-[17px] text-black">Create account</Text>
              </PillButton>

              <Pressable className="items-center py-2" onPress={() => router.replace("/(auth)/login")}>
                <Text className="text-[13px] text-white/40">
                  Already have an account? <Text className="text-salli-accent">Sign in</Text>
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
