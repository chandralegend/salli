"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, KeyRound, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  llmKeyErrorMessage,
  useDeleteLlmKey,
  useLlmKeys,
  useSaveLlmKey,
  type LlmProvider,
} from "@/hooks/useLlmKeys";
import { useSubscription } from "@/hooks/useBilling";

const PROVIDERS: { id: LlmProvider; label: string; hint: string; placeholder: string }[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    hint: "Powers Salli AI, statement reading, and the wealth advisor.",
    placeholder: "sk-ant-…",
  },
  { id: "openai", label: "OpenAI", hint: "Powers Voice Mode speech-to-text.", placeholder: "sk-…" },
];

/**
 * Bring your own API key. Supplying one means the user pays their provider
 * directly, so Salli stops metering their AI usage.
 *
 * Write-only by design: a key can be replaced or removed, never read back. Only
 * the last four characters are returned — enough to recognise which key is
 * stored without being able to reveal it.
 */
export function LlmKeysCard() {
  const keys = useLlmKeys();
  const save = useSaveLlmKey();
  const remove = useDeleteLlmKey();
  const subscription = useSubscription();

  const [editing, setEditing] = useState<LlmProvider | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<LlmProvider | null>(null);

  async function handleSave(provider: LlmProvider) {
    const key = draft.trim();
    if (!key || busy) return;
    setBusy(provider);
    try {
      await save.mutateAsync({ provider, key });
      setEditing(null);
      setDraft("");
      toast.success("Key saved — your AI usage is now unlimited.");
    } catch (err) {
      // Surfaced from the server's own wording: "rejected" and "couldn't reach
      // the provider" call for different responses from the user.
      toast.error(llmKeyErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove(provider: LlmProvider) {
    setBusy(provider);
    try {
      await remove.mutateAsync(provider);
      toast.success("Key removed — back to your plan's monthly allowance.");
    } catch {
      toast.error("Couldn't remove that key. Please try again shortly.");
    } finally {
      setBusy(null);
    }
  }

  // Nothing to offer if the deployment can't store keys.
  if (keys.data && !keys.data.available) return null;

  const byok = subscription.data?.byok ?? false;

  return (
    <div className="rounded-lg border bg-card p-5 lg:col-span-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <KeyRound className="size-4 text-muted-foreground" />
          Use your own AI key
        </h2>
        {byok && (
          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            <Check className="size-3" />
            Unlimited
          </span>
        )}
      </div>

      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        Add your own API key and you pay your provider directly — Salli stops counting your monthly
        AI usage. Your key is encrypted, never shown again, and you can remove it any time.
      </p>

      {keys.isLoading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {PROVIDERS.map((p) => {
            const existing = keys.data?.keys.find((k) => k.provider === p.id);
            const isEditing = editing === p.id;
            const isBusy = busy === p.id;

            return (
              <div key={p.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{p.label}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">{p.hint}</p>
                  </div>

                  {existing && !isEditing ? (
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-[12px] text-muted-foreground">
                        ····{existing.last4}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(p.id)}
                        disabled={isBusy}
                        aria-label={`Remove ${p.label} key`}
                      >
                        {isBusy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  ) : !isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        setEditing(p.id);
                        setDraft("");
                      }}
                    >
                      Add key
                    </Button>
                  ) : null}
                </div>

                {existing && !existing.readable && (
                  <p className="mt-2 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                    <TriangleAlert className="size-3.5 shrink-0" />
                    This key can no longer be read — please add it again.
                  </p>
                )}

                {isEditing && (
                  <div className="mt-3 flex items-center gap-2">
                    <Input
                      // A credential: never render it in plain text, and keep it
                      // out of the browser's autofill store.
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={p.placeholder}
                      className="font-mono text-[12px]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave(p.id);
                        if (e.key === "Escape") setEditing(null);
                      }}
                    />
                    <Button size="sm" onClick={() => handleSave(p.id)} disabled={!draft.trim() || isBusy}>
                      {isBusy ? <Loader2 className="size-4 animate-spin" /> : "Verify & save"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(null);
                        setDraft("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
