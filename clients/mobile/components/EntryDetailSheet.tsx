import { Lock, RotateCcw, Share2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Share, Text, View } from "react-native";

import { Drawer } from "@/components/ui/drawer";
import type { Account, JournalEntry } from "@/hooks/useDashboard";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";
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
    first,
  }: {
    kind: "Debit" | "Credit";
    posting?: JournalEntry["postings"][number];
    first?: boolean;
  }) => {
    const a = acct(posting?.account_id);
    const strong = kind === "Debit";
    return (
      <View
        className={cn(
          "flex-row items-center gap-2.5 border border-foreground/[0.08] bg-card px-3.5 py-3",
          first ? "rounded-t-[14px] border-b-0" : "rounded-b-[14px]",
        )}
      >
        <View className={cn("h-[38px] w-[3px] rounded-pill", strong ? "bg-salli-accent" : "bg-foreground/15")} />
        <View className="flex-1">
          <Text className="mb-0.5 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/30">
            {kind} · {a?.type ?? "—"}
          </Text>
          <Text className="font-sans-semibold text-[13px] text-foreground">
            {a ? `${a.code} · ${a.name}` : "—"}
          </Text>
        </View>
        <Text className={cn("font-sans-bold text-[13px]", strong ? "text-foreground" : "text-foreground/60")}>
          Rs. {formatLKR(posting?.amount ?? "0", 0)}
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
              "h-[50px] flex-1 flex-row items-center justify-center gap-2 rounded-pill border border-foreground/10 bg-card",
              (reversed || reversing) && "opacity-40",
            )}
          >
            <RotateCcw size={15} color={colors.mutedForeground} strokeWidth={2} />
            <Text className="font-sans-semibold text-[14px] text-foreground/60">
              {reversed ? "Reversed" : reversing ? "Reversing…" : "Reverse"}
            </Text>
          </Pressable>
          <Pressable onPress={handleShare} className="h-[50px] flex-1 flex-row items-center justify-center gap-2 rounded-pill bg-primary">
            <Share2 size={15} color={colors.primaryForeground} strokeWidth={2} />
            <Text className="font-sans-semibold text-[14px] text-primary-foreground">Share</Text>
          </Pressable>
        </View>
      }
    >
      <View className="mb-3 flex-row justify-end">
        <View className="rounded-[4px] bg-foreground/[0.07] px-2 py-0.5">
          <Text className="text-[10px] font-sans-medium capitalize text-foreground/40">
            {reversed ? "reversed" : entry?.source}
          </Text>
        </View>
      </View>

      {/* amount hero */}
      <View className="mb-3 rounded-[18px] border border-foreground/[0.08] bg-salli-navy-card p-[18px]">
        <Text className="mb-1.5 text-[10px] font-sans-medium uppercase tracking-wide text-white/40" numberOfLines={1}>
          {entry?.description}
        </Text>
        <View className="mb-1.5 flex-row items-baseline gap-1.5">
          <Text className="font-sans-semibold text-[18px] text-white/35">Rs.</Text>
          <Text className="font-sans-extrabold text-[38px] leading-none tracking-tighter text-white">
            {formatLKRAbbrev(amount)}
          </Text>
        </View>
        <Text className="text-[11px] text-white/30">
          {entry?.entry_date}
          {entry?.external_ref ? ` · Ref ${entry.external_ref}` : ""}
        </Text>
      </View>

      <Text className="mb-1.5 pl-0.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
        Double-Entry Postings
      </Text>
      <View className="mb-3">
        <Posting kind="Debit" posting={debit} first />
        <Posting kind="Credit" posting={credit} />
      </View>

      <View className="flex-row items-start gap-2 rounded-[12px] border border-foreground/[0.06] bg-foreground/[0.04] px-3.5 py-2.5">
        <Lock size={13} color={colors.mutedForeground} strokeWidth={2} style={{ marginTop: 1 }} />
        <Text className="flex-1 text-[11px] leading-4 text-foreground/30">
          Posted entries are immutable · correct via a reversing entry
        </Text>
      </View>
    </Drawer>
  );
}
