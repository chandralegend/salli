"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MAX_ATTACHMENT_BYTES, useSubmitBugReport } from "@/hooks/useBugReport";
import { PRIMARY_NAV, SECONDARY_NAV, getRouteLabel } from "@/lib/nav";
import { collectReportContext } from "@/lib/report-context";
import { useBugReport, type BugReportPrefill, type BugSeverity } from "@/lib/store";

const SEVERITIES: { value: BugSeverity; label: string; hint: string }[] = [
  { value: "low", label: "Low", hint: "Cosmetic or a minor annoyance" },
  { value: "medium", label: "Medium", hint: "Harder to use, but I can work around it" },
  { value: "high", label: "High", hint: "A feature is broken" },
  { value: "blocking", label: "Blocking", hint: "I can't use Salli at all" },
];

const AREAS = [
  ...PRIMARY_NAV.map((item) => item.label),
  ...SECONDARY_NAV.map((item) => item.label),
  "Settings",
  "Salli AI chat",
  "Onboarding",
  "Other",
];

const DESCRIPTION_SCAFFOLD = `What did you do?
1.

What did you expect?

What happened instead?
`;

/**
 * The single bug-report dialog, mounted once in AppShell and opened from anywhere
 * via useBugReport.getState().open().
 */
export function BugReportDialog() {
  const { isOpen, prefill, close } = useBugReport();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>
            Tell us what went wrong. We attach a small technical snapshot — never your
            balances, amounts, or account names.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open — form state and the context snapshot reset via remount. */}
        {isOpen && <BugReportForm prefill={prefill} onCancel={close} />}
      </DialogContent>
    </Dialog>
  );
}

function BugReportForm({
  prefill,
  onCancel,
}: {
  prefill: BugReportPrefill | null;
  onCancel: () => void;
}) {
  const pathname = usePathname();
  const submit = useSubmitBugReport();

  const [title, setTitle] = useState(prefill?.title ?? "");
  const [description, setDescription] = useState(
    prefill?.description ?? DESCRIPTION_SCAFFOLD,
  );
  const [severity, setSeverity] = useState<BugSeverity>(prefill?.severity ?? "medium");
  const [area, setArea] = useState(prefill?.area ?? getRouteLabel(pathname ?? "") ?? "Other");
  const [contactOk, setContactOk] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Collected ONCE, at mount. The form remounts on every open, so it is always
  // fresh — and the object rendered in the preview below is the same object that
  // gets submitted. Collecting separately for preview and for submit would make
  // the preview a claim rather than a guarantee.
  //
  // One honest consequence: recent_failures[].ago_ms is measured from when the
  // dialog opened, not from submit. That is the better semantic (ages relative to
  // when the user hit the bug) and it keeps the preview truthful, at the cost of
  // not capturing a failure that happens while the dialog sits open.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const context = useMemo(() => collectReportContext(prefill?.clientError ?? null), []);

  const serverError = submit.error instanceof Error ? submit.error.message : null;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Give it a short title so we can tell reports apart.");
      return;
    }
    if (description.trim() === DESCRIPTION_SCAFFOLD.trim() || !description.trim()) {
      setError("Tell us what actually happened — the prompts above are just a guide.");
      return;
    }
    if (file && file.size > MAX_ATTACHMENT_BYTES) {
      setError("Screenshot is over 10 MB.");
      return;
    }

    submit.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        severity,
        area: area === "Other" ? null : area,
        contact_ok: contactOk,
        file,
        context,
      },
      { onSuccess: onCancel },
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="bug-title">Title</Label>
        <Input
          id="bug-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          // Mirrors the server cap, so truncation shows up while typing rather
          // than as a 422 after the user has written everything out.
          maxLength={200}
          placeholder="Statement upload fails on BOC PDFs"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bug-description">What happened?</Label>
        <Textarea
          id="bug-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bug-severity">How bad is it?</Label>
          <Select
            value={severity}
            onValueChange={(v) => setSeverity((v ?? "medium") as BugSeverity)}
          >
            <SelectTrigger id="bug-severity">
              {/* Children override the raw value, which would otherwise render as
                  the lowercase enum ("medium") instead of the label. */}
              <SelectValue>
                {SEVERITIES.find((s) => s.value === severity)?.label ?? "Medium"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                  <span className="ml-1.5 text-xs text-muted-foreground">{s.hint}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bug-area">Where in Salli?</Label>
          <Select value={area} onValueChange={(v) => setArea(v ?? "Other")}>
            <SelectTrigger id="bug-area">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AREAS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bug-file">Screenshot (optional)</Label>
        <Input
          id="bug-file"
          type="file"
          // Images only, even though the upload endpoint also accepts PDF/CSV: the
          // affordance is "attach the screenshot you just took", and widening this
          // invites someone to attach a bank statement to a bug report.
          accept="image/png,image/jpeg"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Take a screenshot yourself and pick the file — Salli never captures your
          screen. Crop out anything you&apos;d rather not share; the image is attached
          to a support ticket.
        </p>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-md border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="bug-contact" className="text-sm">
            You can email me about this
          </Label>
          <p className="text-xs text-muted-foreground">
            We&apos;ll use the address on your account. It stays in Salli and is never
            attached to the ticket.
          </p>
        </div>
        <Switch
          id="bug-contact"
          checked={contactOk}
          onCheckedChange={(checked) => setContactOk(Boolean(checked))}
        />
      </div>

      <Collapsible className="group">
        <CollapsibleTrigger className="flex w-full items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
          <ShieldCheck className="size-3.5" />
          What gets sent
          <ChevronDown className="size-3.5 transition-transform group-data-[panel-open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-[11px] leading-relaxed">
            {JSON.stringify(context, null, 2)}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            Not included: your balances, amounts, account names, entry descriptions, or
            your login token.
          </p>
        </CollapsibleContent>
      </Collapsible>

      {(error || serverError) && (
        <p className="text-[13px] text-destructive">{error || serverError}</p>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : "Send report"}
        </Button>
      </DialogFooter>
    </form>
  );
}
