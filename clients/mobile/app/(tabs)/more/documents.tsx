import { Book, FileText, Search, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Tabs } from "@/components/ui/tabs";
import { useDeleteDocument, useDocuments, type SalliDocument } from "@/hooks/useDocuments";
import { useThemeColors } from "@/lib/theme";

const TABS = ["Documents", "Memories"] as const;

export default function DocumentsScreen() {
  const colors = useThemeColors();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Documents");
  const documents = useDocuments();
  const deleteDoc = useDeleteDocument();
  const [viewing, setViewing] = useState<SalliDocument | null>(null);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filtered = (documents.data ?? [])
    .filter((d) => (tab === "Memories" ? d.namespace === "memories" : d.namespace !== "memories"))
    .filter((d) => !q || d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));

  return (
    <PageShell
      animateOn={tab}
      header={
        <>
          <ScreenHeader title="Documents" back />
          <Tabs items={TABS} value={tab} onChange={setTab} className="mt-3" />
        </>
      }
    >

      <View className="mt-3 flex-row items-center gap-2 px-4">
        <View className="h-[38px] flex-1 flex-row items-center gap-2 rounded-[10px] border border-foreground/[0.08] bg-card px-3">
          <Search size={15} color="rgba(128,128,128,0.4)" strokeWidth={2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search..."
            placeholderTextColor="rgba(128,128,128,0.4)"
            className="flex-1 text-[15px] text-foreground"
          />
        </View>
      </View>

      <View className="gap-1.5 px-4 pt-3">
        {filtered.length === 0 ? (
          <Card className="items-center p-6">
            <Text className="text-center text-[15px] text-foreground/35">
              {tab === "Memories" ? "Tell the agent to remember something…" : "Ask the agent to save a note…"}
            </Text>
          </Card>
        ) : (
          filtered.map((d) => (
            <Pressable key={d.id} onPress={() => setViewing(d)}>
              <Card className="flex-row items-center gap-2.5 p-3.5">
                <View className="h-9 w-9 items-center justify-center rounded-[8px] bg-foreground/[0.06]">
                  {tab === "Memories" ? (
                    <Book size={16} color={colors.mutedForeground} strokeWidth={2} />
                  ) : (
                    <FileText size={16} color={colors.mutedForeground} strokeWidth={2} />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="font-sans-semibold text-[15px] text-foreground">{d.title}</Text>
                  <Text numberOfLines={1} className="text-[14px] text-foreground/30">
                    {d.content}
                  </Text>
                  <Text className="mt-0.5 text-[13px] text-foreground/20">{d.created_at?.slice(0, 10)}</Text>
                </View>
                <View className="items-end">
                  <View className="rounded-[5px] bg-foreground/[0.07] px-2 py-0.5">
                    <Text className="text-[13px] font-sans-medium capitalize text-foreground/40">{d.source.replace("_", " ")}</Text>
                  </View>
                  <Pressable onPress={() => deleteDoc.mutate(d.id)} className="mt-1.5">
                    <Trash2 size={15} color={colors.mutedForeground} strokeWidth={2} />
                  </Pressable>
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </View>

      <Drawer visible={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.title ?? ""}>
        <Text className="text-[15px] leading-5 text-foreground">{viewing?.content}</Text>
        <Pressable onPress={() => setViewing(null)} className="mt-6 items-center rounded-pill border border-foreground/10 bg-card py-3">
          <Text className="text-[15px] font-sans-medium text-foreground/50">Close</Text>
        </Pressable>
      </Drawer>
    </PageShell>
  );
}
