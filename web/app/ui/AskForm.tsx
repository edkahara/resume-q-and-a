"use client";

import { askQuestion, checkHealth } from "@/lib/api";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";

type HealthStatus = "checking" | "up" | "down";

export default function AskForm() {
  const abortRef = useRef<AbortController | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("checking");

  useEffect(() => {
    checkHealth()
      .then((response) =>
        setHealthStatus(response.status === "ok" ? "up" : "down"),
      )
      .catch(() => setHealthStatus("down"));

    return () => abortRef.current?.abort();
  }, []);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    if (isStreaming) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setAnswer("");
    setError(null);
    setIsStreaming(true);

    try {
      for await (const chunk of askQuestion(
        { question: question.trim() },
        controller.signal,
      )) {
        setAnswer((prevAnswer) => prevAnswer + chunk);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try asking again.",
        );
      }
    } finally {
      setIsStreaming(false);
    }
  }

  const healthStatusData: Record<
    HealthStatus,
    { color: string; label: string }
  > = {
    up: { color: "bg-green-500", label: "Bot connected. Ask away." },
    down: {
      color: "bg-red-500",
      label: "The bot is not connected. Please reload the page.",
    },
    checking: { color: "bg-zinc-500", label: "Connecting to bot..." },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <span
          className={`h-2 w-2 rounded-full ${healthStatusData[healthStatus].color}`}
        />
        {healthStatusData[healthStatus].label}
      </div>
      <form
        autoComplete="off"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          This is my bot. Ask questions about me and get answers based on my
          resume.
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="How much professional software engineering experience does Edward have?"
            className="resize-y rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-base font-normal outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400"
          />
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isStreaming || question.trim().length < 3}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-40"
          >
            {isStreaming ? "Answering..." : "Ask"}
          </button>
          {isStreaming && (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium dark:border-zinc-700"
            >
              Stop
            </button>
          )}
        </div>
      </form>
      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {(answer || isStreaming) && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Answer
          </h2>
          <div className="whitespace-pre-wrap rounded-md border border-zinc-200 px-4 py-3 leading-7 prose prose-zinc prose-p:my-0 prose-ul:my-0 prose-li:my-0 dark:prose-invert dark:border-zinc-800">
            <Streamdown>{answer}</Streamdown>
            {isStreaming && <span className="animate-pulse">▍</span>}
          </div>
        </section>
      )}
    </div>
  );
}
