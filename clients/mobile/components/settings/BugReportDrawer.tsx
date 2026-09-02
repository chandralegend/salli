import * as DocumentPicker from "expo-document-picker";
import { usePathname } from "expo-router";
import { Check, Paperclip, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Drawer } from "@/components/ui/drawer";
import { ChipSelect } from "@/components/ui/filter-chip";
import { ActionButton } from "@/components/ui/action-button";
import { TextField } from "@/components/ui/text-field";
import { MAX_ATTACHMENT_BYTES, useSubmitBugReport, type BugSeverity } from "@/hooks/useBugReport";
import { buildReportContext } from "@/lib/report-context";
import { useAppTheme, useThemeColors } from "@/lib/theme";

const SEVERITIES: BugSeverity[] = ["low", "medium", "high", "blocking"];
const SEVERITY_HINT: Record<BugSeverity, string> = {
  low: "Cosmetic or a minor annoyance",
  medium: "Harder to use, but I can work around it",
  high: "A feature is broken",
  blocking: "I can't use Salli at all",
};

// Mirrors the More-hub feature list + the screens reached outside it.
const AREAS = [
  "Dashboard",
  "Ledger",
  "Tax",
  "Freedom",
  "Budget",
  "Debt",
  "Portfolio",
  "Insurance",
  "Reports",
  "Statements",
  "Subscriptions",
  "Reminders",
  "Documents",
  "Audit Log",
  "Salli AI chat",
  "Settings",
  "Onboarding",
  "Other",
];

const DESCRIPTION_SCAFFOLD = `What did you do?
1.

What did you expect?

What happened instead?
`;

export function BugReportDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useThemeColors();
  const { isDark } = useAppTheme();
  const pathname = usePathname();
  const submit = useSubmitBugReport();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(DESCRIPTION_SCAFFOLD);
  const [severity, setSeverity] = useState<BugSeverity>("medium");
  const [area, setArea] = useState("Other");
  const [contactOk, setContactOk] = useState(true);
  const [attachment, setAttachment] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle("");
    setDescription(DESCRIPTION_SCAFFOLD);
    setSeverity("medium");
    setArea("Other");
    setContactOk(true);
    setAttachment(null);
    setError(null);
    submit.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Collected once per open, same object shown/sent — not recomputed at submit.
  const context = useMemo(() => buildReportContext(pathname ?? "", isDark ? "dark" : "light"), [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickAttachment = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["image/png", "image/jpeg"] });
    if (result.canceled) return;
    const file = result.assets[0];
    if (file.size && file.size > MAX_ATTACHMENT_BYTES) {
      setError("Screenshot is over 10 MB.");
      return;
    }
    setAttachment({ uri: file.uri, name: file.name, type: file.mimeType ?? "image/jpeg" });
  };

  const submitReport = () => {
    setError(null);
    if (!title.trim()) {
      setError("Give it a short title so we can tell reports apart.");
      return;
    }
    if (description.trim() === DESCRIPTION_SCAFFOLD.trim() || !description.trim()) {
      setError("Tell us what actually happened — the prompts above are just a guide.");
      return;
    }
    submit.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        severity,
        area: area === "Other" ? null : area,
        contactOk,
        attachment,
        context,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      title="Report a problem"
      footer={
        <>
          <ActionButton variant="accent" loading={submit.isPending} onPress={submitReport}>
            Send report
          </ActionButton>
          {error || submit.isError ? (
            <Text className="mt-2 text-center text-[14px] text-destructive">
              {error ?? "Couldn't send that report. Please try again."}
            </Text>
          ) : null}
        </>
      }
    >
      <Text className="mb-3 text-[15px] leading-5 text-muted-foreground">
        Tell us what went wrong. We attach a small technical snapshot — never your balances,
        amounts, or account names.
      </Text>

      <TextField className="mb-2.5" label="Title" value={title} onChangeText={setTitle} maxLength={200} placeholder="Statement upload fails on BOC PDFs" />

      <TextField
        className="mb-3"
        label="What happened?"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={6}
        style={{ minHeight: 110, textAlignVertical: "top" }}
      />

      <Text className="mb-2 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">How bad is it?</Text>
      <ChipSelect className="mb-1.5" options={SEVERITIES} value={severity} onChange={setSeverity} capitalize />
      <Text className="mb-3 text-[14px] text-muted-foreground">{SEVERITY_HINT[severity]}</Text>

      <Text className="mb-2 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Where in Salli?</Text>
      <ChipSelect className="mb-3" options={AREAS} value={area} onChange={setArea} />

      <Text className="mb-2 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Screenshot (optional)</Text>
      {attachment ? (
        <View className="mb-1 flex-row items-center gap-2 rounded-card border-2 border-foreground bg-card px-3.5 py-2.5">
          <Paperclip size={15} color={colors.mutedForeground} strokeWidth={2} />
          <Text className="flex-1 text-[15px] text-foreground/70" numberOfLines={1}>{attachment.name}</Text>
          <Pressable onPress={() => setAttachment(null)} hitSlop={8}>
            <X size={16} color={colors.mutedForeground} strokeWidth={2} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={pickAttachment}
          className="mb-1 flex-row items-center justify-center gap-2 rounded-card border border-dashed border-foreground/15 bg-card px-3.5 py-3"
        >
          <Paperclip size={15} color={colors.mutedForeground} strokeWidth={2} />
          <Text className="text-[15px] font-sans-medium text-foreground/50">Attach a screenshot</Text>
        </Pressable>
      )}
      <Text className="mb-3 text-[14px] leading-5 text-muted-foreground">
        Take a screenshot yourself and pick the file — Salli never captures your screen.
      </Text>

      <Pressable
        onPress={() => setContactOk((v) => !v)}
        className="mb-1 flex-row items-start justify-between gap-3 rounded-card border-2 border-foreground bg-card p-3"
      >
        <View className="flex-1">
          <Text className="text-[15px] font-sans-medium text-foreground">You can email me about this</Text>
          <Text className="mt-0.5 text-[14px] text-muted-foreground">
            We&apos;ll use the address on your account — it&apos;s never attached to the ticket.
          </Text>
        </View>
        <View
          className="mt-0.5 h-[20px] w-[20px] items-center justify-center rounded-badge border"
          style={{ backgroundColor: contactOk ? colors.accent : "transparent", borderColor: contactOk ? colors.accent : "rgba(128,128,128,0.35)" }}
        >
          {contactOk ? <Check size={15} color="#fff" strokeWidth={3} /> : null}
        </View>
      </Pressable>
    </Drawer>
  );
}
