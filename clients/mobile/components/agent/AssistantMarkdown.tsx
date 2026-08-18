import Markdown from "react-native-markdown-display";

import { useThemeColors } from "@/lib/theme";

/** Renders an assistant text part as markdown (bold, lists, tables) rather than
 * raw text, matching the mockup's formatted responses. Shared by Pro Mode's
 * "Salli AI" tab and Buddy Mode's chat screen. */
export function AssistantMarkdown({ content }: { content: string }) {
  const colors = useThemeColors();
  return (
    <Markdown
      style={{
        body: { color: colors.foreground, fontSize: 13, lineHeight: 20, fontFamily: "Archivo_400Regular" },
        strong: { color: colors.foreground, fontFamily: "Archivo_600SemiBold" },
        em: { fontStyle: "italic" },
        bullet_list: { marginTop: 2 },
        ordered_list: { marginTop: 2 },
        list_item: { marginVertical: 1 },
        code_inline: {
          color: colors.foreground,
          backgroundColor: "rgba(127,127,127,0.15)",
          borderWidth: 0,
          borderRadius: 4,
          paddingHorizontal: 4,
          fontFamily: "Archivo_500Medium",
        },
        heading1: { color: colors.foreground, fontFamily: "Archivo_700Bold", fontSize: 15 },
        heading2: { color: colors.foreground, fontFamily: "Archivo_600SemiBold", fontSize: 14 },
        link: { color: colors.accent },
      }}
    >
      {content}
    </Markdown>
  );
}
