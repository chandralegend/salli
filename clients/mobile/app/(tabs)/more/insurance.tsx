import { Plus, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { ActionButton } from "@/components/ui/action-button";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Hero, Meter, Rule, SectionLabel, Strong } from "@/components/ui/blocks";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { ChipSelect } from "@/components/ui/filter-chip";
import { PageShell } from "@/components/ui/page-shell";
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
import { confirmDestructive } from "@/lib/confirm";
import { formatDate, formatLKRAbbrev } from "@/lib/format";
import { useHardShadow, useThemeColors } from "@/lib/theme";

/** Policy types the backend accepts (String(20), free-form; CLI documents these). */
const POLICY_TYPES = ["life", "health", "motor", "property", "other"] as const;

/** Premium payment cadences the backend accepts (free-form string). */
const PREMIUM_FREQUENCIES = ["monthly", "quarterly", "yearly"] as const;

const FieldLabel = ({ children }: { children: string }) => (
  <Text className="mb-2 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
    {children}
  </Text>
);

/**
 * Cover you hold, cover you said you need, and the difference.
 *
 * Three tabs became one scroll. "Coverage Report" was derived entirely from the
 * other two — target minus actual, per type — so the app showed a list of
 * declared targets on one tab and the same targets with their shortfall on
 * another. The gap version is strictly more informative, so it is the only one
 * left, and it carries the delete the Targets tab existed for.
 *
 * The dark hero stated the gap twice on its own: once as a chip and again as
 * one of three tiles under it.
 */
export default function InsuranceScreen() {
  const colors = useThemeColors();
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

  const activePolicies = (policies.data ?? []).filter((p) => p.is_active);
  const totalCoverage = activePolicies.reduce((s, p) => s + Number(p.coverage_amount), 0);
  const totalTarget = (targets.data ?? []).reduce((s, t) => s + Number(t.target_amount), 0);
  const totalGap = (report.data?.lines ?? []).reduce((s, l) => s + Math.max(0, Number(l.gap)), 0);
  const lines = report.data?.lines ?? [];
  const missing = report.data?.missing_types ?? [];
  const expiring = report.data?.expiring_soon ?? [];

  return (
    <View className="flex-1">
      <PageShell
        header={
          <ScreenHeader
            title="Insurance"
            back
            trailing={
              <AnimatedPressable
                onPress={openAdd}
                accessibilityRole="button"
                accessibilityLabel="Add a policy"
                className="h-11 w-11 items-center justify-center rounded-[11px] border-2 border-foreground bg-card"
              >
                <Plus size={21} color={colors.accent} strokeWidth={2.4} />
              </AnimatedPressable>
            }
          />
        }
      >
        <View className="px-5">
          {activePolicies.length === 0 ? (
            <>
              <Hero>You haven&rsquo;t added any policies.</Hero>
              <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
                Add what you are insured for, say how much cover you think you need, and we will
                show you where you fall short.
              </Text>
              <ActionButton className="mt-5" onPress={openAdd}>
                Add a policy
              </ActionButton>
            </>
          ) : (
            <>
              <Hero>
                You&rsquo;re covered for <Strong>Rs. {formatLKRAbbrev(totalCoverage)}</Strong>.
              </Hero>
              <Text
                className={`mt-2 text-[16px] leading-[23px] ${
                  totalGap > 0 ? "font-sans-semibold text-destructive" : "text-muted-foreground"
                }`}
              >
                {totalTarget === 0
                  ? "Set a cover target and we'll show you the shortfall."
                  : totalGap > 0
                    ? `Rs. ${formatLKRAbbrev(totalGap)} short of the Rs. ${formatLKRAbbrev(totalTarget)} you said you need.`
                    : `That meets the Rs. ${formatLKRAbbrev(totalTarget)} you said you need.`}
              </Text>
            </>
          )}
        </View>

        {activePolicies.length > 0 ? (
          <>
            <Rule />
            <SectionLabel>Cover by type</SectionLabel>
            <View className="mt-3 gap-[9px] px-5">
              {lines.length > 0 ? (
                lines.map((line, i) => {
                  const target = Number(line.target_amount);
                  const actual = Number(line.actual_coverage);
                  const gap = Number(line.gap);
                  const covered = gap <= 0;
                  return (
                    <Card key={i} className={`p-[15px] ${covered ? "" : "border-destructive"}`}>
                      <View className="flex-row items-baseline justify-between gap-2.5">
                        <Text className="min-w-0 flex-1 font-sans-bold text-[17px] capitalize text-foreground">
                          {line.policy_type}
                        </Text>
                        <Text
                          className={`shrink-0 font-sans-bold text-[13.5px] ${
                            covered ? "text-muted-foreground" : "text-destructive"
                          }`}
                        >
                          {covered ? "Covered" : `Rs. ${formatLKRAbbrev(gap)} short`}
                        </Text>
                        <Pressable
                          onPress={() =>
                            confirmDestructive({
                              title: "Remove target",
                              message: `Stop tracking a cover target for ${line.policy_type}?`,
                              confirmLabel: "Remove",
                              onConfirm: () => deleteTarget.mutate(line.policy_type),
                            })
                          }
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${line.policy_type} target`}
                          className="shrink-0"
                        >
                          <Trash2 size={15} color={colors.mutedForeground} strokeWidth={2} />
                        </Pressable>
                      </View>
                      {/* `over` is the breach tone, which a shortfall is — the
                          bar is under-filled, and red says that matters. */}
                      <Meter
                        className="mt-[11px]"
                        value={target > 0 ? actual / target : 0}
                        over={!covered}
                      />
                      <Text className="mt-[9px] text-[13.5px] text-muted-foreground">
                        Rs. {formatLKRAbbrev(actual)} of Rs. {formatLKRAbbrev(target)}
                      </Text>
                    </Card>
                  );
                })
              ) : (
                <Text className="text-[15px] leading-[21px] text-muted-foreground">
                  No cover targets declared yet. Set one and this becomes a shortfall you can act
                  on.
                </Text>
              )}

              {missing.length > 0 ? (
                <Text className="mt-1 text-[15px] leading-[21px] text-destructive">
                  Nothing at all for {missing.join(", ")}.
                </Text>
              ) : null}

              {/* Without this the targets list was delete-only: `setTarget`
                  existed in the hook and nothing rendered it, so a mobile-only
                  user could never declare a target — which left the whole
                  coverage-gap engine unreachable, since it only reports a gap
                  where one is declared. */}
              <ActionButton
                variant="secondary"
                className="mt-1"
                onPress={() => setTargetOpen(true)}
              >
                Set a cover target
              </ActionButton>
            </View>

            <Rule />
            <SectionLabel>Policies</SectionLabel>
            <View className="mt-3 gap-[9px] px-5">
              {activePolicies.map((p) => (
                <AnimatedPressable
                  key={p.id}
                  onPress={() => openEdit(p)}
                  press="sink"
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${p.name}`}
                  className="flex-row items-center gap-2.5 rounded-card border-2 border-foreground bg-card px-3.5 py-3"
                >
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="font-sans-bold text-[16px] text-foreground">
                      {p.name}
                    </Text>
                    <Text numberOfLines={1} className="mt-0.5 text-[13.5px] capitalize text-muted-foreground">
                      {p.policy_type} · {p.provider} · to {formatDate(p.expiry_date)}
                    </Text>
                  </View>
                  {/* The pencil that used to sit here opened the same sheet as
                      tapping the row, so it was a second button for the first
                      button's job. */}
                  <Text className="shrink-0 font-sans-extrabold text-[15px] text-foreground">
                    {formatLKRAbbrev(p.coverage_amount)}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>

            {expiring.length > 0 ? (
              <>
                <Rule />
                <SectionLabel>Expiring soon</SectionLabel>
                <View className="mt-3 gap-[9px] px-5">
                  {expiring.map((e, i) => (
                    <View
                      key={i}
                      className={`flex-row items-center justify-between gap-3 rounded-card border-2 px-3.5 py-3 ${
                        e.days_until_expiry <= 30 ? "border-destructive" : "border-foreground"
                      }`}
                    >
                      <Text numberOfLines={1} className="min-w-0 flex-1 text-[16px] text-foreground">
                        {e.policy_name}
                      </Text>
                      <Text
                        className={`shrink-0 text-[13.5px] ${
                          e.days_until_expiry <= 30
                            ? "font-sans-semibold text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {e.days_until_expiry} days
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}
        <View className="h-7" />
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
        onDelete={(p) =>
          confirmDestructive({
            title: "Delete policy",
            message: `Delete "${p.name}"? This cannot be undone.`,
            onConfirm: () => {
              deletePolicy.mutate(p.id);
              setDrawerOpen(false);
            },
          })
        }
        deleting={deletePolicy.isPending}
      />
    </View>
  );
}

/** Add / Edit policy bottom-sheet — reused for both flows. On edit it prefills
 * from the passed policy and PATCHes only the fields; on add it POSTs a full
 * PolicyRequest. */
function AddEditPolicyDrawer({
  visible,
  policy,
  onClose,
  onDelete,
  deleting,
}: {
  visible: boolean;
  policy: Policy | null;
  onClose: () => void;
  onDelete: (p: Policy) => void;
  deleting: boolean;
}) {
  const addPolicy = useAddPolicy();
  const updatePolicy = useUpdatePolicy();
  const shadow = useHardShadow();
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
    const body = {
      name: name.trim(),
      provider: provider.trim(),
      policy_type: policyType,
      coverage_amount: coverageNum,
      premium_amount: premiumNum,
      premium_frequency: frequency,
      expiry_date: expiry.trim(),
    };
    if (isEdit && policy) {
      updatePolicy.mutate({ id: policy.id, body }, { onSuccess: onClose });
    } else {
      addPolicy.mutate(body, { onSuccess: onClose });
    }
  };

  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      title={isEdit ? "Edit policy" : "New policy"}
      footer={
        <>
          <ActionButton variant="accent" loading={pending} disabled={!canSubmit} onPress={submit}>
            {isEdit ? "Save changes" : "Add policy"}
          </ActionButton>
          {isEdit && policy ? (
            <Pressable
              onPress={() => onDelete(policy)}
              disabled={deleting}
              style={shadow}
              className="mt-2.5 h-12 flex-row items-center justify-center gap-2 rounded-card border-2 border-destructive bg-card"
            >
              <Trash2 size={17} color="#EF4444" strokeWidth={2} />
              <Text className="font-sans-bold text-[16px] text-destructive">
                {deleting ? "Deleting…" : "Delete policy"}
              </Text>
            </Pressable>
          ) : null}
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
        label="Policy name *"
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

      <FieldLabel>Policy type *</FieldLabel>
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

      <FieldLabel>Premium frequency *</FieldLabel>
      <ChipSelect className="mb-3" options={PREMIUM_FREQUENCIES} value={frequency} onChange={setFrequency} capitalize />

      <TextField
        className="mb-1"
        label="Expiry date *"
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
 * this the shortfall block stays permanently empty for anyone who never opened
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
      title="Cover target"
      footer={
        <ActionButton loading={pending} disabled={!valid} onPress={() => onSubmit(policyType, value)}>
          {replacing ? "Update target" : "Set target"}
        </ActionButton>
      }
    >
      <View className="gap-3 pb-2">
        {/* ChipSelect, not a hand-rolled pill row. This sheet had its own copy
            of the chip styling, which is how it ended up the one place in the
            app where a selected chip was a full pill rather than the badge
            shape everything else uses. */}
        <View>
          <FieldLabel>Policy type</FieldLabel>
          <ChipSelect options={POLICY_TYPES} value={policyType} onChange={setPolicyType} capitalize />
        </View>

        <TextField
          label="Target cover"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="e.g. 5000000"
        />

        <Text className="text-[14px] leading-5 text-muted-foreground">
          {replacing
            ? "You already have a target for this type. Saving replaces it."
            : "This is compared against the policies you hold to show the shortfall."}
        </Text>
      </View>
    </Drawer>
  );
}
