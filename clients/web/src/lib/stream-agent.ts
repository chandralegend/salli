import { API_URL } from "./api-client";

export async function* streamAgent(
  token: string,
  message: string,
  threadId: string,
  signal?: AbortSignal
): AsyncGenerator<{ type: string; payload: unknown }> {
  const res = await fetch(`${API_URL}/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ message, thread_id: threadId }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Agent request failed: ${res.status}`);
  }

  if (!res.body) {
    throw new Error("No response body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!;
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") return;
        try {
          yield JSON.parse(raw) as { type: string; payload: unknown };
        } catch {
          // non-JSON line, skip
        }
      }
    }
  }
}
