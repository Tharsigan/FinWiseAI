import OpenAI from "openai";

let singleton = /** @type {OpenAI | null} */ (null);

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  if (!singleton) singleton = new OpenAI({ apiKey: key });
  return singleton;
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}
