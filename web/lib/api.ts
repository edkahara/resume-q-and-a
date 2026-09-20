import { HealthResponse, QuestionRequest } from "./types";

export async function checkHeahlth(): Promise<HealthResponse> {
    const response = await fetch("/api/health", { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Health check failed (${response.status})`)
    }
    return response.json()
}

export async function* askQuestion(
    params: QuestionRequest,
    signal?: AbortSignal,
): AsyncGenerator<string> {
    const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Context-Type": "application/json" },
        body: JSON.stringify(params),
        signal
    })

    if (!response.ok || !response.body) {
        throw new Error(`Ask request failed (${response.status})`)
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break
            }
            yield decoder.decode(value, { stream: true })
        }
        const tail = decoder.decode()
        if (tail) {
            yield tail
        }
    } finally {
        reader.releaseLock()
    }
}