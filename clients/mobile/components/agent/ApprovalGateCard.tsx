import {
  Banknote,
  Calendar,
  Landmark,
  ShieldCheck,
  Tag,
  Type as TypeIcon,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useAccounts } from "@/hooks/useLedger";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

import { Drawer } from "../ui/drawer";

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

const ACTION_COPY: Record<string, { title: string; approveLabel: string }> = {
  post_journal_entry: { title: "Approval needed", approveLabel: "Approve entry" },
  create_account: { title: "Approval needed", approveLabel: "Approve account" },
  create_reminder: { title: "Approval needed", approveLabel: "Approve reminder" },
};
const FALLBACK_COPY = { title: "Approval needed", approveLabel: "Approve" };

type FieldRow = { icon: LucideIcon; label: string; value: string };

/** Inline write-tool approval gate. Every write (create_account, post_journal_entry,
 * create_reminder) pauses via the backend's interrupt() mechanism until the user
 * explicitly approves or denies here — this component is presentation only, the
 * non-execution-before-approval guarantee lives entirely in tools.py/resolveApproval. */
export function ApprovalGateCard({
  action,
  resolved,
  onResolve,
}: {
  action: Record<string, unknown>;
  resolved?: "approved" | "denied";
  onResolve: (d: "approved" | "denied") => void;
}) {
  const colors = useThemeColors();
  const accounts = useAccounts();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const actionType = String(action.action ?? action.type ?? action.tool ?? "action");
  const copy = ACTION_COPY[actionType] ?? FALLBACK_COPY;
  const params = (
    action.params && typeof action.params === "object" ? action.params : action
  ) as Record<string, unknown>;

  const accountLabel = (id: unknown): string => {
    const acc = accounts.data?.find((a) => a.id === id);
    return acc ? `${acc.code} – ${acc.name}` : String(id);
  };

  // The backend's own description string embeds raw account UUIDs verbatim
  // (it can't resolve names) — swap in real account names where we can.
  const rawDescription = typeof action.description === "string" ? action.description : "";
  const description = rawDescription.replace(UUID_RE, (id) => {
    const acc = accounts.data?.find((a) => a.id === id);
    return acc ? `${acc.code} – ${acc.name}` : id;
  });

  let fields: FieldRow[] = [];
  if (actionType === "post_journal_entry") {
    fields = [
      { icon: Banknote, label: "Amount", value: `${String(params.currency ?? "LKR")} ${String(params.amount ?? "")}` },
      { icon: Calendar, label: "Date", value: String(params.entry_date ?? "") },
      { icon: Landmark, label: "Debit", value: accountLabel(params.debit_account_id) },
      { icon: Landmark, label: "Credit", value: accountLabel(params.credit_account_id) },
    ];
  } else if (actionType === "create_account") {
    fields = [
      { icon: Tag, label: "Code", value: String(params.code ?? "") },
      { icon: TypeIcon, label: "Type", value: String(params.type ?? "") },
      { icon: Banknote, label: "Currency", value: String(params.currency ?? "") },
    ];
  } else if (actionType === "create_reminder") {
    fields = [{ icon: Calendar, label: "Due", value: String(params.due_date ?? "") }];
  } else {
    // Unknown/future action — generic fallback so a 4th write tool degrades
    // gracefully instead of showing nothing.
    fields = Object.entries(params)
      .filter(([k]) => !["type", "action", "tool", "params", "description"].includes(k))
      .map(([k, v]) => ({
        icon: Tag,
        label: k.replace(/_/g, " "),
        value: typeof v === "object" ? JSON.stringify(v) : String(v),
      }));
  }

  return (
    <View className="rounded-[12px] border border-foreground/[0.12] bg-card p-3.5">
      <View className="mb-2.5 flex-row items-start gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.08]">
          <ShieldCheck size={15} color={colors.accent} strokeWidth={2} />
        </View>
        <View className="flex-1">
          <Text className="font-sans-bold text-[14px] text-foreground">{copy.title}</Text>
          {description ? (
            <Text className="mt-0.5 text-[12px] leading-4 text-foreground/50">{description}</Text>
          ) : null}
        </View>
      </View>

      {fields.length ? (
        <View className="mb-3 gap-2 rounded-[8px] bg-foreground/[0.04] px-3 py-2.5">
          {fields.map((f) => (
            <View key={f.label} className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-1.5">
                <f.icon size={12} color={colors.mutedForeground} strokeWidth={2} />
                <Text className="text-[11px] capitalize text-foreground/40">{f.label}</Text>
              </View>
              <Text className="flex-1 text-right text-[12px] font-sans-medium text-foreground" numberOfLines={1}>
                {f.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {resolved ? (
        <Text
          className={cn(
            "text-center text-[12px] font-sans-semibold",
            resolved === "approved" ? "text-salli-accent" : "text-destructive",
          )}
        >
          {resolved === "approved" ? "Approved" : "Denied"}
        </Text>
      ) : (
        <>
          <Pressable onPress={() => setDetailsOpen(true)} className="mb-2 items-center py-1.5">
            <Text className="text-[12px] font-sans-medium text-foreground/40">Review details</Text>
          </Pressable>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => onResolve("denied")}
              className="h-[38px] flex-1 items-center justify-center rounded-[10px] border border-foreground/10 bg-foreground/[0.06]"
            >
              <Text className="font-sans-semibold text-[13px] text-foreground/45">Deny</Text>
            </Pressable>
            <Pressable
              onPress={() => onResolve("approved")}
              className="h-[38px] flex-1 items-center justify-center rounded-[10px] bg-salli-accent"
            >
              <Text className="font-sans-semibold text-[13px] text-white">{copy.approveLabel}</Text>
            </Pressable>
          </View>
        </>
      )}

      <Drawer visible={detailsOpen} onClose={() => setDetailsOpen(false)} title="Action details">
        <View className="gap-2 pb-2">
          {Object.entries(params).map(([k, v]) => (
            <View key={k} className="flex-row justify-between gap-3 border-b border-foreground/[0.06] pb-2">
              <Text className="text-[12px] capitalize text-foreground/40">{k.replace(/_/g, " ")}</Text>
              <Text className="flex-1 text-right text-[12px] font-sans-medium text-foreground">
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </Text>
            </View>
          ))}
        </View>
      </Drawer>
    </View>
  );
}
