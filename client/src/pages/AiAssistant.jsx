import { useEffect, useMemo, useRef, useState } from "react";
import AskYourMoney from "../components/intelligence/AskYourMoney.jsx";
import DemoBadge from "../components/DemoBadge.jsx";
import { FriendlyErrorState, TypingIndicator } from "../components/FinwiseUI.jsx";
import PageHeading from "../components/PageHeading.jsx";
import ShellPageBody from "../components/ShellPageBody.jsx";
import {
  fetchAiStatus,
  postAiChat,
} from "../services/api.js";

const SUGGESTIONS = [
  "How do I stretch LKR 65,000 for rent, food, and Dial transport around Colombo?",
  "Give me three weekly habits to curb impulse food spending.",
  "How much emergency buffer should I keep during semester finals?",
];

export default function AiAssistantPage() {
  /** @type {React.MutableRefObject<{role:'user'|'assistant'; content:string}[]>} */
  const transcriptRef = useRef([]);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(
    /** @type {{ role: 'user' | 'assistant'; content: string }[]} */ ([]),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [aiCaps, setAiCaps] = useState(
    /** @type {{ configured: boolean; model: string } | null} */ (null),
  );

  useEffect(() => {
    fetchAiStatus()
      .then(setAiCaps)
      .catch(() =>
        setAiCaps({ configured: false, model: "unavailable (status route error)" }),
      );
  }, []);

  const statusLine = useMemo(() => {
    if (!aiCaps) return "Checking OpenAI readiness…";
    if (!aiCaps.configured)
      return "AI coaching is in safe demo mode while the assistant reconnects.";
    return `Model · ${aiCaps.model}`;
  }, [aiCaps]);

  async function submitMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);

    const pair = transcriptRef.current;

    const optimistic = [
      ...messages,
      { role: /** @type {'user'} */ ("user"), content: trimmed },
    ];
    setMessages(optimistic);

    try {
      const data = /** @type {{ reply?: string }} */ (await postAiChat({
        message: trimmed,
        history: pair.slice(-10),
      }));

      const assistantMsg = {
        role: /** @type {'assistant'} */ ("assistant"),
        content:
          typeof data.reply === "string"
            ? data.reply
            : "No response text returned.",
      };

      pair.push({ role: "user", content: trimmed });
      pair.push({ role: "assistant", content: assistantMsg.content });

      setMessages((prev) => [...prev, assistantMsg]);
      setInput("");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : String(submissionError),
      );
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ShellPageBody>
      <div className="flex flex-col gap-4 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-xl flex-1 space-y-2">
            <PageHeading eyebrow="Copilot" title="AI financial assistant" />
            <p className="text-sm leading-snug text-fw-muted">
              Ask for student budgeting, spending, and savings guidance. FinWise keeps the
              chat interface stable even if the AI service is reconnecting.
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fw-red-600">
              {statusLine}
            </p>
          </div>
          <DemoBadge />
        </div>

      <section className="finwise-card rounded-[1.35rem] p-4 backdrop-blur sm:p-5">
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={busy}
              onClick={() => submitMessage(prompt)}
              className="rounded-full border border-fw-rose-soft bg-fw-rose-soft/50 px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-fw-red-700 ring-fw-border/50 transition hover:scale-[1.02] hover:border-fw-red-400 hover:bg-fw-panel disabled:opacity-50 dark:ring-white/15"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4 rounded-2xl border border-fw-border bg-fw-section/80 p-3 dark:bg-fw-section/40 sm:p-4">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-fw-muted">
              Ask anything about budgets, transport, or tuition pacing — we will thread
              the last few exchanges automatically.
            </p>
          ) : null}
          {messages.map((bubble, index) => (
            <article
              key={`${index}-${bubble.role}-${bubble.content.slice(0, 24)}`}
              className={`flex ${bubble.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md sm:max-w-xl ${
                  bubble.role === "user"
                    ? "bg-gradient-to-br from-fw-red-600 to-fw-red-500 text-white"
                    : "border border-fw-rose-soft bg-fw-panel text-fw-ink shadow-md dark:shadow-black/30"
                }`}
              >
                <p className="whitespace-pre-wrap">{bubble.content}</p>
              </div>
            </article>
          ))}
          {busy ? <TypingIndicator /> : null}
        </div>

        {error ? (
          <div className="mt-4">
            <FriendlyErrorState
              title="AI assistant is reconnecting"
              message="Your finance dashboard still works with cached banking data. Try again in a moment for AI guidance."
              onRetry={() => submitMessage(input || SUGGESTIONS[0])}
            />
          </div>
        ) : null}

        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            submitMessage(input);
          }}
        >
          <label className="sr-only" htmlFor="finwise-chat-input">
            Message
          </label>
          <textarea
            id="finwise-chat-input"
            rows={2}
            value={input}
            disabled={busy}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Example: How do I save LKR 8,000 monthly for a laptop fund?"
            className="w-full flex-1 rounded-2xl border border-fw-border bg-fw-panel px-4 py-3 text-sm text-fw-ink shadow-inner outline-none ring-fw-red-600/25 transition placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-2xl bg-gradient-to-b from-[#E31D23] to-[#B81419] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-fw-red-700/35 transition hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:grayscale"
          >
            {busy ? "Thinking…" : "Send"}
          </button>
        </form>

        <p className="mt-3 text-xs leading-snug text-fw-muted">
          Disclaimer: Outputs are informational and may be inaccurate — double-check anything
          that affects money, visas, scholarships, or legal obligations.
        </p>
      </section>

      <AskYourMoney />
      </div>
    </ShellPageBody>
  );
}
