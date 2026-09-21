import { HealthResponse, QuestionRequest } from "./types";

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("An error occured. Please reload the page.");
  }
  return response.json();
}

export async function* askQuestion(
  params: QuestionRequest,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Context-Type": "application/json" },
    body: JSON.stringify(params),
    signal,
  });

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After"));
    throw new Error(
      retryAfter > 0
        ? `You're asking too fast. Please again in ${retryAfter} seconds.`
        : "You're asking too fast. Please try again in a moment.",
    );
  }

  if (!response.ok || !response.body) {
    throw new Error("An error occured. Please try again.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      yield decoder.decode(value, { stream: true });
    }
    const tail = decoder.decode();
    if (tail) {
      yield tail;
    }
  } finally {
    reader.releaseLock();
  }
}
