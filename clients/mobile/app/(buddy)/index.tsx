import { useRouter } from "expo-router";
import { ChevronDown, Mic, Paperclip, Send, SquarePen, Trash2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
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
import { ThinkingIndicator } from "@/components/agent/ThinkingIndicator";
import { ToolActivityBlock } from "@/components/agent/ToolActivityBlock";
import { Drawer } from "@/components/ui/drawer";
import { useSalliSheet } from "@/hooks/useSalliSheet";
import { type ChatMessage, useAgentChat } from "@/hooks/useAgentChat";
import { useIsTablet } from "@/lib/responsive";
import { useSalliStore } from "@/lib/store";
import { useHardShadow, useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Buddy Mode's opening line — no suggestion chips, no mascot/avatar: Salli's
 * identity here comes from typography, conversation, motion, and the brand
 * mark only, per the UI refresh spec. */
/**
 * What the conversation is doing. Deliberately separate from which face is
 * showing: the caption is tied to state, the expression is not, so the resting
 * rotation below can change the face every few seconds without the headline
 * churning underneath it.
 */
type ChatState = "idle" | "typing" | "working" | "needsYou";

/** One line per state, so the face is never the only thing carrying it. */
const STATE_CAPTION: Record<ChatState, string> = {
  idle: "Ask me anything about your money.",
  typing: "Go on\u2026",
  working: "Working on it\u2026",
  needsYou: "This one needs you.",
};

/**
 * The faces Salli cycles through while nothing is happening.
 *
 * `excited` and `surprised` are deliberately excluded: they are reactions to
 * something, and showing them unprompted would have the face claiming a state
 * the conversation is not in. `curious` is excluded for the same reason — it is
 * the answer to you typing. What is left reads as present and waiting, which is
 * the truth while idle.
 */
const RESTING_MOODS: BloubMood[] = ["neutral", "attentive", "shy"];
const RESTING_INTERVAL_MS = 4500;

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
  const { close: closeSalli } = useSalliSheet();
  const isTablet = useIsTablet();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  // Whether a keyboard is currently covering the bottom of the screen.
  //
  // The composer reserves insets.bottom for the home indicator, which is right
  // until a keyboard covers the home indicator — then that reservation is
  // ~34pt of dead space between the composer and the keyboard, and the
  // composer visibly detaches from it. Every polished chat app collapses this;
  // measuring against ChatGPT, its gap is roughly a third of what ours was.
  //
  // The height is tracked, not just the fact of it. Salli is presented as an
  // iOS page sheet, and KeyboardAvoidingView measures its own frame against
  // the window: inside a sheet those disagree, so `behavior="padding"` lifted
  // the composer by the wrong amount and the keyboard covered it outright.
  // Reading `endCoordinates.height` and padding by it is not subject to that
  // mismatch, because the sheet reaches the bottom of the screen and the
  // keyboard height is measured from exactly there.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardUp = keyboardHeight > 0;
  useEffect(() => {
    // iOS gets the Will* pair so the padding animates with the keyboard rather
    // than snapping after it has finished moving. Android only fires Did*.
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) =>
      setKeyboardHeight(e.endCoordinates?.height ?? 0),
    );
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // On Android the window itself resizes (adjustResize), so padding by the
  // keyboard height as well would double-count and leave a gap the size of the
  // keyboard. Only iOS needs the manual lift.
  const composerPadBottom =
    Platform.OS === "ios" && keyboardUp
      ? // 8pt above the keyboard: enough to read as attached to it rather than
        // welded on, and roughly what ChatGPT leaves.
        keyboardHeight + 8
      : keyboardUp
        ? 8
        : insets.bottom + 16;
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
   * A question handed over by another screen — Freedom's "ask Salli for a
   * plan", for instance. Sent once, on mount, and cleared as it is read so a
   * remount cannot re-send it and re-spend the credits.
   */
  const consumePendingAsk = useSalliStore((st) => st.consumePendingAsk);
  useEffect(() => {
    const question = consumePendingAsk();
    if (question) send(question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Ordered by urgency: a pending approval outranks streaming, because it is
   * the only state actually blocked on the person. Typing beats idle.
   */
  const awaitingApproval = messages.some((m) =>
    m.role === "assistant" ? m.parts.some((part) => part.kind === "approval" && !part.resolved) : false,
  );
  /**
   * Streaming, with nothing yet to show for it.
   *
   * `streaming` alone is true for the whole reply, so keying the indicator off
   * it would leave "Thinking" pinned under a reply that is already arriving.
   * The gap worth filling is only the one before the assistant's turn has
   * produced anything at all: no text, no tool rows.
   */
  const lastMessage = messages[messages.length - 1];
  const awaitingFirstToken =
    streaming &&
    (!lastMessage ||
      lastMessage.role === "user" ||
      lastMessage.parts.every((part) =>
        part.kind === "text" ? !part.content.trim() : false,
      ));

  const chatState: ChatState = awaitingApproval
    ? "needsYou"
    : streaming
      ? "working"
      : input.trim()
        ? "typing"
        : "idle";

  // While idle, drift between the resting faces rather than holding one. A
  // single fixed expression made the empty state read as an illustration; the
  // change is what makes it read as someone waiting.
  const [restingIndex, setRestingIndex] = useState(0);
  useEffect(() => {
    if (chatState !== "idle") return;
    const timer = setInterval(
      () => setRestingIndex((i) => (i + 1) % RESTING_MOODS.length),
      RESTING_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [chatState]);

  const mood: BloubMood =
    chatState === "needsYou"
      ? "surprised"
      : chatState === "working"
        ? "excited"
        : chatState === "typing"
          ? "curious"
          : RESTING_MOODS[restingIndex];

  return (
    // No top safe-area inset: the sheet is presented below the status bar, so
    // the window's inset would pad a gap that is already there. `insets.bottom`
    // is still used by the composer further down, where it is correct.
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* The way out, in both states.

          The sheet already dismisses on a downward drag, which the platform
          provides. This is the visible half of that: the old design's only
          signpost out lived in the empty state, so it vanished the moment a
          user sent their first message, which is exactly when they were most
          likely to need it. This one does not move.

          The face is the way into chat history, as the screen's title once was:
          in the empty state the big one is the tap target, and here the small
          one is, so history is reachable either way. */}
      {/* pt-3, not pt-1: the sheet has rounded top corners, and at 4px the
          pill collided with the curve. */}
      <View className="flex-row items-center px-4 pb-1.5 pt-3">
        <Pressable
          onPress={closeSalli}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close Salli"
          className="h-9 flex-row items-center gap-1 rounded-pill border-[1.5px] border-foreground bg-card px-2.5"
        >
          <ChevronDown size={14} color={colors.foreground} strokeWidth={2.5} />
          <Text className="font-mono text-[11px] uppercase tracking-widest text-foreground">
            Ledger &amp; tax
          </Text>
        </Pressable>

        <View className="flex-1 items-center">
          {messages.length > 0 ? (
            <Pressable
              onPress={openSessions}
              accessibilityRole="button"
              accessibilityLabel="Chat history"
              hitSlop={8}
            >
              <Bloub mood={mood} size={34} enterFrom={1.9} />
            </Pressable>
          ) : null}
        </View>

        {/* Balances the pill so the face sits centred rather than pushed right. */}
        <View className="w-[104px]" />
      </View>

      {/* No KeyboardAvoidingView: the composer lifts itself by the measured
          keyboard height. Inside a page sheet KAV pads against a frame that
          does not match the sheet, which is what hid the input in the first
          place, and leaving it here would fight the manual padding. */}
      <View className="flex-1">
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
                {STATE_CAPTION[chatState]}
              </Text>
              {/* No navigation copy here any more. The way out is a control at
                  the top of the sheet and a downward drag, both of which are
                  visible without being read, and both of which survive into a
                  conversation. */}
              <Text className="mt-2.5 px-6 text-center text-[15px] leading-[21px] text-muted-foreground">
                Your ledger, tax and goals are already here.
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList<ChatMessage>
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 14, gap: 14, ...chatColumnStyle }}
            // Only while the reply is still empty. Once the first token or the
            // first tool row lands, that content is the proof Salli is working
            // and a second indicator underneath it would be noise.
            ListFooterComponent={awaitingFirstToken ? <ThinkingIndicator /> : null}
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

        <View className="px-3.5 pt-2" style={{ paddingBottom: composerPadBottom }}>
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
      </View>

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
