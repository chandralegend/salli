import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AuthShell } from "@/components/auth/AuthShell";
import { Logo } from "@/components/Logo";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import { devLogin, signInWithPassword } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabaseReady = isSupabaseConfigured();

  const handleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPassword(email.trim(), password);
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setLoading(true);
    try {
      await devLogin(email.trim() || "dev-user");
      router.replace("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <View className="items-center pb-9">
        <Logo size={52} className="text-foreground" />
        <Text className="mt-4 text-center text-[14px] leading-5 text-foreground/45">
          AI-powered personal finance{"\n"}Built for Sri Lanka
        </Text>
      </View>

      <View className="gap-2.5">
        {supabaseReady ? <SocialAuthButtons onError={setError} /> : null}

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
          onPress={handleSignIn}
        >
          Sign in
        </PillButton>

        <Pressable
          className="items-center py-1"
          onPress={() => router.push("/(auth)/forgot-password")}
        >
          <Text className="font-sans-medium text-[14px] text-salli-accent">Forgot password?</Text>
        </Pressable>

        <View className="my-1 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-foreground/10" />
          <Text className="text-[12px] text-foreground/20">or</Text>
          <View className="h-px flex-1 bg-foreground/10" />
        </View>

        <PillButton
          variant="secondary"
          className="h-[54px]"
          onPress={() => router.push("/(auth)/signup")}
        >
          Create account
        </PillButton>

        {!supabaseReady ? (
          <Pressable className="items-center py-2" onPress={handleDevLogin}>
            <Text className="text-[12px] text-foreground/30">Dev login (skip auth)</Text>
          </Pressable>
        ) : null}
      </View>
    </AuthShell>
  );
}
