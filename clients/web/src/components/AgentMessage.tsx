"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Brain, ChevronDown, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApprovalCard } from "@/components/ApprovalCard";
import { Logo } from "@/components/Logo";
import type { ApprovalAction } from "@/lib/stream-agent";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SubagentPart =
  | { type: "token"; content: string }
  | { type: "tool_call"; name: string; input: Record<string, unknown>; done: boolean; output?: string };

export type MessagePart =
  | { type: "text"; content: string }
  | { type: "tool_call"; name: string; input: Record<string, unknown>; done: boolean; output?: string }
  | { type: "approval"; action: ApprovalAction; status: "pending" | "approved" | "denied" }
  | { type: "subagent_section"; agent: string; parts: SubagentPart[]; active: boolean };

// ── Worker metadata ────────────────────────────────────────────────────────────

const WORKER_META: Record<string, { label: string; badge: string; border: string }> = {
  tax_specialist: {
    label: "Tax Specialist",
    badge: "text-blue-700 bg-blue-50 border-blue-200",
    border: "border-blue-200",
  },
  finance_specialist: {
    label: "Finance Specialist",
    badge: "text-purple-700 bg-purple-50 border-purple-200",
    border: "border-purple-200",
  },
};

// ── Tool label factory ─────────────────────────────────────────────────────────

type ToolLabel = { doing: string; done: string };

function getToolLabel(name: string, input: Record<string, unknown>): ToolLabel {
  const str   = (v: unknown) => (typeof v === "string" ? v : "");
  const trunc = (s: string, n = 52) => (s.length > n ? s.slice(0, n) + "…" : s);

  const query = str(input?.query);
  const title = str(input?.title);
  const slug  = str(input?.slug);
  const acct  = str(input?.name);
  const desc  = str(input?.description);

  switch (name) {
    case "transfer_to_tax_specialist":
      return { doing: "Routing to Tax Specialist",     done: "Routed to Tax Specialist" };
    case "transfer_to_finance_specialist":
      return { doing: "Routing to Finance Specialist", done: "Routed to Finance Specialist" };

    case "tavily_search_results_json":
    case "web_search":
      return {
        doing: query ? `Searching the web for "${trunc(query)}"` : "Searching the web",
        done:  query ? `Searched the web for "${trunc(query)}"` : "Searched the web",
      };

    case "save_document":
      return {
        doing: title ? `Saving "${trunc(title)}"` : "Saving document",
        done:  title ? `Saved "${trunc(title)}"` : "Saved document",
      };
    case "read_document":   return { doing: "Reading document",   done: "Read document" };
    case "update_document": return { doing: "Updating document",  done: "Updated document" };
    case "list_documents":  return { doing: "Browsing documents", done: "Browsed documents" };
    case "delete_document": return { doing: "Deleting document",  done: "Deleted document" };

    case "save_memory":
      return {
        doing: slug ? `Saving memory "${trunc(slug, 40)}"` : "Saving memory",
        done:  slug ? `Saved memory "${trunc(slug, 40)}"` : "Saved memory",
      };
    case "get_memory":
      return {
        doing: slug ? `Recalling "${trunc(slug, 40)}"` : "Recalling memory",
        done:  slug ? `Recalled "${trunc(slug, 40)}"` : "Recalled memory",
      };
    case "list_memories":          return { doing: "Reading memories",        done: "Read memories" };
    case "get_trial_balance":      return { doing: "Fetching trial balance",  done: "Fetched trial balance" };
    case "get_accounts":           return { doing: "Fetching accounts",       done: "Fetched accounts" };
    case "get_tax_computation":    return { doing: "Computing tax",           done: "Computed tax" };
    case "list_tax_packs":         return { doing: "Loading tax packs",       done: "Loaded tax packs" };
    case "explain_tax_band":       return { doing: "Looking up tax band",     done: "Looked up tax band" };
    case "get_ledger_entries_summary":
      return { doing: "Fetching ledger entries", done: "Fetched ledger entries" };

    case "create_account":
      return {
        doing: acct ? `Creating account "${trunc(acct)}"` : "Creating account",
        done:  acct ? `Created account "${trunc(acct)}"` : "Created account",
      };
    case "create_reminder":
      return {
        doing: desc ? `Creating reminder: ${trunc(desc, 44)}` : "Creating reminder",
        done:  desc ? `Created reminder: ${trunc(desc, 44)}` : "Created reminder",
      };
    case "post_journal_entry":
      return { doing: "Posting journal entry", done: "Posted journal entry" };

    default:
      return { doing: name.replace(/_/g, " "), done: name.replace(/_/g, " ") };
  }
}

// ── Tool call line ─────────────────────────────────────────────────────────────

function ToolCallLine({
  name,
  input,
  done,
}: {
  name: string;
  input: Record<string, unknown>;
  done: boolean;
}) {
  const { doing, done: doneLabel } = getToolLabel(name, input);
  return (
    <p className="text-[12px] text-muted-foreground my-1 leading-tight">
      <span className="opacity-40 mr-1">›</span>
      {done ? doneLabel : doing}
    </p>
  );
}

// ── Markdown (always rendered, streaming just adds a blinking cursor) ──────────

function MarkdownContent({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p:  ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
          h1: ({ children }) => <h1 className="text-base font-semibold mt-4 mb-2 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-[13px] font-semibold mt-3 mb-1.5 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-[12px] font-semibold mt-2 mb-1 first:mt-0">{children}</h3>,
          ul: ({ children }) => <ul className="mb-3 space-y-1 pl-4 list-disc last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 space-y-1 pl-4 list-decimal last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700 hover:decoration-blue-500 transition-colors inline-flex items-center gap-0.5"
            >
              {children}
              <ExternalLink className="size-2.5 opacity-50 shrink-0" />
            </a>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <code className="block bg-background/60 rounded-md px-3 py-2 text-[11px] font-mono overflow-x-auto mb-2 border border-border/50 whitespace-pre">
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-background/60 rounded px-1 py-0.5 text-[11px] font-mono border border-border/40">
                {children}
              </code>
            );
          },
          pre:        ({ children }) => <pre className="mb-3 last:mb-0">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/40 pl-3 text-muted-foreground italic mb-3">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-[12px] border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border/60 bg-muted/50 px-2 py-1 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border border-border/60 px-2 py-1 tabular-nums">{children}</td>
          ),
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          hr:     () => <hr className="my-3 border-border/60" />,
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Blinking caret while generating — separate from markdown DOM so it never disrupts layout */}
      {streaming && (
        <span
          className="inline-block w-[2px] h-[13px] bg-foreground/40 rounded-sm ml-[2px] align-middle"
          style={{ animation: "cursor-blink 1s step-end infinite" }}
        />
      )}
    </>
  );
}

// ── Subagent section (collapsible) ────────────────────────────────────────────

function SubagentSection({
  section,
  streaming,
}: {
  section: Extract<MessagePart, { type: "subagent_section" }>;
  streaming?: boolean;
}) {
  // Only the specialist's long text response is collapsible.
  // Tool calls are always shown so the user can see what work was done.
  const [textExpanded, setTextExpanded] = useState(false);

  const meta = WORKER_META[section.agent] ?? {
    label:  section.agent,
    badge:  "text-gray-600 bg-gray-50 border-gray-200",
    border: "border-gray-200",
  };

  const textContent = section.parts
    .filter(p => p.type === "token")
    .map(p => (p.type === "token" ? p.content : ""))
    .join("");

  const toolCalls = section.parts.filter(p => p.type === "tool_call");

  return (
    <div className="my-2 block">
      {/* Badge + always-visible tool calls */}
      <div className={cn("border-l-2 pl-3", meta.border)}>
        {/* Agent badge */}
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border select-none",
              meta.badge,
            )}
          >
            <Brain className="size-2.5 shrink-0" />
            {meta.label}
            {section.active && <Loader2 className="size-2.5 animate-spin shrink-0 ml-0.5" />}
          </span>
        </div>

        {/* Tool calls — always visible */}
        {toolCalls.map((p, i) =>
          p.type === "tool_call" ? (
            <ToolCallLine key={i} name={p.name} input={p.input} done={p.done} />
          ) : null
        )}

        {/* Specialist text — collapsible */}
        {textContent && (
          <>
            <button
              type="button"
              onClick={() => setTextExpanded(e => !e)}
              className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground flex items-center gap-1 mt-1 transition-colors"
            >
              <ChevronDown
                className={cn("size-3 transition-transform duration-150", textExpanded && "rotate-180")}
              />
              {textExpanded ? "Hide detail" : "Show detail"}
            </button>
            {textExpanded && (
              <div className="mt-1.5 text-[12px] text-muted-foreground">
                <MarkdownContent
                  content={textContent}
                  streaming={streaming && section.active}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Exported bubbles ──────────────────────────────────────────────────────────

interface AssistantBubbleProps {
  parts: MessagePart[];
  streaming?: boolean;
  onApprove?: (partIndex: number) => void;
  onDeny?: (partIndex: number) => void;
}

export function AssistantBubble({ parts, streaming, onApprove, onDeny }: AssistantBubbleProps) {
  return (
    <div className="flex justify-start w-full">
      <Logo className="size-6 rounded-md mt-0.5 mr-3" />

      <div className="max-w-[85%] text-[13px] text-foreground min-w-0">
        {parts.map((part, i) => {
          if (part.type === "text") {
            if (!part.content && !streaming) return null;
            const isLast = i === parts.length - 1;
            return (
              <MarkdownContent
                key={i}
                content={part.content}
                streaming={streaming && isLast}
              />
            );
          }

          if (part.type === "tool_call") {
            return <ToolCallLine key={i} name={part.name} input={part.input} done={part.done} />;
          }

          if (part.type === "approval") {
            return (
              <ApprovalCard
                key={i}
                action={part.action}
                status={part.status}
                onApprove={() => onApprove?.(i)}
                onDeny={() => onDeny?.(i)}
              />
            );
          }

          if (part.type === "subagent_section") {
            return <SubagentSection key={i} section={part} streaming={streaming} />;
          }

          return null;
        })}

        {/* Fallback caret when no parts yet but stream has started */}
        {streaming && parts.length === 0 && (
          <span
            className="inline-block w-[2px] h-[13px] bg-foreground/40 rounded-sm align-middle"
            style={{ animation: "cursor-blink 1s step-end infinite" }}
          />
        )}
      </div>
    </div>
  );
}

export function UserBubble({ content, attachments }: { content: string; attachments?: string[] }) {
  return (
    <div className="flex justify-end w-full">
      <div className="max-w-[80%] space-y-1">
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end">
            {attachments.map((name, i) => (
              <span
                key={i}
                className="text-[11px] bg-foreground/10 rounded-full px-2.5 py-0.5 text-foreground/70"
              >
                {name}
              </span>
            ))}
          </div>
        )}
        <div className="px-4 py-2.5 rounded-2xl rounded-br-sm bg-foreground text-background text-[13px] leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
}
