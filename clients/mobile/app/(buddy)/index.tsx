import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Check,
  LoaderCircle,
  Menu,
  Mic,
  Send,
  Smile,
  SquarePen,
  Trash2,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApprovalCard } from "@/components/agent/ApprovalCard";
import { AssistantMarkdown } from "@/components/agent/AssistantMarkdown";
import { Drawer } from "@/components/ui/drawer";
import { type ChatMessage, useAgentChat } from "@/hooks/useAgentChat";
import { useSalliStore } from "@/lib/store";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "How am I doing this month?",
  "Can I afford a new phone?",
  "Help me save a bit more",
  "What's eating my money?",
];

export default function BuddyScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const setMode = useSalliStore((s) => s.setMode);

  const [input, setInput] = useState("");
  const [sessionsOpen, setSessionsOpen] = useState(false);

  const {
    messages,
    streaming,
    quotaBanner,
    sessions,
    deleteSession,
    send: sendMessage,
    resolveApproval,
    startNewChat,
    loadThread,
  } = useAgentChat({ persona: "buddy" });

  const send = (text: string) => {
    if (!text.trim() || streaming) return;
    setInput("");
    sendMessage(text);
  };

  const handleLoadThread = async (threadId: string) => {
    setSessionsOpen(false);
    await loadThread(threadId);
  };

  const goToProMode = () => {
    setMode("pro");
    router.replace("/(tabs)");
  };

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-row items-center border-b border-foreground/[0.08] px-4 py-2.5">
        <Pressable
          onPress={() => {
            sessions.refetch();
            setSessionsOpen(true);
          }}
          className="h-9 w-9 items-center justify-center"
        >
          <Menu size={18} color={colors.mutedForeground} strokeWidth={2} />
        </Pressable>
        <Pressable onPress={goToProMode} className="flex-1 flex-row items-center justify-center gap-1">
          <ChevronLeft size={12} color={colors.mutedForeground} strokeWidth={2.5} />
          <Text className="text-[11px] font-sans-medium text-foreground/35">Pro Mode</Text>
        </Pressable>
        <Pressable onPress={startNewChat} className="h-9 w-9 items-center justify-center">
          <SquarePen size={18} color={colors.mutedForeground} strokeWidth={1.8} />
        </Pressable>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <View className="h-[72px] w-[72px] items-center justify-center rounded-full border border-salli-accent/25 bg-salli-accent/15">
              <Smile size={32} color={colors.accent} strokeWidth={1.6} />
            </View>
            <Text className="mt-4 text-center font-sans-bold text-[20px] text-foreground">
              Hey, I&apos;m Salli
            </Text>
            <Text className="mt-1.5 text-center text-[13px] leading-5 text-foreground/40">
              Think of me as your money buddy. No jargon, no judgment — just talk to me{"\n"}
              about whatever&apos;s on your mind, and we&apos;ll figure it out together.
            </Text>
            <View className="mt-5 w-full gap-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => send(p)}
                  className="items-center rounded-pill border border-foreground/[0.08] bg-card px-4 py-3"
                >
                  <Text className="text-[13px] text-foreground/70">{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList<ChatMessage>
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 14, gap: 14 }}
            renderItem={({ item }) =>
              item.role === "user" ? (
                <View className="flex-row justify-end">
                  <View className="max-w-[80%] rounded-[20px] rounded-br-[6px] bg-salli-accent px-4 py-3">
                    <Text className="text-[14px] leading-5 text-white">{item.content}</Text>
                  </View>
                </View>
              ) : (
                <View className="flex-row items-start gap-2 pr-8">
                  <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-salli-accent/15">
                    <Smile size={12} color={colors.accent} strokeWidth={2} />
                  </View>
                  <View className="flex-1 gap-1.5">
                    {item.parts.map((part, i) =>
                      part.kind === "tool_call" ? (
                        <View key={i} className="flex-row items-center gap-[7px] pl-0.5">
                          <LoaderCircle size={11} color={colors.mutedForeground} strokeWidth={2} />
                          <Text className="text-[11px] capitalize text-foreground/30">
                            {part.agent ? `${part.agent.replace(/_/g, " ")}: ` : ""}
                            {part.name.replace(/_/g, " ")}
                          </Text>
                          {part.done ? <Check size={9} color={colors.accent} strokeWidth={2.5} /> : null}
                        </View>
                      ) : part.kind === "approval" ? (
                        <ApprovalCard
                          key={i}
                          action={part.action}
                          resolved={part.resolved}
                          onResolve={resolveApproval}
                        />
                      ) : (
                        <View
                          key={i}
                          className="rounded-[18px] rounded-tl-[6px] bg-card px-3.5 py-3"
                        >
                          <AssistantMarkdown content={part.content} />
                        </View>
                      ),
                    )}
                  </View>
                </View>
              )
            }
          />
        )}

        {quotaBanner ? (
          <View className="mx-4 mb-2 rounded-control border border-destructive/25 bg-destructive/10 px-3.5 py-2.5">
            <Text className="text-[12px] text-destructive">{quotaBanner}</Text>
          </View>
        ) : null}

        <View className="px-3.5 pt-2" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="flex-row items-center gap-2.5 rounded-[24px] border border-foreground/10 bg-card py-1.5 pl-4 pr-1.5">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Tell me what's up..."
              placeholderTextColor="rgba(128,128,128,0.4)"
              className="flex-1 text-[14px] text-foreground"
              multiline
              onSubmitEditing={() => send(input)}
            />
            {input.trim() ? (
              <Pressable
                onPress={() => send(input)}
                disabled={streaming}
                className={cn(
                  "h-[36px] w-[36px] items-center justify-center rounded-full bg-salli-accent",
                  streaming && "opacity-40",
                )}
              >
                <Send size={15} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            ) : (
              // Voice input is a planned fast-follow — the composer already
              // reserves the spot so adding it later needs no layout change.
              <View className="h-[36px] w-[36px] items-center justify-center rounded-full bg-foreground/[0.06] opacity-40">
                <Mic size={15} color={colors.mutedForeground} strokeWidth={2} />
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <Drawer visible={sessionsOpen} onClose={() => setSessionsOpen(false)} keyboardAvoiding={false}>
        <View className="flex-row items-center justify-between px-1 pb-3 pt-1">
          <Text className="font-sans-bold text-[17px] text-foreground">Conversations</Text>
          <Pressable
            onPress={() => {
              startNewChat();
              setSessionsOpen(false);
            }}
            className="flex-row items-center gap-1.5 rounded-pill bg-salli-accent px-3 py-1.5"
          >
            <SquarePen size={13} color="#FFFFFF" strokeWidth={2} />
            <Text className="font-sans-semibold text-[12px] text-white">New chat</Text>
          </Pressable>
        </View>
        {(sessions.data ?? []).length === 0 ? (
          <View className="items-center px-1 py-10">
            <Text className="text-[13px] text-foreground/35">No conversations yet.</Text>
          </View>
        ) : (
          (sessions.data ?? []).map((s) => (
            <View
              key={s.thread_id}
              className="flex-row items-center gap-3 border-t border-foreground/[0.05] px-1 py-3"
            >
              <Pressable className="flex-1" onPress={() => handleLoadThread(s.thread_id)}>
                <Text numberOfLines={1} className="font-sans-medium text-[14px] text-foreground">
                  {s.title || "New conversation"}
                </Text>
                <Text className="mt-0.5 text-[11px] text-foreground/30">
                  {new Date(s.last_active_at).toLocaleDateString()}
                </Text>
              </Pressable>
              <Pressable onPress={() => deleteSession.mutate(s.thread_id)} className="p-1">
                <Trash2 size={15} color={colors.mutedForeground} strokeWidth={2} />
              </Pressable>
            </View>
          ))
        )}
      </Drawer>
    </View>
  );
}
