import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Modal, ScrollView } from "react-native";
import Markdown from "react-native-markdown-display";
import { FileText, Brain, Search, Trash2, X, Upload } from "lucide-react-native";
import { ScreenShell, CardContainer } from "@/components/ui/page-shell";
import { TextField } from "@/components/ui/text-field";
import { useDocuments, type AgentDocument } from "@/hooks/useDocuments";
import { useThemeColors, useThemeVars } from "@/lib/theme";

const SOURCE_LABELS: Record<string, string> = {
  agent_created: "Agent",
  user_upload: "Upload",
  agent_memory: "Memory",
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function TabSwitch({
  tab,
  onChange,
}: {
  tab: "documents" | "memories";
  onChange: (t: "documents" | "memories") => void;
}) {
  const theme = useThemeColors();
  return (
    <View className="flex-row bg-muted rounded-full p-1 mb-4">
      {(["documents", "memories"] as const).map((t) => {
        const active = tab === t;
        const iconColor = active ? theme.primaryForeground : theme.mutedForeground;
        return (
          <Pressable
            key={t}
            onPress={() => onChange(t)}
            className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-full ${
              active ? "bg-primary" : ""
            }`}
          >
            {t === "documents" ? (
              <FileText size={13} color={iconColor} />
            ) : (
              <Brain size={13} color={iconColor} />
            )}
            <Text
              className={active ? "text-primary-foreground text-[13px]" : "text-muted-foreground text-[13px]"}
              style={{ fontFamily: "DMSans_700Bold" }}
            >
              {t === "documents" ? "Documents" : "Memories"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DocRow({
  doc,
  onView,
  onDelete,
}: {
  doc: AgentDocument;
  onView: (d: AgentDocument) => void;
  onDelete: (id: string) => void;
}) {
  const theme = useThemeColors();
  return (
    <Pressable
      onPress={() => onView(doc)}
      className="flex-row items-center gap-3 py-3 border-b border-border"
    >
      <View className="flex-1 min-w-0">
        <Text className="text-foreground text-[14px]" style={{ fontFamily: "DMSans_700Bold" }} numberOfLines={1}>
          {doc.title}
        </Text>
        {doc.description && (
          <Text className="text-muted-foreground text-[12px] mt-0.5" numberOfLines={1}>
            {doc.description}
          </Text>
        )}
        <View className="flex-row items-center gap-1.5 mt-1.5 flex-wrap">
          <View className="bg-muted border border-border rounded-full px-2 py-0.5">
            <Text className="text-[10px] text-muted-foreground">
              {SOURCE_LABELS[doc.source] ?? doc.source}
            </Text>
          </View>
          {(doc.tags ?? []).slice(0, 2).map((t) => (
            <View key={t} className="bg-muted border border-border rounded-full px-2 py-0.5">
              <Text className="text-[10px] text-muted-foreground">{t}</Text>
            </View>
          ))}
          <Text className="text-[10px] text-muted-foreground ml-auto">{fmtDate(doc.updated_at)}</Text>
        </View>
      </View>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onDelete(doc.id);
        }}
        hitSlop={8}
        className="w-8 h-8 rounded-full items-center justify-center active:bg-muted"
      >
        <Trash2 size={15} color={theme.mutedForeground} />
      </Pressable>
    </Pressable>
  );
}

function MemoryRow({ doc, onDelete }: { doc: AgentDocument; onDelete: (id: string) => void }) {
  const theme = useThemeColors();
  return (
    <View className="flex-row items-center gap-3 py-3 border-b border-border">
      <View className="flex-1 min-w-0">
        <Text className="text-muted-foreground text-[11px]" style={{ fontFamily: "DMSans_700Bold" }} numberOfLines={1}>
          {doc.slug ?? doc.title}
        </Text>
        <Text className="text-foreground text-[13px] mt-0.5" numberOfLines={2}>
          {doc.content ?? "—"}
        </Text>
        <Text className="text-[10px] text-muted-foreground mt-1">{fmtDate(doc.updated_at)}</Text>
      </View>
      <Pressable
        onPress={() => onDelete(doc.id)}
        hitSlop={8}
        className="w-8 h-8 rounded-full items-center justify-center active:bg-muted"
      >
        <Trash2 size={15} color={theme.mutedForeground} />
      </Pressable>
    </View>
  );
}

function EmptyState({ tab }: { tab: "documents" | "memories" }) {
  const theme = useThemeColors();
  return (
    <View className="items-center gap-2 py-10">
      {tab === "documents" ? (
        <FileText color={theme.mutedForeground} size={26} style={{ opacity: 0.4 }} />
      ) : (
        <Brain color={theme.mutedForeground} size={26} style={{ opacity: 0.4 }} />
      )}
      <Text className="text-[13px] font-medium text-foreground mt-1">
        {tab === "documents" ? "No documents yet" : "No memories yet"}
      </Text>
      <Text className="text-[12px] text-muted-foreground text-center px-6">
        {tab === "documents"
          ? "Ask the agent to save a note or upload a file in chat."
          : "Tell the agent to remember something and it will appear here."}
      </Text>
    </View>
  );
}

export default function DocumentsScreen() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"documents" | "memories">("documents");
  const [viewDoc, setViewDoc] = useState<AgentDocument | null>(null);
  const theme = useThemeColors();
  const themeVars = useThemeVars();

  const { documents: docsQuery, deleteDocument } = useDocuments({
    namespace: tab === "memories" ? "memories" : "documents",
    search: search || undefined,
  });

  const docs = docsQuery.data ?? [];

  const markdownStyles = {
    body: { color: theme.foreground, fontSize: 13, lineHeight: 20 },
    heading1: { color: theme.foreground, fontSize: 20, fontWeight: "700" as const, marginTop: 8, marginBottom: 6 },
    heading2: { color: theme.foreground, fontSize: 17, fontWeight: "700" as const, marginTop: 8, marginBottom: 6 },
    heading3: { color: theme.foreground, fontSize: 15, fontWeight: "700" as const, marginTop: 6, marginBottom: 4 },
    link: { color: theme.foreground, textDecorationLine: "underline" as const },
    code_inline: {
      backgroundColor: theme.muted,
      color: theme.foreground,
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    code_block: {
      backgroundColor: theme.muted,
      color: theme.foreground,
      padding: 10,
      borderRadius: 10,
    },
    fence: {
      backgroundColor: theme.muted,
      color: theme.foreground,
      padding: 10,
      borderRadius: 10,
    },
    blockquote: {
      backgroundColor: theme.muted,
      borderLeftColor: theme.border,
      borderLeftWidth: 3,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    hr: { backgroundColor: theme.border, height: 1 },
    table: { borderColor: theme.border },
    th: { borderColor: theme.border, padding: 6 },
    td: { borderColor: theme.border, padding: 6 },
  };

  return (
    <ScreenShell edges={["left", "right"]}>
      <TabSwitch tab={tab} onChange={setTab} />

      <View className="relative mb-4">
        <View className="absolute left-3.5 top-0 bottom-0 justify-center z-10">
          <Search size={15} color={theme.mutedForeground} />
        </View>
        <TextField
          className="pl-10"
          placeholder="Search title and content…"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <CardContainer>
        {docsQuery.isLoading ? (
          <ActivityIndicator color={theme.foreground} />
        ) : docs.length === 0 ? (
          <EmptyState tab={tab} />
        ) : tab === "documents" ? (
          <View>
            {docs.map((d) => (
              <DocRow
                key={d.id}
                doc={d}
                onView={setViewDoc}
                onDelete={(id) => deleteDocument.mutate(id)}
              />
            ))}
          </View>
        ) : (
          <View>
            {docs.map((d) => (
              <MemoryRow key={d.id} doc={d} onDelete={(id) => deleteDocument.mutate(id)} />
            ))}
          </View>
        )}
      </CardContainer>

      <Modal
        visible={!!viewDoc}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setViewDoc(null)}
      >
        <View className="flex-1 bg-background" style={themeVars}>
          <View className="flex-row items-start justify-between p-5 border-b border-border">
            <View className="flex-1 pr-3">
              <Text className="text-foreground text-[16px]" style={{ fontFamily: "DMSans_900Black" }}>
                {viewDoc?.title}
              </Text>
              <View className="flex-row items-center gap-1.5 mt-2 flex-wrap">
                {viewDoc && (
                  <View className="bg-muted border border-border rounded-full px-2 py-0.5">
                    <Text className="text-[10px] text-muted-foreground">
                      {SOURCE_LABELS[viewDoc.source] ?? viewDoc.source}
                    </Text>
                  </View>
                )}
                {(viewDoc?.tags ?? []).map((t) => (
                  <View key={t} className="bg-muted border border-border rounded-full px-2 py-0.5">
                    <Text className="text-[10px] text-muted-foreground">{t}</Text>
                  </View>
                ))}
                {viewDoc && (
                  <Text className="text-[11px] text-muted-foreground">{fmtDate(viewDoc.updated_at)}</Text>
                )}
              </View>
            </View>
            <Pressable
              onPress={() => setViewDoc(null)}
              hitSlop={8}
              className="w-8 h-8 rounded-full bg-muted items-center justify-center"
            >
              <X size={16} color={theme.foreground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {viewDoc?.content ? (
              <Markdown style={markdownStyles}>{viewDoc.content}</Markdown>
            ) : (
              <View className="flex-row items-center justify-center py-10">
                <Upload size={18} color={theme.mutedForeground} style={{ opacity: 0.5, marginRight: 8 }} />
                <Text className="text-muted-foreground text-[13px]">
                  Binary file — content not previewable
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScreenShell>
  );
}
