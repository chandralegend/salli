"use client";

import { useRef, useState } from "react";
import { Check, Loader2, Plus, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { useSetPostingTags, useTags } from "@/hooks/useTags";
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
export function TagPicker({ postingId, value }: { postingId: string; value: Record<string, string> }) {
  const categories = useTags("category");
  const needs = useTags("need");
  const setTags = useSetPostingTags();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  // Each save sends the *whole* tag map, so what's read before building the
  // next one has to be current on two counts: props only catch up after the
  // refetch, and state set earlier in the same tick hasn't applied yet. A ref
  // covers both — it updates synchronously, so picking a category and a need in
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
        toast.error("Could not save that tag.");
      });
  }

  // Clicking the selected tag again clears that axis — otherwise a mis-tag on
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

  function Chip({
    active,
    children,
    onClick,
  }: {
    active: boolean;
    children: React.ReactNode;
    onClick: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={setTags.isPending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] transition-colors",
          active
            ? "bg-primary font-semibold text-primary-foreground"
            : "border text-muted-foreground hover:text-foreground",
        )}
      >
        {active && <Check className="size-3" />}
        {children}
      </button>
    );
  }

  if (categories.isLoading || needs.isLoading) {
    return (
      <div className="flex justify-center py-3">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="eyebrow mb-1.5">What was it for?</p>
        <div className="flex flex-wrap gap-1.5">
          {(categories.data ?? []).map((t) => (
            <Chip
              key={t.id}
              active={current.category === t.slug}
              onClick={() => toggle("category", t.slug)}
            >
              {t.name}
            </Chip>
          ))}
          {adding ? (
            <span className="inline-flex items-center gap-1.5">
              <Input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCategory();
                  if (e.key === "Escape") setAdding(false);
                }}
                placeholder="New category"
                className="h-7 w-36 rounded-full text-[12px]"
              />
              <button
                type="button"
                onClick={addCategory}
                disabled={!draft.trim()}
                aria-label="Add category"
                className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Check className="size-3.5" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1 text-[12px] text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-3" /> New
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="eyebrow mb-1.5">How necessary?</p>
        <div className="flex flex-wrap gap-1.5">
          {(needs.data ?? []).map((t) => (
            <Chip key={t.id} active={current.need === t.slug} onClick={() => toggle("need", t.slug)}>
              {t.name}
            </Chip>
          ))}
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <TagIcon className="mt-px size-3 shrink-0" />
        Tagging doesn&rsquo;t change the amount — it only records what this spending was for, so your
        breakdowns and needs-vs-wants split add up.
      </p>
    </div>
  );
}
