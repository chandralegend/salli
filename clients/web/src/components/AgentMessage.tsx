import { cn } from "@/lib/utils";

interface AgentMessageProps {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export function AgentMessage({ role, content, streaming }: AgentMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[75%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-secondary text-foreground rounded-[16px_16px_4px_16px]"
            : "bg-primary/10 border border-primary/30 text-foreground rounded-[16px_16px_16px_4px]",
          streaming && "streaming-cursor"
        )}
      >
        {content}
      </div>
    </div>
  );
}
