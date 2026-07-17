"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, Cog, Loader2, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApprovalCard } from "./ApprovalCard";
import type { ApprovalAction } from "@/lib/stream-agent";

// ── Part model (mirrors the SSE event stream) ─────────────────────────────────

export type SubagentPart =
  | { type: "token"; content: string }
  | { type: "tool_call"; name: string; input: Record<string, unknown>; done: boolean; output?: string };

export type MessagePart =
  | { type: "text"; content: string }
  | { type: "tool_call"; name: string; input: Record<string, unknown>; done: boolean; output?: string }
  | { type: "approval"; action: ApprovalAction; status: "pending" | "approved" | "denied" }
  | { type: "subagent_section"; agent: string; parts: SubagentPart[]; active: boolean };

const AGENT_LABELS: Record<string, string> = {
  tax_specialist: "Tax Specialist",
  finance_specialist: "Finance Specialist",
};

function toolLabel(name: string): string {
  return name.replaceAll("_", " ");
}

// ── Tool activity row: collapsed line → expandable input/result ──────────────

function ToolActivityRow({
  name,
  input,
  done,
  output,
}: {
  name: string;
  input: Record<string, unknown>;
  done: boolean;
  output?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md bg-white/[0.06] text-[12px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-white/70 hover:text-white transition-colors"
      >
        {done ? <Cog className="size-3.5 shrink-0" /> : <Loader2 className="size-3.5 shrink-0 animate-spin" />}
        <span className="truncate">{toolLabel(name)}</span>
        <span className="text-white/40 ml-auto shrink-0">{done ? "engine" : "running…"}</span>
        <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-white/40">input</p>
          <pre className="rounded bg-black/30 p-2 font-mono text-[11px] text-white/70 overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(input ?? {}, null, 1)}
          </pre>
          {done && output !== undefined && (
            <>
              <p className="text-[10px] uppercase tracking-wider text-white/40">result</p>
              <pre className="rounded bg-black/30 p-2 font-mono text-[11px] text-white/70 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                {output.slice(0, 2000)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Markdown ──────────────────────────────────────────────────────────────────

function Markdown({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div className="chat-markdown text-[14px] leading-relaxed text-white/90 break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      {streaming && <span className="inline-block w-[2px] h-[1em] bg-white/70 align-text-bottom animate-pulse" />}
    </div>
  );
}

// ── Subagent section ──────────────────────────────────────────────────────────

function SubagentSection({ agent, parts, active }: { agent: string; parts: SubagentPart[]; active: boolean }) {
  const [open, setOpen] = useState(false);
  const label = AGENT_LABELS[agent] ?? agent.replaceAll("_", " ");
  return (
    <div className="rounded-md border border-white/12 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-[12px] text-white/70 hover:text-white bg-white/[0.04]"
      >
        {active ? <Loader2 className="size-3.5 animate-spin" /> : <Cog className="size-3.5" />}
        <span className="font-medium">{label}</span>
        <ChevronDown className={cn("size-3.5 ml-auto transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="p-2.5 space-y-2">
          {parts.map((p, i) =>
            p.type === "token" ? (
              <Markdown key={i} content={p.content} />
            ) : (
              <ToolActivityRow key={i} name={p.name} input={p.input} done={p.done} output={p.output} />
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Bubbles ───────────────────────────────────────────────────────────────────

export function UserBubble({ content, attachments }: { content: string; attachments?: string[] }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-xl rounded-br-sm bg-white/10 px-3.5 py-2.5">
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {attachments.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70"
              >
                <Paperclip className="size-3" /> {a}
              </span>
            ))}
          </div>
        )}
        <p className="text-[14px] text-white whitespace-pre-wrap break-words">{content}</p>
      </div>
    </div>
  );
}

export function AssistantMessage({
  parts,
  streaming,
  onApprove,
  onDeny,
}: {
  parts: MessagePart[];
  streaming: boolean;
  onApprove: (partIndex: number) => void;
  onDeny: (partIndex: number) => void;
}) {
  if (parts.length === 0 && streaming) {
    return (
      <div className="flex items-center gap-2 text-white/50 text-[13px]">
        <Loader2 className="size-3.5 animate-spin" /> Thinking…
      </div>
    );
  }
  const lastText = [...parts].reverse().find((p) => p.type === "text");
  return (
    <div className="space-y-2.5">
      {parts.map((p, i) => {
        if (p.type === "text") return <Markdown key={i} content={p.content} streaming={streaming && p === lastText} />;
        if (p.type === "tool_call")
          return <ToolActivityRow key={i} name={p.name} input={p.input} done={p.done} output={p.output} />;
        if (p.type === "subagent_section")
          return <SubagentSection key={i} agent={p.agent} parts={p.parts} active={p.active} />;
        return (
          <ApprovalCard
            key={i}
            action={p.action}
            status={p.status}
            onApprove={() => onApprove(i)}
            onDeny={() => onDeny(i)}
          />
        );
      })}
    </div>
  );
}
