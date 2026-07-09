"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { FireStrategy } from "@/hooks/useFi";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STYLE_LABEL: Record<string, string> = {
  lean: "LeanFIRE",
  standard: "Standard FIRE",
  fat: "FatFIRE",
  coast: "CoastFIRE",
};

const STYLE_COLOR: Record<string, string> = {
  lean: "bg-amber-50 text-amber-700 border-amber-200",
  standard: "bg-blue-50 text-blue-700 border-blue-200",
  fat: "bg-emerald-50 text-emerald-700 border-emerald-200",
  coast: "bg-violet-50 text-violet-700 border-violet-200",
};

type Props = {
  strategy: FireStrategy;
  onRefresh: () => void;
  refreshing: boolean;
};

export function StrategyCard({ strategy, onRefresh, refreshing }: Props) {
  const [expanded, setExpanded] = useState(false);

  const styleLabel = STYLE_LABEL[strategy.fire_style] ?? strategy.fire_style;
  const styleColor = STYLE_COLOR[strategy.fire_style] ?? "bg-muted text-foreground border-border";

  const date = new Date(strategy.created_at).toLocaleDateString("en-LK", {
    year: "numeric", month: "long", day: "numeric"
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <BookOpen className="size-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold">AI FIRE Strategy</span>
              <span className={cn("text-[10px] font-bold border rounded-full px-2 py-0.5", styleColor)}>
                {styleLabel}
              </span>
              <span className="text-[10px] text-muted-foreground">
                v{strategy.version} · {date}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {strategy.theories_applied.slice(0, 4).map((t) => (
                <span key={t} className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {t}
                </span>
              ))}
              {strategy.theories_applied.length > 4 && (
                <span className="text-[10px] text-muted-foreground">
                  +{strategy.theories_applied.length - 4} more
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1"
            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/60 px-4 py-3">
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">SWR</p>
              <p className="font-ledger text-[15px] mt-0.5">{(strategy.swr * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Base return</p>
              <p className="font-ledger text-[15px] mt-0.5">{(strategy.return_base * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Target age</p>
              <p className="font-ledger text-[15px] mt-0.5">{strategy.target_age ?? "—"}</p>
            </div>
          </div>
          <div className="text-[12px] leading-relaxed">
            <ReactMarkdown
              components={{
                h1: (props) => <h1 className="text-[15px] font-bold text-foreground mt-5 mb-2 first:mt-0">{props.children}</h1>,
                h2: (props) => <h2 className="text-[12px] font-semibold text-foreground uppercase tracking-wide mt-5 mb-1.5 first:mt-0 border-b border-border/40 pb-0.5">{props.children}</h2>,
                h3: (props) => <h3 className="text-[12px] font-semibold text-foreground mt-3 mb-1">{props.children}</h3>,
                h4: (props) => <h4 className="text-[11px] font-semibold text-foreground mt-2 mb-0.5">{props.children}</h4>,
                p: (props) => <p className="text-foreground/75 mb-2 last:mb-0">{props.children}</p>,
                strong: (props) => <strong className="font-semibold text-foreground">{props.children}</strong>,
                em: (props) => <em className="italic text-foreground/70">{props.children}</em>,
                ul: (props) => <ul className="list-disc pl-4 space-y-0.5 mb-2">{props.children}</ul>,
                ol: (props) => <ol className="list-decimal pl-4 space-y-0.5 mb-2">{props.children}</ol>,
                li: (props) => <li className="text-foreground/75">{props.children}</li>,
                hr: () => <hr className="border-border/40 my-3" />,
                blockquote: (props) => <blockquote className="border-l-2 border-primary/40 pl-3 italic text-foreground/60 my-2">{props.children}</blockquote>,
              }}
            >
              {strategy.ai_rationale}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
