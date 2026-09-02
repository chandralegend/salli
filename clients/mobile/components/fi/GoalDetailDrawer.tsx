import { Check, TriangleAlert, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { Drawer } from "@/components/ui/drawer";
import { ActionButton } from "@/components/ui/action-button";
import { TextField } from "@/components/ui/text-field";
import { useAccounts, useTrialBalance } from "@/hooks/useLedger";
import { useFiGoalMutations, useGoalAllocations, type FiGoal } from "@/hooks/useFi";
import { formatLKRAbbrev } from "@/lib/format";
import { confirmDestructive } from "@/lib/confirm";
import { useThemeColors } from "@/lib/theme";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const PRIORITIES = [
  { value: 1, label: "High" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Low" },
] as const;

/**
 * Edit a goal, and earmark the accounts behind it.
 *
 * Two gaps closed here. `PATCH /fi/goals/{id}` has existed all along and no
 * client ever called it, so changing a goal meant deleting and recreating it.
 * And goal progress was a number nobody could enter — now it comes from
 * earmarking real accounts, so it moves when money moves.
 *
 * Only asset accounts are offered: a goal is backed by money you hold, and
 * earmarking an expense or income account would be meaningless.
 */
export function GoalDetailDrawer({
  goal,
  visible,
  onClose,
}: {
  goal: FiGoal | null;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const showToast = useToast();
  const accounts = useAccounts();
  const balances = useTrialBalance();
  const allocations = useGoalAllocations(visible && goal ? goal.id : null);
  const { updateGoal, deleteGoal, setAllocation } = useFiGoalMutations();

  // Seeded straight from props rather than in an effect. The caller keys this
  // component on the goal id, so opening a different goal remounts it and the
  // form re-initialises naturally — no cascading render, and no chance of
  // showing the previous goal's values for a frame.
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? String(Number(goal.target_amount)) : "");
  const [priority, setPriority] = useState(goal?.priority ?? 2);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (!goal) return null;

  const assetAccounts = (accounts.data ?? []).filter((a) => a.type === "asset" && a.is_active);
  const allocated = new Map((allocations.data ?? []).map((a) => [a.account_id, a.allocated_amount]));
  const hasShortfall = Number(goal.shortfall) > 0;

  async function saveDetails() {
    const amount = Number(target);
    if (!name.trim() || !Number.isFinite(amount) || amount <= 0) {
      showToast("Give the goal a name and a target above zero.", "error");
      return;
    }
    try {
      await updateGoal.mutateAsync({
        id: goal!.id,
        name: name.trim(),
        target_amount: amount,
        priority,
      });
      showToast("Goal updated.", "success");
    } catch {
      showToast("Could not save that. Please try again.", "error");
    }
  }

  async function commitAllocation(accountId: string) {
    const raw = drafts[accountId];
    if (raw === undefined) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) {
      showToast("Enter an amount of zero or more.", "error");
      return;
    }
    try {
      await setAllocation.mutateAsync({
        goalId: goal!.id,
        account_id: accountId,
        allocated_amount: amount,
      });
      setDrafts((d) => {
        const next = { ...d };
        delete next[accountId];
        return next;
      });
    } catch {
      showToast("Could not update that earmark.", "error");
    }
  }

  function confirmDelete() {
    confirmDestructive({
      title: `Delete "${goal!.name}"`,
      message: "This removes the goal and its earmarks. Your accounts and money are untouched.",
      onConfirm: async () => {
        await deleteGoal.mutateAsync(goal!.id);
        onClose();
      },
    });
  }

  return (
    <Drawer visible={visible} onClose={onClose} title={goal.name}>
      <View className="gap-3 pb-2">
        {/* what is actually behind this goal */}
        <View className="rounded-card border border-foreground/[0.08] bg-muted p-3.5">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-[14px] font-sans-medium uppercase tracking-wide text-muted-foreground">
              Funded
            </Text>
            <Text className="font-sans-bold text-[17px] text-foreground">
              Rs. {formatLKRAbbrev(goal.current_amount)}
              <Text className="text-[15px] font-sans text-muted-foreground">
                {" "}
                of {formatLKRAbbrev(goal.target_amount)}
              </Text>
            </Text>
          </View>
          <Text className="mt-1 text-[14px] leading-5 text-muted-foreground">
            Comes from the live balance of the accounts you earmark below, so it moves only when
            your money does.
          </Text>
          {hasShortfall ? (
            <View className="mt-2.5 flex-row items-start gap-2 rounded-card bg-[#FEF3C7] px-3 py-2">
              <TriangleAlert size={15} color="#B45309" strokeWidth={2} />
              <Text className="flex-1 text-[14px] leading-5 text-[#B45309]">
                You&rsquo;ve earmarked Rs. {formatLKRAbbrev(goal.allocated_amount)} but those
                accounts hold Rs. {formatLKRAbbrev(goal.shortfall)} less than that right now.
              </Text>
            </View>
          ) : null}
        </View>

        <TextField label="Goal name" value={name} onChangeText={setName} />
        <TextField
          label="Target amount"
          value={target}
          onChangeText={setTarget}
          keyboardType="numeric"
        />

        <View>
          <Text className="mb-1.5 text-[13px] font-sans-medium uppercase tracking-wide text-muted-foreground">
            Priority
          </Text>
          <View className="flex-row rounded-pill bg-foreground/[0.06] p-1">
            {PRIORITIES.map((p) => (
              <Pressable
                key={p.value}
                onPress={() => setPriority(p.value)}
                className={cn(
                  "flex-1 items-center rounded-pill py-1.5",
                  priority === p.value && "bg-primary",
                )}
              >
                <Text
                  className={cn(
                    "text-[15px]",
                    priority === p.value
                      ? "font-sans-semibold text-primary-foreground"
                      : "font-sans-medium text-muted-foreground",
                  )}
                >
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text className="mt-1 text-[13px] leading-5 text-muted-foreground">
            When one account is earmarked for several goals and can&rsquo;t cover them all, the
            higher priority stays funded.
          </Text>
        </View>

        <ActionButton loading={updateGoal.isPending} onPress={saveDetails}>
          Save changes
        </ActionButton>

        {/* earmarks */}
        <Text className="mt-1.5 text-[13px] font-sans-medium uppercase tracking-wide text-muted-foreground">
          Money behind this goal
        </Text>
        {accounts.isLoading || allocations.isLoading ? (
          <View className="items-center py-4">
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          </View>
        ) : assetAccounts.length === 0 ? (
          <Text className="text-[15px] text-muted-foreground">
            No accounts yet — add one in the Ledger first.
          </Text>
        ) : (
          assetAccounts.map((a) => {
            const current = allocated.get(a.id) ?? "0";
            const draft = drafts[a.id];
            const value = draft ?? (Number(current) > 0 ? String(Number(current)) : "");
            const balance = Number(balances.data?.[a.id] ?? 0);
            const dirty = draft !== undefined && Number(draft || 0) !== Number(current);
            return (
              <View
                key={a.id}
                className="rounded-card border-2 border-foreground bg-card p-3"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="font-sans-medium text-[15px] text-foreground">{a.name}</Text>
                    <Text className="mt-0.5 text-[14px] text-muted-foreground">
                      Holds Rs. {formatLKRAbbrev(balance)}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={value}
                      onChangeText={(t) => setDrafts((d) => ({ ...d, [a.id]: t }))}
                      placeholder="0"
                      placeholderTextColor="rgba(128,128,128,0.4)"
                      keyboardType="numeric"
                      className="h-9 w-[110px] rounded-card bg-muted px-2.5 text-right text-[15px] text-foreground"
                    />
                    {dirty ? (
                      <Pressable
                        onPress={() => commitAllocation(a.id)}
                        hitSlop={8}
                        disabled={setAllocation.isPending}
                        className="h-9 w-9 items-center justify-center rounded-card bg-salli-accent"
                      >
                        {setAllocation.isPending ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                        )}
                      </Pressable>
                    ) : (
                      <View className="h-9 w-9" />
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
        <Text className="text-[13px] leading-5 text-muted-foreground">
          Earmarking doesn&rsquo;t move any money — it just records which part of an account is
          meant for this goal. One account can back several goals.
        </Text>

        <Pressable
          onPress={confirmDelete}
          className="mt-1.5 flex-row items-center justify-center gap-2 py-2"
        >
          <Trash2 size={16} color="#EF4444" strokeWidth={2} />
          <Text className="font-sans-medium text-[15px] text-destructive/90">Delete this goal</Text>
        </Pressable>
      </View>
    </Drawer>
  );
}
