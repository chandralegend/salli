import { RotateCcw, Share2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Share, Text, View } from "react-native";

import { TagPicker } from "@/components/ledger/TagPicker";
import { Drawer } from "@/components/ui/drawer";
import { PostingChip } from "@/components/ui/posting-chip";
import type { Account, JournalEntry } from "@/hooks/useDashboard";
import { formatLKR } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Entry Detail bottom sheet — amount hero + double-entry postings + reverse.
 * Posted entries are immutable; the only mutation is a reversing entry. */
export function EntryDetailSheet({
  entry,
  accounts,
  onClose,
  onReverse,
}: {
  entry: JournalEntry | null;
  accounts: Account[];
  onClose: () => void;
  onReverse: (id: string) => Promise<void> | void;
}) {
  const colors = useThemeColors();
  const [reversing, setReversing] = useState(false);

  const acct = (id?: string) => accounts.find((a) => a.id === id);
  const debit = entry?.postings.find((p) => p.direction === 1);
  const credit = entry?.postings.find((p) => p.direction === -1);
  const reversed = Boolean(entry?.reversed_by);
  const amount = debit?.amount ?? "0";

  // Tags describe what the money was for, so they belong on the expense or
  // income side — not the bank account the money moved through. A transfer
  // between two asset accounts has no such side and simply isn't classifiable.
  const classifiable = entry?.postings.find((p) => {
    const t = acct(p.account_id)?.type;
    return t === "expense" || t === "income";
  });

  const handleReverse = async () => {
    if (!entry) return;
    setReversing(true);
    try {
      await onReverse(entry.id);
      onClose();
    } finally {
      setReversing(false);
    }
  };

  const handleShare = () => {
    if (!entry) return;
    const dr = acct(debit?.account_id);
    const cr = acct(credit?.account_id);
    Share.share({
      message:
        `${entry.description} — Rs. ${formatLKR(amount, 0)} (${entry.entry_date})\n` +
        `DR ${dr?.code} ${dr?.name} · CR ${cr?.code} ${cr?.name}`,
    }).catch(() => {});
  };

  const Posting = ({
    kind,
    posting,
  }: {
    kind: "Debit" | "Credit";
    posting?: JournalEntry["postings"][number];
  }) => {
    const a = acct(posting?.account_id);
    // Two separate flat cards led by a DR/CR chip, as the mockup has it — not
    // one joined block with a colour rail. The chip states the side in the
    // ledger's own vocabulary; the rail only hinted at it, and "Debit ·
    // expense" spent a whole mono line saying what the chip says in two
    // characters.
    return (
      <View className="flex-row items-center gap-3 rounded-card border-2 border-foreground bg-card px-3.5 py-3">
        <PostingChip side={kind === "Debit" ? "DR" : "CR"} />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="font-sans-bold text-[16px] text-foreground">
            {a?.name ?? "—"}
          </Text>
          <Text className="mt-0.5 text-[13.5px] text-muted-foreground">
            {a ? `${a.code} · ${a.type}` : "—"}
          </Text>
        </View>
        <Text className="shrink-0 font-sans-extrabold text-[16px] text-foreground">
          {formatLKR(posting?.amount ?? "0", 2)}
        </Text>
      </View>
    );
  };

  return (
    <Drawer
      visible={Boolean(entry)}
      onClose={onClose}
      title="Entry Detail"
      keyboardAvoiding={false}
      footer={
        <View className="flex-row gap-2">
          <Pressable
            onPress={handleReverse}
            disabled={reversed || reversing}
            className={cn(
              "h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-card border-2 border-foreground bg-card",
              (reversed || reversing) && "opacity-40",
            )}
          >
            <RotateCcw size={19} color={colors.accent} strokeWidth={2} />
            <Text className="font-sans-bold text-[17px] text-salli-accent">
              {reversed ? "Reversed" : reversing ? "Reversing…" : "Reverse"}
            </Text>
          </Pressable>
          <Pressable onPress={handleShare} className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-card border-2 border-foreground bg-primary">
            <Share2 size={19} color={colors.primaryForeground} strokeWidth={2} />
            <Text className="font-sans-bold text-[17px] text-primary-foreground">Share</Text>
          </Pressable>
        </View>
      }
    >
      {/* Description, meta, then the figure as plain text on the sheet — no
          dark hero card. The mockup drops it, and it was doing the same job
          twice: the amount is already the largest thing here, so wrapping it
          in an inverted block made a summary out of a detail view. Source and
          reversal state move into the meta line instead of a floating badge. */}
      <Text className="font-sans-extrabold text-[21px] text-foreground" style={{ letterSpacing: -0.4 }}>
        {entry?.description}
      </Text>
      <Text className="mt-1 text-[13.5px] text-muted-foreground">
        {entry?.entry_date} · {entry?.source}
        {entry?.external_ref ? ` · ref ${entry.external_ref}` : ""}
        {reversed ? " · reversed" : ""}
      </Text>

      <Text className="mt-5 font-sans-extrabold text-[38px] text-foreground" style={{ letterSpacing: -1.5 }}>
        Rs. {formatLKR(String(amount), 2)}
      </Text>

      <View className="my-5 h-px bg-foreground/15" />

      <Text className="mb-3 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
        Postings
      </Text>
      <View className="gap-3">
        <Posting kind="Debit" posting={debit} />
        <Posting kind="Credit" posting={credit} />
      </View>

      {/* Separated by a rule and sitting directly on the sheet, like every
          other section here. Boxed in its own card it read as a third posting
          and butted straight up against the credit row above it. */}
      {classifiable?.id && !reversed ? (
        <>
          <View className="my-5 h-px bg-foreground/15" />
          <TagPicker
            key={classifiable.id}
            postingId={classifiable.id}
            value={classifiable.tags ?? {}}
          />
        </>
      ) : null}

      {/* A centred footnote, per the mockup, rather than a boxed callout with a
          padlock. The rule it states is permanent and applies to every entry,
          so it is context — not a warning that needs its own container. Tags
          are the deliberate exception: amounts never change, but a
          miscategorised expense has to be fixable. */}
      <Text className="mt-5 text-center text-[13.5px] leading-5 text-muted-foreground">
        Posted entries are never edited — a reversal is the correction. Tags stay
        editable.
      </Text>
    </Drawer>
  );
}
