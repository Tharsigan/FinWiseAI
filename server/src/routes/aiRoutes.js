import OpenAI from "openai";
import { Router } from "express";

import { failure, success } from "../http/response.js";
import { streamlessChatCompletion } from "../services/aiChatService.js";
import { generateScholarshipIdeas } from "../services/aiScholarshipService.js";
import { narrateSavingsPlan } from "../services/aiSavingsService.js";
import { getOpenAI, getOpenAIModel } from "../services/openaiClient.js";

export const aiRouter = Router();

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

/** @typedef {Record<string,string>} HintMap */

/** @param {string} endpoint
 * @param {import('express').Response} res
 * @param {HintMap} [hints]
 */
function notReady(endpoint, res, hints) {
  // #region agent log
  agentDebugLog("H2", "server/src/routes/aiRoutes.js:39", "ai route returned not ready", {
    endpoint,
    hasOpenAIClient: Boolean(getOpenAI()),
    model: getOpenAIModel(),
    hintKeys: hints ? Object.keys(hints) : [],
  });
  // #endregion
  failure(res, 503, "FEATURE_NOT_CONFIGURED", "Awaiting upstream configuration.", {
    endpoint,
    configure: hints,
  });
}

/**
 * @param {import('express').Response} res
 * @param {unknown} error
 */
function handleAiPipelineError(res, error) {
  console.error("[ai]", error);
  const isOpenAiError = error instanceof OpenAI.APIError;
  // #region agent log
  agentDebugLog("H3,H4", "server/src/routes/aiRoutes.js:61", "ai pipeline error handled", {
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : String(error),
    isOpenAiError,
    openAiStatus: isOpenAiError ? error.status : null,
    openAiCode: isOpenAiError ? error.code : null,
  });
  // #endregion

  if (typeof error === "object" && error && "message" in error) {
    const msg = String(/** @type {{message?:unknown}} */ (error).message);
    if (msg === "OPENAI_NOT_CONFIGURED") {
      notReady("/api/ai", res, {
        OPENAI_API_KEY: "Required for live Phase 5 routes",
      });
      return;
    }
    if (msg === "SCHOLARSHIP_JSON_PARSE" || msg === "SCHOLARSHIP_INVALID_SHAPE") {
      failure(
        res,
        502,
        "SCHOLARSHIP_MODEL_PARSE",
        "Model returned unreadable scholarship JSON — retry with a simpler profile.",
      );
      return;
    }
    if (msg === "SCHOLARSHIP_LIVE_SEARCH_EMPTY") {
      failure(
        res,
        502,
        "SCHOLARSHIP_LIVE_SEARCH_EMPTY",
        "Live scholarship search did not return usable official sources. Please retry or adjust the profile.",
      );
      return;
    }
    if (msg === "SAVINGS_JSON_PARSE" || msg === "SAVINGS_INVALID_SHAPE") {
      failure(
        res,
        502,
        "SAVINGS_MODEL_PARSE",
        "Model returned unreadable savings narration — please retry.",
      );
      return;
    }
  }

  if (error instanceof OpenAI.APIError) {
    const status = error.status && error.status >= 400 ? error.status : 502;
    failure(
      res,
      status >= 500 ? 502 : 400,
      "OPENAI_UPSTREAM",
      error.message || "OpenAI request failed.",
    );
    return;
  }

  failure(res, 500, "AI_FAILURE", "Unexpected AI pipeline error.");
}

aiRouter.post("/chat", async (req, res) => {
  if (!getOpenAI()) {
    notReady("/api/ai/chat", res, {
      OPENAI_API_KEY: "gpt-4o-mini via backend `.env`",
    });
    return;
  }

  const message =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) {
    failure(res, 400, "MISSING_MESSAGE", "Provide `message` (string) in JSON body.");
    return;
  }

  const history =
    Array.isArray(req.body?.history) ? req.body.history : [];

  try {
    const result = await streamlessChatCompletion({
      userMessage: message,
      history,
    });
    success(
      res,
      {
        reply: result.reply,
        model: result.modelUsed,
        usage: result.usage,
        finishReason: result.finishReason,
        disclaimer:
          "Informational guidance only — not professional financial/legal advice.",
      },
      { source: "openai", meta: { model: result.modelUsed } },
    );
  } catch (err) {
    handleAiPipelineError(res, err);
  }
});

aiRouter.post("/scholarships", async (req, res) => {
  if (!getOpenAI()) {
    notReady("/api/ai/scholarships", res, {
      OPENAI_API_KEY: "scholarship scout",
    });
    return;
  }

  try {
    const form = normalizeScholarshipPayload(req.body);
    const bundle = await generateScholarshipIdeas(form);

    success(
      res,
      {
        disclaimer: bundle.disclaimer,
        scholarships: bundle.scholarships,
        checkedAt: bundle.checkedAt,
        liveSources: bundle.liveSources,
        sourceErrors: bundle.sourceErrors,
        usage: bundle.usage,
        disclaimerFooter:
          "Live web sources are checked at request time. Verify every deadline, criterion, and link on official program pages.",
      },
      {
        source: "openai+live_search",
        meta: { model: bundle.modelUsed, checkedAt: bundle.checkedAt },
      },
    );
  } catch (err) {
    handleAiPipelineError(res, err);
  }
});

aiRouter.post("/savings-plan", async (req, res) => {
  if (!getOpenAI()) {
    notReady("/api/ai/savings-plan", res, {
      OPENAI_API_KEY: "savings narration",
    });
    return;
  }

  const parsed = parseSavingsPayload(req.body);
  if (!parsed.ok) {
    failure(res, 400, parsed.code, parsed.message);
    return;
  }

  try {
    const bundle = await narrateSavingsPlan(parsed.value);
    success(
      res,
      {
        goal: bundle.goal,
        computed: bundle.computed,
        recommendation: bundle.recommendation,
        scenarios: bundle.scenarios,
        milestones: bundle.milestones,
        narration: bundle.narration,
        usage: bundle.usage,
        model: bundle.modelUsed,
        deterministicNote:
          "Monthly requirement & feasibility are computed server-side — the model explains only.",
      },
      { source: "openai", meta: { model: bundle.modelUsed } },
    );
  } catch (err) {
    handleAiPipelineError(res, err);
  }
});

/** Always expose configured model metadata for dashboards */
aiRouter.get("/status", (_req, res) => {
  // #region agent log
  agentDebugLog("H1,H2", "server/src/routes/aiRoutes.js:213", "ai status route reached", {
    configured: Boolean(getOpenAI()),
    model: getOpenAIModel(),
  });
  // #endregion
  success(
    res,
    {
      configured: Boolean(getOpenAI()),
      model: getOpenAIModel(),
    },
    { source: "control_plane" },
  );
});

/** @param {unknown} body */
function normalizeScholarshipPayload(body) {
  const bucket = body && typeof body === "object" ? body : {};
  const b = /** @type {Record<string, unknown>} */ (bucket);

  const studentPath = normalizeStudentPath(b.studentPath);
  const degreeLevel = degreeLevelForPath(studentPath, b.degreeLevel);
  const alStream = stringField(b.alStream, "Physical Science");
  const district = stringField(b.district, "Colombo");
  const zScore = stringField(b.zScore, "");
  const alYear = stringField(b.alYear, "2025");
  const subjectResults = stringField(b.subjectResults, "");
  const intendedCourse = stringField(b.intendedCourse, "Engineering");
  const targetIntake = stringField(b.targetIntake, "");
  const fieldOfStudy =
    studentPath === "AL_PASSOUT"
      ? intendedCourse
      : stringField(b.fieldOfStudy, "Computer Science");
  const academicStanding =
    studentPath === "AL_PASSOUT"
      ? [
          `A/L stream: ${alStream}`,
          district ? `District: ${district}` : "",
          zScore ? `Z-score: ${zScore}` : "",
          alYear ? `Attempt year: ${alYear}` : "",
          subjectResults ? `Results: ${subjectResults}` : "",
        ]
          .filter(Boolean)
          .join("; ")
      : stringField(b.academicStanding, "Second year");
  const financialNeed = stringField(b.financialNeed, "medium");
  const educationGoal = stringField(
    b.educationGoal,
    "Fund postgraduate tuition abroad within 24 months.",
  );

  /** @type {string[]} */
  let preferredCountries = [];
  if (Array.isArray(b.preferredCountries)) {
    preferredCountries = b.preferredCountries
      .filter((x) => typeof x === "string" && x.trim())
      .map((x) => x.trim())
      .slice(0, 8);
  } else if (typeof b.preferredCountries === "string" && b.preferredCountries.trim()) {
    preferredCountries = b.preferredCountries
      .split(/[,;/]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  if (preferredCountries.length === 0)
    preferredCountries = ["Sri Lanka", "United Kingdom"];

  return {
    studentPath,
    degreeLevel,
    fieldOfStudy,
    academicStanding,
    preferredCountries,
    financialNeed,
    educationGoal,
    profileDetails: {
      alStream,
      district,
      zScore,
      alYear,
      subjectResults,
      intendedCourse,
      targetIntake,
    },
  };
}

/** @param {unknown} raw */
function normalizeStudentPath(raw) {
  const value = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (value === "AL_PASSOUT" || value === "UNDERGRADUATE" || value === "POSTGRADUATE") {
    return value;
  }
  return "UNDERGRADUATE";
}

/** @param {string} studentPath @param {unknown} rawDegreeLevel */
function degreeLevelForPath(studentPath, rawDegreeLevel) {
  if (studentPath === "AL_PASSOUT") return "A/L Passout";
  if (studentPath === "POSTGRADUATE") return "Postgraduate";
  return stringField(rawDegreeLevel, "Undergraduate");
}

/** @param {unknown} raw @param {string} fallback */
function stringField(raw, fallback) {
  if (typeof raw === "string" && raw.trim().length > 0) return raw.trim().slice(0, 420);
  return fallback;
}

/** @param {unknown} body */
function parseSavingsPayload(body) {
  const bucket = body && typeof body === "object" ? body : {};
  const b = /** @type {Record<string, unknown>} */ (bucket);

  const goalLabel = stringField(b.goalLabel, "Education milestone");

  const nums = [
    ["targetAmount", b.targetAmount],
    ["currentSavings", b.currentSavings ?? 0],
    ["monthlyIncome", b.monthlyIncome],
    ["monthlyExpenses", b.monthlyExpenses],
    ["monthsRemaining", b.monthsRemaining],
  ];

  /** @type {Record<string, number>} */
  const values = {};

  for (const [key, raw] of nums) {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      return {
        ok: /** @type {const} */ (false),
        code: "INVALID_NUMBER",
        message: `Provide a numeric ${key}.`,
      };
    }
    values[key] = n;
  }

  if (values.targetAmount <= 0) {
    return {
      ok: /** @type {const} */ (false),
      code: "INVALID_TARGET",
      message: "targetAmount must be greater than zero.",
    };
  }

  if (values.monthsRemaining <= 0 || values.monthsRemaining > 480) {
    return {
      ok: /** @type {const} */ (false),
      code: "INVALID_HORIZON",
      message: "monthsRemaining must be between 1 and 480.",
    };
  }

  return {
    ok: /** @type {const} */ (true),
    value: {
      goalLabel,
      goalType: stringField(b.goalType, "education"),
      targetAmount: values.targetAmount,
      currentSavings: Math.max(0, values.currentSavings),
      monthlyIncome: Math.max(0, values.monthlyIncome),
      monthlyExpenses: Math.max(0, values.monthlyExpenses),
      monthsRemaining: Math.round(values.monthsRemaining),
    },
  };
}
