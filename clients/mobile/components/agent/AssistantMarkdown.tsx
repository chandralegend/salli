import { Text } from "react-native";
import Markdown from "react-native-markdown-display";

import { useThemeColors } from "@/lib/theme";

/** Renders an assistant text part as markdown (bold, lists, tables) rather than
 * raw text, matching the mockup's formatted responses. Shared by Pro Mode's
 * "Salli AI" tab and Buddy Mode's chat screen. */
export function AssistantMarkdown({ content }: { content: string }) {
  const colors = useThemeColors();
  return (
    <Markdown
      rules={{
        // The library's own `textgroup` renders a bare <Text>, so nothing in a
        // reply was selectable and copying needed a button of our own. With
        // `selectable` a long press brings up iOS's real menu — Copy, Select
        // All, Look Up, Share — which is both more capable than one button and
        // the gesture people already reach for.
        //
        // Overriding the rule rather than wrapping the reply in a selectable
        // <Text>: markdown renders a View tree with Text only at the leaves, so
        // a wrapper would apply to nothing.
        textgroup: (node, children, _parent, styles) => (
          <Text key={node.key} selectable style={styles.textgroup}>
            {children}
          </Text>
        ),
      }}
      style={{
        // 16.5/25 — `.msg-ai` in the mockup. This was 13/20, which is why
        // Buddy Mode still looked cramped after the app-wide type rescale:
        // these sizes are inline numbers, so no className sweep could reach
        // them. The assistant's reply is the main reading surface in the app.
        body: { color: colors.foreground, fontSize: 16.5, lineHeight: 25, fontFamily: "Archivo_400Regular" },
        strong: { color: colors.foreground, fontFamily: "Archivo_700Bold" },
        em: { fontStyle: "italic" },
        bullet_list: { marginTop: 2 },
        ordered_list: { marginTop: 2 },
        list_item: { marginVertical: 1 },
        code_inline: {
          color: colors.foreground,
          backgroundColor: "rgba(127,127,127,0.15)",
          borderWidth: 0,
          borderRadius: 4,
          paddingHorizontal: 5,
          fontSize: 15,
          fontFamily: "JetBrainsMono_400Regular",
        },
        heading1: { color: colors.foreground, fontFamily: "Archivo_800ExtraBold", fontSize: 20 },
        heading2: { color: colors.foreground, fontFamily: "Archivo_700Bold", fontSize: 18 },
        link: { color: colors.accent },
      }}
    >
      {content}
    </Markdown>
  );
}
