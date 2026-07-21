"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useParseEntry, type EntryDraft } from "@/hooks/useParseEntry";

/** Minimal Web Speech API surface (not in lib.dom types). */
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** AI quick-add: type or dictate a note; Salli parses it into a draft entry
 * (nothing is posted — the caller opens the entry form pre-filled for review). */
export function QuickAddDialog({
  open,
  onOpenChange,
  onDraft,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDraft: (draft: EntryDraft) => void;
}) {
  const parse = useParseEntry();
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");
  const Recognition = getSpeechRecognition();
  const speechSupported = Boolean(Recognition);

  useEffect(() => {
    if (open) {
      setText("");
      parse.reset();
    }
    return () => {
      recognitionRef.current?.stop();
      setListening(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleMic() {
    if (!Recognition) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new Recognition();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    baseTextRef.current = text ? text.trimEnd() + " " : "";
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setText(baseTextRef.current + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function submit() {
    const value = text.trim();
    if (!value) return;
    recognitionRef.current?.stop();
    parse.mutate(value, {
      onSuccess: (draft) => {
        onOpenChange(false);
        onDraft(draft);
      },
      onError: () => toast.error("Couldn't read that — try rephrasing, or add the entry manually."),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-[#0A2540]" /> Quick add
          </DialogTitle>
          <DialogDescription>
            Describe the transaction in plain words{speechSupported ? " — type or dictate" : ""}. Salli drafts the
            entry; nothing is posted until you confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Textarea
            autoFocus
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Spent 4,500 on groceries at Keells from my Commercial Bank account"
            className="pr-12"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
            }}
          />
          {speechSupported && (
            <Button
              type="button"
              size="icon"
              variant={listening ? "default" : "outline"}
              onClick={toggleMic}
              aria-label={listening ? "Stop dictation" : "Dictate"}
              className={cn("absolute right-2 top-2 size-8", listening && "animate-pulse")}
            >
              <Mic className="size-4" />
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!text.trim() || parse.isPending}>
            {parse.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {parse.isPending ? "Drafting…" : "Draft entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
