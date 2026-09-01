import { AlertTriangle, Pencil, Plus, Shield, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { ChipSelect } from "@/components/ui/filter-chip";
import { PageShell } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Tabs } from "@/components/ui/tabs";
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
import { confirmDestructive } from "@/lib/confirm";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TABS = ["Policies", "Targets", "Coverage Report"] as const;

/** Policy types the backend accepts (String(20), free-form; CLI documents these). */
const POLICY_TYPES = ["life", "health", "motor", "property", "other"] as const;

/** Premium payment cadences the backend accepts (free-form string). */
const PREMIUM_FREQUENCIES = ["monthly", "quarterly", "yearly"] as const;

const FieldLabel = ({ children }: { children: string }) => (
  <Text className="mb-2 pl-0.5 text-[13px] font-sans-medium uppercase tracking-wide text-foreground/40">{children}</Text>
);

export default function InsuranceScreen() {
  const colors = useThemeColors();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Policies");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Policy | null>(null);
  const [targetOpen, setTargetOpen] = useState(false);
  const policies = usePolicies();
  const targets = useTargets();
  const report = useCoverageReport();
  const { deletePolicy, deleteTarget, setTarget } = useInsuranceMutations();

  const openAdd = () => {
    setEditing(null);
    setDrawerOpen(true);
  };
  const openEdit = (p: Policy) => {
    setEditing(p);
    setDrawerOpen(true);
  };
  const confirmDelete = (p: Policy) => {
    confirmDestructive({
      title: "Delete policy",
      message: `Delete "${p.name}"? This cannot be undone.`,
      onConfirm: () => deletePolicy.mutate(p.id),
    });
  };

  const activePolicies = (policies.data ?? []).filter((p) => p.is_active);
  const totalCoverage = activePolicies.reduce((s, p) => s + Number(p.coverage_amount), 0);
  const totalTarget = (targets.data ?? []).reduce((s, t) => s + Number(t.target_amount), 0);
  const totalGap = (report.data?.lines ?? []).reduce((s, l) => s + Math.max(0, Number(l.gap)), 0);
  const gapFree = totalTarget > 0 && totalGap <= 0;

  return (
    <View className="flex-1">
      <PageShell
        animateOn={tab}
        header={
          <ScreenHeader
            title="Insurance"
            back
            trailing={
              <Pressable
                onPress={openAdd}
                className="h-11 w-11 items-center justify-center rounded-full bg-salli-accent"
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            }
          />
        }
      >
        {/* hero — coverage vs gap */}
        <View className="px-4 pt-3">
          <Card className="bg-salli-navy-card p-[18px]">
            <Text className="mb-1.5 text-[14px] font-sans-medium uppercase tracking-wide text-white/50">
              Total Coverage
            </Text>
            <View className="mb-1 flex-row items-baseline gap-1">
              <Text className="font-sans-semibold text-[20px] text-white/40">Rs.</Text>
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
                    "text-[14px] font-sans-semibold",
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
                <Text className="mb-1 text-[13px] text-white/35">Policies</Text>
                <Text className="font-sans-bold text-[15px] text-white">{activePolicies.length}</Text>
              </View>
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[13px] text-white/35">Target</Text>
                <Text className="font-sans-bold text-[15px] text-white">Rs. {formatLKRAbbrev(totalTarget)}</Text>
              </View>
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[13px] text-white/35">Gap</Text>
                <Text className={cn("font-sans-bold text-[15px]", totalGap > 0 ? "text-destructive" : "text-salli-accent")}>
                  Rs. {formatLKRAbbrev(totalGap)}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <Tabs className="mt-3" items={TABS} value={tab} onChange={setTab} />

        {tab === "Policies" ? (
          <View className="gap-1.5 px-4 pt-3">
            {activePolicies.length === 0 ? (
              <Card className="items-center p-6">
                <Text className="text-[15px] text-foreground/35">No policies yet.</Text>
              </Card>
            ) : (
              activePolicies.map((p) => (
                <Pressable key={p.id} onPress={() => openEdit(p)}>
                  <Card className="flex-row items-center gap-2.5 p-3.5">
                    <View className="h-9 w-9 items-center justify-center rounded-[8px] border border-salli-accent/20 bg-salli-accent/[0.12]">
                      <Shield size={17} color={colors.accent} strokeWidth={2} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-[15px] text-foreground">{p.name}</Text>
                      <Text className="text-[14px] capitalize text-foreground/30">
                        {p.policy_type} · {p.provider} · expires {p.expiry_date}
                      </Text>
                    </View>
                    <View className="items-end gap-1.5">
                      <Text className="font-sans-semibold text-[15px] text-foreground">Rs. {formatLKRAbbrev(p.coverage_amount)}</Text>
                      <View className="flex-row items-center gap-3">
                        <Pressable onPress={() => openEdit(p)} hitSlop={8}>
                          <Pencil size={15} color={colors.mutedForeground} strokeWidth={2} />
                        </Pressable>
                        <Pressable onPress={() => confirmDelete(p)} hitSlop={8}>
                          <Trash2 size={15} color={colors.mutedForeground} strokeWidth={2} />
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
              <Card className="items-center gap-1.5 p-6">
                <Text className="text-center text-[15px] text-foreground/45">
                  No coverage targets yet
                </Text>
                <Text className="text-center text-[15px] leading-5 text-foreground/30">
                  Declare how much cover you think you need, and the Coverage Report will show
                  where you fall short.
                </Text>
              </Card>
            ) : (
              (targets.data ?? []).map((t) => (
                <Card key={t.policy_type} className="flex-row items-center justify-between p-3.5">
                  <Text className="font-sans-semibold text-[15px] capitalize text-foreground">{t.policy_type}</Text>
                  <View className="flex-row items-center gap-3">
                    <Text className="font-sans-semibold text-[15px] text-foreground">Rs. {formatLKRAbbrev(t.target_amount)}</Text>
                    <Pressable onPress={() => deleteTarget.mutate(t.policy_type)}>
                      <Trash2 size={15} color={colors.mutedForeground} strokeWidth={2} />
                    </Pressable>
                  </View>
                </Card>
              ))
            )}

            {/* Without this the tab was delete-only: `setTarget` existed in the
                hook and nothing rendered it, so a mobile-only user could never
                declare a target — which left the whole coverage-gap engine
                unreachable, since it only reports a gap where one is declared. */}
            <Pressable
              onPress={() => setTargetOpen(true)}
              className="mt-1 flex-row items-center gap-2.5 rounded-control border border-dashed border-foreground/[0.12] bg-card px-3.5 py-[11px]"
            >
              <View className="h-8 w-8 items-center justify-center rounded-[9px] bg-foreground/[0.04]">
                <Plus size={15} color={colors.mutedForeground} strokeWidth={2.5} />
              </View>
              <Text className="font-sans-medium text-[15px] text-foreground/45">
                Set a coverage target
              </Text>
            </Pressable>
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
                        <Text className="font-sans-semibold text-[15px] capitalize text-foreground">{line.policy_type}</Text>
                        <Text className={cn("font-sans-semibold text-[15px]", covered ? "text-salli-accent" : "text-destructive")}>
                          {covered ? "Covered" : `Gap Rs. ${formatLKR(gap, 0)}`}
                        </Text>
                      </View>
                      <View className="mb-1.5 h-1.5 overflow-hidden rounded-pill bg-foreground/[0.08]">
                        <View
                          className={cn("h-full rounded-pill", covered ? "bg-salli-accent" : "bg-destructive")}
                          style={{ width: `${pct}%` }}
                        />
                      </View>
                      <Text className="text-[14px] text-foreground/30">
                        Rs. {formatLKRAbbrev(actual)} of Rs. {formatLKRAbbrev(target)} target
                      </Text>
                    </Card>
                  );
                })}
              </View>
            ) : (
              <Card className="items-center p-6">
                <Text className="text-[15px] text-foreground/35">No coverage targets declared.</Text>
              </Card>
            )}

            {(report.data?.missing_types.length ?? 0) > 0 ? (
              <Card className="flex-row items-start gap-2 border-destructive/25 bg-destructive/5 p-3.5">
                <AlertTriangle size={16} color="#EF4444" strokeWidth={2} />
                <Text className="flex-1 text-[15px] capitalize text-destructive">
                  Missing coverage: {report.data!.missing_types.join(", ")}
                </Text>
              </Card>
            ) : null}

            {(report.data?.expiring_soon.length ?? 0) > 0 ? (
              <Card className="overflow-hidden p-0">
                <View className="border-b border-foreground/[0.06] px-4 py-3">
                  <Text className="font-sans-semibold text-[15px] text-foreground">Expiring Soon</Text>
                </View>
                {report.data!.expiring_soon.map((e, i) => (
                  <View
                    key={i}
                    className={cn(
                      "flex-row items-center justify-between px-4 py-3",
                      i < report.data!.expiring_soon.length - 1 && "border-b border-foreground/[0.05]",
                    )}
                  >
                    <Text className="text-[15px] text-foreground">{e.policy_name}</Text>
                    <Text className={cn("text-[15px]", e.days_until_expiry <= 30 ? "text-destructive" : "text-foreground/40")}>
                      {e.days_until_expiry} days
                    </Text>
                  </View>
                ))}
              </Card>
            ) : null}
          </View>
        ) : null}
      </PageShell>

      <SetTargetDrawer
        visible={targetOpen}
        onClose={() => setTargetOpen(false)}
        existing={(targets.data ?? []).map((t) => t.policy_type)}
        pending={setTarget.isPending}
        onSubmit={async (policy_type, target_amount) => {
          await setTarget.mutateAsync({ policy_type, target_amount });
          setTargetOpen(false);
        }}
      />

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
    <Drawer
      visible={visible}
      onClose={onClose}
      title={isEdit ? "Edit Policy" : "New Policy"}
      footer={
        <>
          <PillButton variant="accent" loading={pending} disabled={!canSubmit} onPress={submit}>
            {isEdit ? "Save Changes" : "Add Policy"}
          </PillButton>
          {isError ? (
            <Text className="mt-2 text-center text-[14px] text-destructive">
              Could not save policy. Please try again.
            </Text>
          ) : null}
        </>
      }
    >
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

      <FieldLabel>Policy Type *</FieldLabel>
      <ChipSelect className="mb-3" options={POLICY_TYPES} value={policyType} onChange={setPolicyType} capitalize />

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

      <FieldLabel>Premium Frequency *</FieldLabel>
      <ChipSelect className="mb-3" options={PREMIUM_FREQUENCIES} value={frequency} onChange={setFrequency} capitalize />

      <TextField
        className="mb-1"
        label="Expiry Date *"
        value={expiry}
        onChangeText={setExpiry}
        autoCapitalize="none"
        placeholder="YYYY-MM-DD"
      />
    </Drawer>
  );
}


/**
 * Declare how much cover you think you need for one policy type.
 *
 * The coverage-gap engine only reports a gap where a target exists, so without
 * this the Coverage Report stayed permanently empty for anyone who never opened
 * the web app.
 */
function SetTargetDrawer({
  visible,
  onClose,
  existing,
  pending,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  existing: string[];
  pending: boolean;
  onSubmit: (policyType: string, amount: number) => Promise<void>;
}) {
  const [policyType, setPolicyType] = useState<string>("life");
  const [amount, setAmount] = useState("");

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0;
  // `PUT` upserts, so choosing a type that already has a target replaces it.
  const replacing = existing.includes(policyType);

  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      title="Coverage target"
      footer={
        <PillButton
          loading={pending}
          disabled={!valid}
          onPress={() => onSubmit(policyType, value)}
        >
          {replacing ? "Update target" : "Set target"}
        </PillButton>
      }
    >
      <View className="gap-3 pb-2">
        <View>
          <Text className="mb-1.5 text-[13px] font-sans-medium uppercase tracking-wide text-foreground/30">
            Policy type
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {POLICY_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setPolicyType(t)}
                className={cn(
                  "rounded-pill px-3 py-1.5",
                  policyType === t ? "bg-salli-accent" : "border border-foreground/10 bg-card",
                )}
              >
                <Text
                  className={cn(
                    "text-[15px] capitalize",
                    policyType === t
                      ? "font-sans-semibold text-white"
                      : "font-sans-medium text-foreground/55",
                  )}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <TextField
          label="Target cover"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="e.g. 5000000"
        />

        <Text className="text-[14px] leading-5 text-foreground/30">
          {replacing
            ? "You already have a target for this type — saving replaces it."
            : "The Coverage Report compares this against the policies you hold and shows the shortfall."}
        </Text>
      </View>
    </Drawer>
  );
}
