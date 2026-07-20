import { AlertTriangle, Pencil, Plus, Shield, Trash2, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { TextField } from "@/components/ui/text-field";
import {
  type Policy,
  useAddPolicy,
  useCoverageReport,
  useInsuranceMutations,
  usePolicies,
  useTargets,
  useUpdatePolicy,
} from "@/hooks/useInsurance";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";
import { useThemeColors, useThemeVars } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TABS = ["Policies", "Targets", "Coverage Report"] as const;

/** Policy types the backend accepts (String(20), free-form; CLI documents these). */
const POLICY_TYPES = ["life", "health", "motor", "property", "other"] as const;

/** Premium payment cadences the backend accepts (free-form string). */
const PREMIUM_FREQUENCIES = ["monthly", "quarterly", "yearly"] as const;

export default function InsuranceScreen() {
  const colors = useThemeColors();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Policies");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Policy | null>(null);
  const policies = usePolicies();
  const targets = useTargets();
  const report = useCoverageReport();
  const { deletePolicy, deleteTarget } = useInsuranceMutations();

  const openAdd = () => {
    setEditing(null);
    setDrawerOpen(true);
  };
  const openEdit = (p: Policy) => {
    setEditing(p);
    setDrawerOpen(true);
  };
  const confirmDelete = (p: Policy) => {
    Alert.alert("Delete policy", `Delete "${p.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePolicy.mutate(p.id) },
    ]);
  };

  const activePolicies = (policies.data ?? []).filter((p) => p.is_active);
  const totalCoverage = activePolicies.reduce((s, p) => s + Number(p.coverage_amount), 0);
  const totalTarget = (targets.data ?? []).reduce((s, t) => s + Number(t.target_amount), 0);
  const totalGap = (report.data?.lines ?? []).reduce((s, l) => s + Math.max(0, Number(l.gap)), 0);
  const gapFree = totalTarget > 0 && totalGap <= 0;

  return (
    <View className="flex-1">
      <PageShell>
        <ScreenHeader
          title="Insurance"
          back
          trailing={
            <Pressable
              onPress={openAdd}
              className="h-[34px] w-[34px] items-center justify-center rounded-full bg-salli-accent"
            >
              <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          }
        />

        {/* hero — coverage vs gap */}
        <View className="px-4 pt-3">
          <Card className="bg-salli-navy-card p-[18px]">
            <Text className="mb-1.5 text-[11px] font-sans-medium uppercase tracking-wide text-white/50">
              Total Coverage
            </Text>
            <View className="mb-1 flex-row items-baseline gap-1">
              <Text className="font-sans-semibold text-[18px] text-white/40">Rs.</Text>
              <Text className="font-sans-extrabold text-[40px] leading-none tracking-tighter text-white">
                {formatLKRAbbrev(totalCoverage)}
              </Text>
            </View>
            <View className="mb-3.5 flex-row">
              <View
                className={cn(
                  "rounded-pill border px-2.5 py-0.5",
                  gapFree
                    ? "border-salli-accent/20 bg-salli-accent/15"
                    : "border-destructive/25 bg-destructive/10",
                )}
              >
                <Text
                  className={cn(
                    "text-[11px] font-sans-semibold",
                    gapFree ? "text-salli-accent" : "text-destructive",
                  )}
                >
                  {totalTarget === 0
                    ? "No targets set"
                    : gapFree
                      ? "Fully covered"
                      : `Rs. ${formatLKRAbbrev(totalGap)} gap`}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-1.5">
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Policies</Text>
                <Text className="font-sans-bold text-[13px] text-white">{activePolicies.length}</Text>
              </View>
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Target</Text>
                <Text className="font-sans-bold text-[13px] text-white">Rs. {formatLKRAbbrev(totalTarget)}</Text>
              </View>
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Gap</Text>
                <Text className={cn("font-sans-bold text-[13px]", totalGap > 0 ? "text-destructive" : "text-salli-accent")}>
                  Rs. {formatLKRAbbrev(totalGap)}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <View className="mx-4 mt-3 flex-row border-b border-foreground/[0.08]">
          {TABS.map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} className={cn("px-3.5 py-2", tab === t && "border-b-2 border-salli-accent")}>
              <Text className={cn("text-[13px]", tab === t ? "font-sans-semibold text-foreground" : "font-sans-medium text-foreground/35")}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === "Policies" ? (
          <View className="gap-1.5 px-4 pt-3">
            {activePolicies.length === 0 ? (
              <Card className="items-center p-6">
                <Text className="text-[13px] text-foreground/35">No policies yet.</Text>
              </Card>
            ) : (
              activePolicies.map((p) => (
                <Pressable key={p.id} onPress={() => openEdit(p)}>
                  <Card className="flex-row items-center gap-2.5 p-3.5">
                    <View className="h-9 w-9 items-center justify-center rounded-[11px] border border-salli-accent/20 bg-salli-accent/[0.12]">
                      <Shield size={15} color={colors.accent} strokeWidth={2} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-[13px] text-foreground">{p.name}</Text>
                      <Text className="text-[11px] capitalize text-foreground/30">
                        {p.policy_type} · {p.provider} · expires {p.expiry_date}
                      </Text>
                    </View>
                    <View className="items-end gap-1.5">
                      <Text className="font-sans-semibold text-[13px] text-foreground">Rs. {formatLKRAbbrev(p.coverage_amount)}</Text>
                      <View className="flex-row items-center gap-3">
                        <Pressable onPress={() => openEdit(p)} hitSlop={8}>
                          <Pencil size={13} color={colors.mutedForeground} strokeWidth={2} />
                        </Pressable>
                        <Pressable onPress={() => confirmDelete(p)} hitSlop={8}>
                          <Trash2 size={13} color={colors.mutedForeground} strokeWidth={2} />
                        </Pressable>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        {tab === "Targets" ? (
          <View className="gap-1.5 px-4 pt-3">
            {(targets.data ?? []).length === 0 ? (
              <Card className="items-center p-6">
                <Text className="text-[13px] text-foreground/35">No coverage targets declared.</Text>
              </Card>
            ) : (
              (targets.data ?? []).map((t) => (
                <Card key={t.policy_type} className="flex-row items-center justify-between p-3.5">
                  <Text className="font-sans-semibold text-[13px] capitalize text-foreground">{t.policy_type}</Text>
                  <View className="flex-row items-center gap-3">
                    <Text className="font-sans-semibold text-[13px] text-foreground">Rs. {formatLKRAbbrev(t.target_amount)}</Text>
                    <Pressable onPress={() => deleteTarget.mutate(t.policy_type)}>
                      <Trash2 size={13} color={colors.mutedForeground} strokeWidth={2} />
                    </Pressable>
                  </View>
                </Card>
              ))
            )}
          </View>
        ) : null}

        {tab === "Coverage Report" ? (
          <View className="gap-2.5 px-4 pt-3">
            {report.data?.lines.length ? (
              <View className="gap-1.5">
                {report.data.lines.map((line, i) => {
                  const target = Number(line.target_amount);
                  const actual = Number(line.actual_coverage);
                  const gap = Number(line.gap);
                  const pct = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
                  const covered = gap <= 0;
                  return (
                    <Card key={i} className="p-3.5">
                      <View className="mb-2 flex-row items-center justify-between">
                        <Text className="font-sans-semibold text-[13px] capitalize text-foreground">{line.policy_type}</Text>
                        <Text className={cn("font-sans-semibold text-[12px]", covered ? "text-salli-accent" : "text-destructive")}>
                          {covered ? "Covered" : `Gap Rs. ${formatLKR(gap, 0)}`}
                        </Text>
                      </View>
                      <View className="mb-1.5 h-1.5 overflow-hidden rounded-pill bg-foreground/[0.08]">
                        <View
                          className={cn("h-full rounded-pill", covered ? "bg-salli-accent" : "bg-destructive")}
                          style={{ width: `${pct}%` }}
                        />
                      </View>
                      <Text className="text-[11px] text-foreground/30">
                        Rs. {formatLKRAbbrev(actual)} of Rs. {formatLKRAbbrev(target)} target
                      </Text>
                    </Card>
                  );
                })}
              </View>
            ) : (
              <Card className="items-center p-6">
                <Text className="text-[13px] text-foreground/35">No coverage targets declared.</Text>
              </Card>
            )}

            {(report.data?.missing_types.length ?? 0) > 0 ? (
              <Card className="flex-row items-start gap-2 border-destructive/25 bg-destructive/5 p-3.5">
                <AlertTriangle size={14} color="#EF4444" strokeWidth={2} />
                <Text className="flex-1 text-[12px] capitalize text-destructive">
                  Missing coverage: {report.data!.missing_types.join(", ")}
                </Text>
              </Card>
            ) : null}

            {(report.data?.expiring_soon.length ?? 0) > 0 ? (
              <Card className="overflow-hidden p-0">
                <View className="border-b border-foreground/[0.06] px-4 py-3">
                  <Text className="font-sans-semibold text-[13px] text-foreground">Expiring Soon</Text>
                </View>
                {report.data!.expiring_soon.map((e, i) => (
                  <View
                    key={i}
                    className={cn(
                      "flex-row items-center justify-between px-4 py-3",
                      i < report.data!.expiring_soon.length - 1 && "border-b border-foreground/[0.05]",
                    )}
                  >
                    <Text className="text-[13px] text-foreground">{e.policy_name}</Text>
                    <Text className={cn("text-[12px]", e.days_until_expiry <= 30 ? "text-destructive" : "text-foreground/40")}>
                      {e.days_until_expiry} days
                    </Text>
                  </View>
                ))}
              </Card>
            ) : null}
          </View>
        ) : null}
      </PageShell>

      <AddEditPolicyDrawer
        visible={drawerOpen}
        policy={editing}
        onClose={() => setDrawerOpen(false)}
      />
    </View>
  );
}

/** Add / Edit policy bottom-sheet — reused for both flows. On edit it prefills
 * from the passed policy and PATCHes only the fields; on add it POSTs a full
 * PolicyRequest. Theme-aware (bg-background / bg-card / text-foreground). */
function AddEditPolicyDrawer({
  visible,
  policy,
  onClose,
}: {
  visible: boolean;
  policy: Policy | null;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const themeVars = useThemeVars();
  const addPolicy = useAddPolicy();
  const updatePolicy = useUpdatePolicy();
  const isEdit = policy !== null;

  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [policyType, setPolicyType] = useState<string>("life");
  const [frequency, setFrequency] = useState<string>("yearly");
  const [coverage, setCoverage] = useState("");
  const [premium, setPremium] = useState("");
  const [expiry, setExpiry] = useState("");

  // Prefill (edit) or clear (add) whenever the sheet opens / target changes.
  useEffect(() => {
    if (!visible) return;
    if (policy) {
      setName(policy.name);
      setProvider(policy.provider);
      setPolicyType(policy.policy_type);
      setCoverage(String(policy.coverage_amount));
      setPremium(String(policy.premium_amount));
      setExpiry(policy.expiry_date);
      setFrequency("yearly");
    } else {
      setName("");
      setProvider("");
      setPolicyType("life");
      setFrequency("yearly");
      setCoverage("");
      setPremium("");
      setExpiry("");
    }
  }, [visible, policy]);

  const coverageNum = Number(coverage) || 0;
  const premiumNum = Number(premium) || 0;

  const canSubmit = Boolean(
    name.trim() && provider.trim() && policyType && frequency && coverage && premium && expiry.trim(),
  );
  const pending = addPolicy.isPending || updatePolicy.isPending;
  const isError = addPolicy.isError || updatePolicy.isError;

  const submit = () => {
    if (!canSubmit) return;
    if (isEdit && policy) {
      updatePolicy.mutate(
        {
          id: policy.id,
          body: {
            name: name.trim(),
            provider: provider.trim(),
            policy_type: policyType,
            coverage_amount: coverageNum,
            premium_amount: premiumNum,
            premium_frequency: frequency,
            expiry_date: expiry.trim(),
          },
        },
        { onSuccess: onClose },
      );
    } else {
      addPolicy.mutate(
        {
          name: name.trim(),
          provider: provider.trim(),
          policy_type: policyType,
          coverage_amount: coverageNum,
          premium_amount: premiumNum,
          premium_frequency: frequency,
          expiry_date: expiry.trim(),
        },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable
            onPress={() => {}}
            style={themeVars}
            className="max-h-[88%] rounded-t-[28px] border-t border-foreground/10 bg-background px-4 pb-8 pt-2.5"
          >
            <View className="items-center pb-1">
              <View className="h-1 w-10 rounded-full bg-foreground/20" />
            </View>
            <View className="flex-row items-center px-0.5 pb-3.5 pt-1.5">
              <Text className="flex-1 font-sans-bold text-[18px] text-foreground">
                {isEdit ? "Edit Policy" : "New Policy"}
              </Text>
              <Pressable onPress={onClose} className="h-[30px] w-[30px] items-center justify-center rounded-full bg-foreground/[0.08]">
                <X size={14} color={colors.mutedForeground} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <TextField
                className="mb-2.5"
                label="Policy Name *"
                value={name}
                onChangeText={setName}
                placeholder="Family Life Cover"
              />
              <TextField
                className="mb-3"
                label="Provider *"
                value={provider}
                onChangeText={setProvider}
                placeholder="Ceylinco Life"
              />

              {/* policy type chips */}
              <Text className="mb-2 pl-0.5 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/40">
                Policy Type *
              </Text>
              <View className="mb-3 flex-row flex-wrap gap-1.5">
                {POLICY_TYPES.map((pt) => (
                  <Pressable
                    key={pt}
                    onPress={() => setPolicyType(pt)}
                    className={cn(
                      "rounded-pill px-3.5 py-1.5",
                      policyType === pt ? "bg-salli-accent" : "border border-foreground/10 bg-card",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-[12px] capitalize",
                        policyType === pt ? "font-sans-semibold text-white" : "font-sans-medium text-foreground/50",
                      )}
                    >
                      {pt}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* coverage + premium */}
              <View className="mb-3 flex-row gap-2">
                <TextField
                  className="flex-1"
                  label="Coverage *"
                  value={coverage}
                  onChangeText={setCoverage}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
                <TextField
                  className="flex-1"
                  label="Premium *"
                  value={premium}
                  onChangeText={setPremium}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>

              {/* premium frequency chips */}
              <Text className="mb-2 pl-0.5 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/40">
                Premium Frequency *
              </Text>
              <View className="mb-3 flex-row flex-wrap gap-1.5">
                {PREMIUM_FREQUENCIES.map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setFrequency(f)}
                    className={cn(
                      "rounded-pill px-3.5 py-1.5",
                      frequency === f ? "bg-salli-accent" : "border border-foreground/10 bg-card",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-[12px] capitalize",
                        frequency === f ? "font-sans-semibold text-white" : "font-sans-medium text-foreground/50",
                      )}
                    >
                      {f}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextField
                className="mb-4"
                label="Expiry Date *"
                value={expiry}
                onChangeText={setExpiry}
                autoCapitalize="none"
                placeholder="YYYY-MM-DD"
              />

              <PillButton variant="accent" loading={pending} disabled={!canSubmit} onPress={submit}>
                {isEdit ? "Save Changes" : "Add Policy"}
              </PillButton>
              {isError ? (
                <Text className="mt-2 text-center text-[11px] text-destructive">
                  Could not save policy. Please try again.
                </Text>
              ) : null}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
