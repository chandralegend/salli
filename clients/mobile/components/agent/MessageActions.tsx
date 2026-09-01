import * as Clipboard from "expo-clipboard";
import { Check, Copy } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

/**
 * The row of actions under an assistant message.
 *
 * Every mainstream AI chat puts these here, and for a concrete reason rather
 * than convention: assistant replies are the long, quotable half of the
 * conversation — a computed figure, an account code, an explanation worth
 * pasting elsewhere. Without a copy affordance the only route is a
 * long-press text selection, which on a multi-part markdown message selects
 * one block rather than the reply.
 *
 * Deliberately only copy for now. Regenerate would re-run the turn and spend
 * credits again, so it needs its own confirmation story, and a share sheet
 * duplicates what copy already gives.
 */
export function MessageActions({ text }: { text: string }) {
  const colors = useThemeColors();
  const [copied, setCopied] = useState(false);

  if (!text.trim()) return null;

  return (
    <View className="mt-1.5 flex-row">
      <Pressable
        onPress={async () => {
          await Clipboard.setStringAsync(text);
          // Confirms in place rather than via a toast. A toast would sit over
          // the composer and read as a system message in a chat surface.
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        hitSlop={8}
        accessibilityLabel={copied ? "Copied" : "Copy message"}
        className="h-7 w-7 items-center justify-center rounded-[7px]"
      >
        {copied ? (
          <Check size={14} color={colors.accent} strokeWidth={2.2} />
        ) : (
          <Copy size={14} color={colors.mutedForeground} strokeWidth={1.9} />
        )}
      </Pressable>
    </View>
  );
}
