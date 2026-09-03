import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Hero, Rule, SectionLabel, Strong } from "@/components/ui/blocks";
import { Drawer } from "@/components/ui/drawer";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useDeleteDocument, useDocuments, type SalliDocument } from "@/hooks/useDocuments";
import { confirmDestructive } from "@/lib/confirm";
import { formatDate } from "@/lib/format";
import { useHardShadow } from "@/lib/theme";

/**
 * What Salli has written down, in one scroll.
 *
 * The Documents/Memories tab pair became two labelled sections. They are two
 * namespaces of the same list — the tabs meant you could only ever see half of
 * a short list, and the search box above them filtered whichever half you were
 * looking at.
 */
export default function DocumentsScreen() {
  const documents = useDocuments();
  const deleteDoc = useDeleteDocument();
  const [viewing, setViewing] = useState<SalliDocument | null>(null);
  const shadow = useHardShadow();

  const all = documents.data ?? [];
  const memories = all.filter((d) => d.namespace === "memories");
  const notes = all.filter((d) => d.namespace !== "memories");

  const askDelete = (doc: SalliDocument) =>
    confirmDestructive({
      title: "Delete this?",
      message: `"${doc.title}" will be removed permanently.`,
      onConfirm: () => {
        deleteDoc.mutate(doc.id);
        setViewing(null);
      },
    });

  const section = (label: string, items: SalliDocument[]) =>
    items.length === 0 ? null : (
      <>
        <Rule />
        <SectionLabel>{label}</SectionLabel>
        <View className="mt-3 gap-[9px] px-5">
          {items.map((d) => (
            <AnimatedPressable
              key={d.id}
              onPress={() => setViewing(d)}
              press="sink"
              accessibilityRole="button"
              accessibilityLabel={`Open ${d.title}`}
              className="rounded-card border-2 border-foreground bg-card px-3.5 py-3"
            >
              <Text numberOfLines={1} className="font-sans-bold text-[16px] text-foreground">
                {d.title}
              </Text>
              <Text numberOfLines={1} className="mt-0.5 text-[13.5px] text-muted-foreground">
                {d.content}
              </Text>
              <Text className="mt-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {formatDate(d.created_at)} · {d.source.replace(/_/g, " ")}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
      </>
    );

  return (
    <PageShell header={<ScreenHeader title="Documents" back />}>
      <View className="px-5">
        {all.length === 0 ? (
          <>
            <Hero>Salli hasn&rsquo;t written anything down yet.</Hero>
            <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
              Ask it to save a note, or to remember something about your situation, and it will
              appear here.
            </Text>
          </>
        ) : (
          <Hero>
            Salli has saved{" "}
            <Strong>
              {notes.length} note{notes.length === 1 ? "" : "s"}
            </Strong>{" "}
            and{" "}
            <Strong>
              {memories.length}{" "}
              {memories.length === 1 ? "memory" : "memories"}
            </Strong>
            .
          </Hero>
        )}
      </View>

      {section("Notes", notes)}
      {section("Memories", memories)}
      <View className="h-7" />

      <Drawer visible={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.title ?? ""}>
        {viewing ? (
          <>
            <Text className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {formatDate(viewing.created_at)} · {viewing.source.replace(/_/g, " ")}
            </Text>
            <Text className="mt-3 text-[16px] leading-[23px] text-foreground">{viewing.content}</Text>
            {/* Delete lives here, behind a confirm. It used to be a 15px bin
                icon on every row that fired the mutation on the first tap —
                an unconfirmed, permanent delete inside a scrolling list. */}
            <Pressable
              onPress={() => askDelete(viewing)}
              disabled={deleteDoc.isPending}
              style={shadow}
              className="mt-6 h-12 flex-row items-center justify-center gap-2 rounded-card border-2 border-destructive bg-card"
            >
              <Trash2 size={17} color="#EF4444" strokeWidth={2} />
              <Text className="font-sans-bold text-[16px] text-destructive">
                {deleteDoc.isPending ? "Deleting…" : "Delete"}
              </Text>
            </Pressable>
          </>
        ) : null}
      </Drawer>
    </PageShell>
  );
}
