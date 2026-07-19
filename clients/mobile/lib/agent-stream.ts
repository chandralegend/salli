import EventSource from "react-native-sse";

import { API_URL } from "./api-client";
import { useSalliStore } from "./store";

export type AgentEvent =
  | { type: "token"; content: string }
  | { type: "tool_call"; name: string; input?: Record<string, unknown>; agent?: string }
  | { type: "tool_result"; name: string; output?: unknown; agent?: string }
  | { type: "approval_required"; action: Record<string, unknown> }
  | { type: "subagent_start"; agent: string }
  | { type: "subagent_end"; agent: string }
  | { type: "subagent_token"; agent: string; content: string }
  | { type: "interrupt"; data: unknown }
  | { type: "done" }
  | { type: "error"; message: string };

/**
 * Opens the agent chat SSE stream via a POST body (react-native-sse's
 * EventSource, since the platform fetch API has no native SSE reader).
 * Returns a close() function; onEvent fires for every parsed frame.
 */
export function streamAgentChat(
  path: "/agent/chat" | "/agent/resume",
  body: Record<string, unknown>,
  onEvent: (event: AgentEvent) => void,
  onError: (message: string) => void,
): () => void {
  const token = useSalliStore.getState().token;

  const es = new EventSource(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  es.addEventListener("message", (event) => {
    if (!event.data) return;
    try {
      onEvent(JSON.parse(event.data) as AgentEvent);
    } catch {
      // ignore malformed frames
    }
  });

  es.addEventListener("error", (event) => {
    onError("message" in event ? event.message : "Connection error.");
  });

  return () => es.close();
}
