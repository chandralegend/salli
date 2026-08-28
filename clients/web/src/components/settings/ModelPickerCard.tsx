"use client";

import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useAiModels, useSetAiModel } from "@/hooks/useBilling";

/**
 * Which model Salli's conversations run on.
 *
 * Every model is available on every plan. The tier decides how many credits you
 * get, not which models you may spend them on — so this card never gates, it
 * only prices. That is the whole reason the choice can be offered at all: a
 * user on Opus spends five times faster and reaches the same ceiling.
 *
 * The per-message cost is shown rather than the raw multiplier, because "50
 * credits a conversation" is a number someone can hold against their balance
 * and "x5" is not.
 */
export function ModelPickerCard() {
  const models = useAiModels();
  const setModel = useSetAiModel();

  const selected = models.data?.selected;

  async function choose(id: string) {
    if (id === selected) return;
    try {
      await setModel.mutateAsync(id);
      toast.success("Model updated.");
    } catch {
      toast.error("Couldn't change the model. Please try again.");
    }
  }

  return (
    <div className="rounded-lg border bg-card p-5 lg:col-span-2">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles className="size-4 text-muted-foreground" />
        <h2 className="text-[15px] font-semibold">AI model</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Every model is available on every plan — the only difference is how many credits a
        conversation costs. Statement reading always runs on Haiku and is always charged at the
        lowest rate, whichever model you pick here.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {(models.data?.models ?? []).map((m) => {
          const active = m.id === selected;
          return (
            <button
              key={m.id}
              onClick={() => choose(m.id)}
              disabled={setModel.isPending}
              className={`rounded-md border p-3 text-left transition-colors disabled:opacity-60 ${
                active ? "border-primary bg-primary/5" : "hover:border-primary/40 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{m.name}</span>
                {active && <Check className="size-3.5 text-primary" />}
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{m.blurb}</p>
              <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
                {m.credits_per_message} credits / conversation
                {m.is_default ? " · default" : ""}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
