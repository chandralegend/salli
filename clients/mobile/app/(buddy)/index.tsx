import { useRouter } from "expo-router";
import { Mic, Paperclip, Send, SquarePen, Trash2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApprovalGateCard } from "@/components/agent/ApprovalGateCard";
import { AssistantMarkdown } from "@/components/agent/AssistantMarkdown";
import { Bloub } from "@/components/agent/Bloub";
import type { BloubMood } from "@/components/agent/bloub-geometry";
import { ToolActivityBlock } from "@/components/agent/ToolActivityBlock";
import { Drawer } from "@/components/ui/drawer";
import { type ChatMessage, useAgentChat } from "@/hooks/useAgentChat";
import { useIsTablet } from "@/lib/responsive";
import { useHardShadow, useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Buddy Mode's opening line — no suggestion chips, no mascot/avatar: Salli's
 * identity here comes from typography, conversation, motion, and the brand
 * mark only, per the UI refresh spec. */
/** One line per mood, so the face is never the only thing carrying the state. */
const MOOD_CAPTION: Record<BloubMood, string> = {
  neutral: "Ask me anything about your money.",
  curious: "Go on\u2026",
  excited: "Working on it\u2026",
  surprised: "This one needs you.",
};

/** On tablet, chat content (messages + composer) is capped to a readable
 * column and centered instead of stretching edge-to-edge across the screen —
 * same idea as AuthShell's form column, wider here since it needs to hold
 * message bubbles rather than form fields. */
const TABLET_CHAT_WIDTH = 640;

export default function BuddyScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const shadow = useHardShadow();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  // Whether a keyboard is currently covering the bottom of the screen.
  //
  // The composer reserves insets.bottom for the home indicator, which is right
  // until a keyboard covers the home indicator — then that reservation is
  // ~34pt of dead space between the composer and the keyboard, and the
  // composer visibly detaches from it. Every polished chat app collapses this;
  // measuring against ChatGPT, its gap is roughly a third of what ours was.
  const [keyboardUp, setKeyboardUp] = useState(false);
  useEffect(() => {
    // iOS gets the Will* pair so the padding animates with the keyboard rather
    // than snapping after it has finished moving. Android only fires Did*.
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, () => setKeyboardUp(true));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const chatColumnStyle = {
    width: "100%" as const,
    maxWidth: isTablet ? TABLET_CHAT_WIDTH : undefined,
    alignSelf: "center" as const,
  };

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

  const openSessions = () => {
    sessions.refetch();
    setSessionsOpen(true);
  };

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  /**
   * What the face is doing, from what the conversation is doing.
   *
   * Ordered by urgency: a pending approval outranks streaming, because it is
   * the only state that is actually blocked on the person. Typing beats idle.
   */
  const awaitingApproval = messages.some((m) =>
    m.role === "assistant" ? m.parts.some((part) => part.kind === "approval" && !part.resolved) : false,
  );
  const mood: BloubMood = awaitingApproval
    ? "surprised"
    : streaming
      ? "excited"
      : input.trim()
        ? "curious"
        : "neutral";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* The header holds the face once a conversation exists, and nothing
          before that. It used to carry a "Salli" title and a "Swipe left for
          Pro Mode" caption — a name over a screen that is unmistakably Salli's,
          and navigation copy repeated on every scroll of every conversation.
          Both now live in the empty state, said once, where there is room to
          say them properly.

          The face is still the way into chat history, as the title was: in the
          empty state the big one is the tap target, and here the small one is,
          so history is reachable in both states. */}
      {messages.length > 0 ? (
        <Pressable
          onPress={openSessions}
          accessibilityRole="button"
          accessibilityLabel="Chat history"
          className="items-center pb-2.5 pt-1.5"
        >
          <Bloub mood={mood} size={34} enterFrom={1.9} />
        </Pressable>
      ) : (
        <View className="pt-1.5" />
      )}

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {messages.length === 0 ? (
          <View className="flex-1 justify-center px-4 pb-3">
            <Pressable
              style={chatColumnStyle}
              className="items-center"
              onPress={openSessions}
              accessibilityRole="button"
              accessibilityLabel="Chat history"
            >
              {/* Salli's face instead of a paragraph. The old opening line said
                  the same thing every time and read as a message that had
                  already been sent; the face says "something is here and
                  listening" with no reading at all, and unlike a line of text
                  it then reacts to the conversation. */}
              <Bloub mood={mood} size={188} />
              <Text className="mt-7 px-6 text-center text-[19px] font-sans-semibold leading-[26px] text-foreground">
                {MOOD_CAPTION[mood]}
              </Text>
              {/* Said once, here, rather than on every scroll of every
                  conversation — and it names what is over there instead of the
                  mode's internal label. "Pro Mode" and "manual" describe how
                  the app is built; the ledger and the tax figures are what you
                  actually went looking for. */}
              <Text className="mt-2.5 px-6 text-center text-[15px] leading-[21px] text-muted-foreground">
                Swipe left for your ledger, tax and reports.
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList<ChatMessage>
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 14, gap: 14, ...chatColumnStyle }}
            renderItem={({ item }) =>
              item.role === "user" ? (
                <View className="flex-row justify-end">
                  <View
                    className="max-w-[78%] rounded-card border-2 border-foreground px-4 py-3"
                    style={[{ backgroundColor: colors.bubbleUser }, shadow]}
                  >
                    <Text selectable className="text-[16.5px] leading-[23px]" style={{ color: "#000000" }}>
                      {item.content}
                    </Text>
                  </View>
                </View>
              ) : (
                /* No bubble, and no width cap, on the assistant side.
                   ChatGPT, Claude and Gemini all render the reply as plain
                   text across the column and reserve the bubble for the user,
                   because the two halves are not symmetric: a user message is
                   a short line, a reply is markdown that can carry headings,
                   lists, tables and code. A 78%-wide tinted box made every
                   table scroll and every code block wrap, and read as a
                   quoted aside rather than as the answer. */
                <View>
                  <ToolActivityBlock parts={item.parts} />
                  <View className="gap-3.5">
                    {item.parts.map((part, i) =>
                      part.kind === "tool_call" ? null : part.kind === "approval" ? (
                        <ApprovalGateCard
                          key={i}
                          action={part.action}
                          resolved={part.resolved}
                          onResolve={resolveApproval}
                        />
                      ) : (
                        <View key={i} className="px-1">
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
          <View className="mb-2 px-4">
            <View
              className="rounded-card border border-destructive/25 bg-destructive/10 px-3.5 py-2.5"
              style={chatColumnStyle}
            >
              <Text className="text-[15px] text-destructive">{quotaBanner}</Text>
            </View>
          </View>
        ) : null}

        <View className="px-3.5 pt-2" style={{ paddingBottom: keyboardUp ? 8 : insets.bottom + 16 }}>
          <View
            className="flex-row items-center gap-2 rounded-card border-2 border-foreground bg-card py-1.5 pl-2 pr-1.5"
            style={[chatColumnStyle, shadow]}
          >
            <Pressable className="h-11 w-11 items-center justify-center" accessibilityLabel="Attach a file">
              <Paperclip size={19} color={colors.mutedForeground} strokeWidth={1.8} />
            </Pressable>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Tell me what's up..."
              placeholderTextColor="rgba(128,128,128,0.4)"
              className="flex-1 text-[16.5px] text-foreground"
              multiline
              onSubmitEditing={() => send(input)}
            />
            {input.trim() ? (
              <Pressable
                onPress={() => send(input)}
                disabled={streaming}
                className={cn(
                  // 42px rounded square, radius 10 — the mockup's composer
                  // button is square, matching the field it sits inside.
                  "h-[42px] w-[42px] items-center justify-center rounded-[10px] border-2 border-foreground bg-salli-ai",
                  streaming && "opacity-40",
                )}
              >
                {/* Black on lavender: the lavender is theme-invariant, so an
                    ink-derived glyph would disappear on it in dark mode. */}
                <Send size={18} color="#000000" strokeWidth={2.5} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push("/voice")}
                className="h-[42px] w-[42px] items-center justify-center rounded-[10px] border-2 border-foreground bg-salli-ai"
                accessibilityLabel="Start voice mode"
              >
                <Mic size={18} color="#000000" strokeWidth={2} />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <Drawer visible={sessionsOpen} onClose={() => setSessionsOpen(false)} keyboardAvoiding={false}>
        <View className="flex-row items-center justify-between px-1 pb-3 pt-1">
          <Text className="font-sans-bold text-[19px] text-foreground">Conversations</Text>
          <Pressable
            onPress={() => {
              startNewChat();
              setSessionsOpen(false);
            }}
            className="flex-row items-center gap-1.5 rounded-pill bg-salli-accent px-3 py-1.5"
          >
            <SquarePen size={15} color="#FFFFFF" strokeWidth={2} />
            <Text className="font-sans-bold text-[17px] text-white">New chat</Text>
          </Pressable>
        </View>
        {(sessions.data ?? []).length === 0 ? (
          <View className="items-center px-1 py-10">
            <Text className="text-[15px] text-muted-foreground">No conversations yet.</Text>
          </View>
        ) : (
          (sessions.data ?? []).map((s) => (
            <View
              key={s.thread_id}
              className="flex-row items-center gap-3 border-t border-foreground/[0.05] px-1 py-3"
            >
              <Pressable className="flex-1" onPress={() => handleLoadThread(s.thread_id)}>
                <Text numberOfLines={1} className="font-sans-medium text-[16px] text-foreground">
                  {s.title || "New conversation"}
                </Text>
                <Text className="mt-0.5 text-[14px] text-muted-foreground">
                  {new Date(s.last_active_at).toLocaleDateString()}
                </Text>
              </Pressable>
              <Pressable onPress={() => deleteSession.mutate(s.thread_id)} className="p-1">
                <Trash2 size={17} color={colors.mutedForeground} strokeWidth={2} />
              </Pressable>
            </View>
          ))
        )}
      </Drawer>
    </View>
  );
}
