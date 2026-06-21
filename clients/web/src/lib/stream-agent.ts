import { API_URL } from "./api-client";

export type ApprovalAction = {
  type: string;
  action: string;
  description: string;
  params: Record<string, unknown>;
};

export type AgentEvent =
  | { type: "token"; content: string }
  | { type: "tool_call"; name: string; input: Record<string, unknown>; agent?: string }
  | { type: "tool_result"; name: string; output: string; agent?: string }
  | { type: "approval_required"; action: ApprovalAction }
  | { type: "subagent_start"; agent: string }
  | { type: "subagent_end"; agent: string }
  | { type: "subagent_token"; agent: string; content: string }
  | { type: "interrupt"; data: Record<string, unknown> }
  | { type: "error"; message: string }
  | { type: "done" };

async function* _readSse(res: Response): AsyncGenerator<AgentEvent> {
  if (!res.body) throw new Error("No response body from agent");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        for (const line of part.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;
          try {
            const event = JSON.parse(raw) as AgentEvent;
            yield event;
            if (event.type === "done" || event.type === "error") return;
          } catch {
            // malformed JSON — skip
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* streamAgent(
  token: string,
  message: string,
  threadId: string,
  signal?: AbortSignal,
  fileRefs?: string[],
): AsyncGenerator<AgentEvent> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/agent/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ message, thread_id: threadId, file_refs: fileRefs ?? [] }),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    throw err;
  }

  if (!res.ok) throw new Error(`Agent error: ${res.status} ${res.statusText}`);
  yield* _readSse(res);
}

export async function* streamResume(
  token: string,
  threadId: string,
  decision: string,
  signal?: AbortSignal,
  workflow: "chat" | "return" = "chat",
): AsyncGenerator<AgentEvent> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/agent/resume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ thread_id: threadId, decision, workflow }),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    throw err;
  }

  if (!res.ok) throw new Error(`Resume error: ${res.status} ${res.statusText}`);
  yield* _readSse(res);
}

export async function uploadAgentFile(
  token: string,
  file: File,
): Promise<{ file_ref: string; name: string; size: number; mime_type: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/agent/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}
