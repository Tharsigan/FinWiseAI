import { getOpenAI, getOpenAIModel } from "./openaiClient.js";

// #region agent log
function agentDebugLog(hypothesisId, location, message, data = {}) {
  fetch("http://127.0.0.1:7696/ingest/3618caac-287e-430a-889c-170d00c6a77b", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "e76d53",
    },
    body: JSON.stringify({
      sessionId: "e76d53",
      runId: "initial",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

const SYSTEM_CHAT = [
  "You are FinWise AI — a pragmatic financial coach for Sri Lankan university students.",
  "Use LKR (Sri Lankan Rupees) as the primary currency anchor when referencing money.",
  "Give realistic, budgeting-first guidance (food/transport/boarding/mobile/study expenses). Avoid encouraging debt or speculative investing.",
  "Always note that guidance is informational, not professional, legal, or tax advice.",
  "Do not promise scholarships, loan approvals, or guaranteed returns.",
  "Keep answers concise (max ~6 short paragraphs) with bullet lists when helpful.",
].join(" ");

/**
 * @param {{ userMessage: string; history: { role: 'user'|'assistant'; content: string }[] }} input
 */
export async function streamlessChatCompletion(input) {
  const client = getOpenAI();
  if (!client) throw new Error("OPENAI_NOT_CONFIGURED");

  const sanitizedHistory = sanitizeHistory(input.history);
  /** @type {import('openai').OpenAI.Chat.Completions.ChatCompletionMessageParam[]} */
  const payload = [
    { role: "system", content: SYSTEM_CHAT },
    ...sanitizedHistory,
    { role: "user", content: truncate(input.userMessage, 7000) },
  ];

  // #region agent log
  agentDebugLog("H3", "server/src/services/aiChatService.js:48", "chat openai request starting", {
    model: getOpenAIModel(),
    messageLength: input.userMessage.length,
    sanitizedHistoryCount: sanitizedHistory.length,
  });
  // #endregion
  const completion = await client.chat.completions.create({
    model: getOpenAIModel(),
    temperature: 0.35,
    max_tokens: 900,
    messages: payload,
  });

  const text = completion.choices[0]?.message?.content ?? "";
  // #region agent log
  agentDebugLog("H3", "server/src/services/aiChatService.js:61", "chat openai response received", {
    model: completion.model,
    replyLength: text.trim().length,
    finishReason: completion.choices[0]?.finish_reason ?? null,
    promptTokens: completion.usage?.prompt_tokens ?? null,
    completionTokens: completion.usage?.completion_tokens ?? null,
  });
  // #endregion
  return {
    reply: text.trim(),
    usage: completion.usage ?? null,
    finishReason: completion.choices[0]?.finish_reason ?? null,
    modelUsed: completion.model,
  };
}

/**
 * @param {unknown[]} rows
 */
function sanitizeHistory(rows) {
  if (!Array.isArray(rows)) return [];

  /** @type {{ role:'user'|'assistant'; content: string }[]} */
  const out = [];
  for (const raw of rows.slice(-24)) {
    if (!raw || typeof raw !== "object") continue;
    const role = /** @type {{role?:unknown}} */ (raw).role;
    const content = /** @type {{content?:unknown}} */ (raw).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string" || !content.trim()) continue;
    out.push({
      role,
      content: truncate(content.trim(), 4000),
    });
  }
  return out;
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n…[truncated]`;
}
