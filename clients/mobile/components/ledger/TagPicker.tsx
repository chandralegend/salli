import { Check, Plus, Tag as TagIcon } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { useSetPostingTags, useTags } from "@/hooks/useTags";
import { useThemeColors } from "@/lib/theme";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/** Turns "Bank Charge" into "bank-charge" — matches the server's own slugging. */
function slugify(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/**
 * Classify one posting along both tag axes.
 *
 * `category` is an open set — anything typed here that doesn't exist yet is
 * created on save, so nobody has to define tags up front. `need` is the closed,
 * seeded 50/30/20 axis, so it renders as a fixed choice.
 *
 * Only one tag per axis is selectable, mirroring the database constraint. That
 * is what keeps a spending breakdown along either axis summing to the total.
 */
export function TagPicker({
  postingId,
  value,
  onDark = false,
}: {
  postingId: string;
  value: Record<string, string>;
  onDark?: boolean;
}) {
  const colors = useThemeColors();
  const showToast = useToast();
  const categories = useTags("category");
  const needs = useTags("need");
  const setTags = useSetPostingTags();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  // Each save sends the *whole* tag map, so what's read before building the
  // next one has to be current on two counts: props only catch up after the
  // refetch, and state set earlier in the same tick hasn't applied yet. A ref
  // covers both — it updates synchronously, so tapping a category and a need in
  // quick succession can't have the second call wipe the first. `local` exists
  // alongside it purely to trigger the re-render.
  const [local, setLocal] = useState<Record<string, string> | null>(null);
  const pending = useRef<Record<string, string> | null>(null);

  // Rendering reads state only. The ref is for handlers: `current` below is a
  // render-scoped const, so two clicks in the same tick would both see the same
  // stale snapshot of it — the ref updates synchronously and closes that gap.
  // The caller keys this component on the posting id, so a different row
  // remounts with its own tags and neither needs resetting here.
  const current = local ?? value;
  const readCurrent = () => pending.current ?? local ?? value;

  // Saves are chained rather than fired in parallel. Each one sends the whole
  // tag map, so two in flight at once race and whichever *lands* last wins —
  // which is not necessarily the one clicked last. Serialising keeps the final
  // stored state matching the final visible state.
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  function apply(next: Record<string, string>) {
    const previous = readCurrent();
    pending.current = next;
    setLocal(next);
    chain.current = chain.current
      .then(() => setTags.mutateAsync({ postingId, tags: next }))
      .catch(() => {
        pending.current = previous;
        setLocal(previous);
        showToast("Could not save that tag.", "error");
      });
  }

  // Tapping the selected tag again clears that axis — otherwise a mis-tag on
  // the closed `need` axis could never be undone.
  function toggle(kind: string, slug: string) {
    const next = { ...readCurrent() };
    if (next[kind] === slug) delete next[kind];
    else next[kind] = slug;
    apply(next);
  }

  function addCategory() {
    const slug = slugify(draft);
    if (!slug) return;
    setAdding(false);
    setDraft("");
    apply({ ...readCurrent(), category: slug });
  }

  const label = cn(
    "mb-1.5 text-[11px] font-mono uppercase tracking-widest",
    onDark ? "text-white/35" : "text-muted-foreground",
  );

  function Chip({
    active,
    children,
    onPress,
  }: {
    active: boolean;
    children: React.ReactNode;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        disabled={setTags.isPending}
        className={cn(
          "flex-row items-center gap-1.5 rounded-pill px-3 py-1.5",
          active
            ? "bg-salli-accent"
            : onDark
              ? "bg-white/[0.08]"
              : "border-2 border-foreground bg-card",
        )}
      >
        {active ? <Check size={11} color="#FFFFFF" strokeWidth={3} /> : null}
        <Text
          className={cn(
            "text-[15px]",
            active
              ? "font-sans-semibold text-white"
              : onDark
                ? "font-sans-medium text-white/60"
                : "font-sans-medium text-foreground/55",
          )}
        >
          {children}
        </Text>
      </Pressable>
    );
  }

  if (categories.isLoading || needs.isLoading) {
    return (
      <View className="items-center py-3">
        <ActivityIndicator size="small" color={colors.mutedForeground} />
      </View>
    );
  }

  return (
    <View className="gap-3">
      <View>
        <Text className={label}>What was it for?</Text>
        <View className="flex-row flex-wrap gap-1.5">
          {(categories.data ?? []).map((t) => (
            <Chip
              key={t.id}
              active={current.category === t.slug}
              onPress={() => toggle("category", t.slug)}
            >
              {t.name}
            </Chip>
          ))}
          {adding ? (
            <View className="flex-row items-center gap-1.5">
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={addCategory}
                autoFocus
                placeholder="New category"
                placeholderTextColor="rgba(128,128,128,0.45)"
                className={cn(
                  "h-[30px] w-[130px] rounded-pill px-3 text-[15px]",
                  onDark ? "bg-white/[0.08] text-white" : "bg-muted text-foreground",
                )}
              />
              <Pressable
                onPress={addCategory}
                disabled={!draft.trim()}
                className="h-10 w-10 items-center justify-center rounded-[11px] border-2 border-foreground bg-card"
              >
                <Check size={15} color="#FFFFFF" strokeWidth={3} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setAdding(true)}
              className={cn(
                "flex-row items-center gap-1.5 rounded-pill border border-dashed px-3 py-1.5",
                onDark ? "border-white/20" : "border-foreground/15",
              )}
            >
              <Plus
                size={11}
                color={onDark ? "rgba(255,255,255,0.45)" : colors.mutedForeground}
                strokeWidth={2.5}
              />
              <Text
                className={cn(
                  "text-[15px] font-sans-medium",
                  onDark ? "text-white/45" : "text-muted-foreground",
                )}
              >
                New
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <View>
        <Text className={label}>How necessary?</Text>
        <View className="flex-row flex-wrap gap-1.5">
          {(needs.data ?? []).map((t) => (
            <Chip key={t.id} active={current.need === t.slug} onPress={() => toggle("need", t.slug)}>
              {t.name}
            </Chip>
          ))}
        </View>
      </View>

      <View className="flex-row items-start gap-1.5">
        <TagIcon
          size={11}
          color={onDark ? "rgba(255,255,255,0.3)" : colors.mutedForeground}
          strokeWidth={2}
        />
        <Text
          className={cn(
            "flex-1 text-[13px] leading-5",
            onDark ? "text-white/30" : "text-muted-foreground",
          )}
        >
          Tagging doesn&rsquo;t change the amount. It records what the spending was for, so your
          breakdowns add up.
        </Text>
      </View>
    </View>
  );
}
