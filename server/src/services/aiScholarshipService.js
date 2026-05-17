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

/** @typedef {{ studentPath:string; degreeLevel:string; fieldOfStudy:string; academicStanding:string; preferredCountries:string[]; financialNeed:string; educationGoal:string; profileDetails:Record<string,string>; }} ScholarshipForm */
/** @typedef {{ title:string; url:string; displayUrl:string; snippet:string; query:string; officialHint:string; rank:number; }} ScholarshipSource */

/** @param {ScholarshipForm} form
 * @param {{ checkedAt:string; sources:ScholarshipSource[]; errors:string[] }} liveContext
 */
function buildPrompt(form, liveContext) {
  return [
    "You scout scholarships/admissions aid for Sri Lankan students pursuing higher education domestically OR abroad.",
    "Return VALID JSON ONLY (no prose before/after JSON). Structure:",
    '{"disclaimer":string,"scholarships":[{"name":string,"region":string,"level":string,"eligibility":string,"fundingCoverage":string,"deadline":string,"sourceTitle":string,"sourceUrl":string,"sourceSnippet":string,"applicationTips":string[],"verifyUrlHint":string,"notes":string,"freshness":string}]}',
    "Use the LIVE SEARCH SOURCES below as the only source of specific scholarship names, URLs, and deadline claims.",
    "If a deadline or funding amount is not visible in the source title/snippet, write 'Verify on official source' rather than guessing.",
    "Prefer official university, government, embassy, and scholarship-provider pages over blogs or aggregators.",
    "For AL_PASSOUT profiles, prioritize scholarships or admissions aid that mention Sri Lankan GCE A/L, Z-score, district, stream, entrance results, or first-degree entry.",
    "For UNDERGRADUATE and POSTGRADUATE profiles, prioritize sources matching the current study level, field, GPA/class, and target country.",
    "disclaimer must remind the user that results were web-checked at checkedAt and official pages are the final authority.",
    "Scholarships array: 4 to 8 items realistic for described profile; omit weak or irrelevant sources.",
    "sourceUrl must be copied from a provided live source — never invent exact URLs.",
    "Use practical advice; avoid guarantees of acceptance.",
    "",
    "PROFILE JSON:",
    JSON.stringify(form, null, 2),
    "",
    "LIVE SEARCH CONTEXT JSON:",
    JSON.stringify(liveContext, null, 2),
  ].join("\n");
}

/** @param {ScholarshipForm} form */
export async function generateScholarshipIdeas(form) {
  const client = getOpenAI();
  if (!client) throw new Error("OPENAI_NOT_CONFIGURED");
  const liveContext = await discoverScholarshipSources(form);
  if (liveContext.sources.length === 0) {
    throw new Error("SCHOLARSHIP_LIVE_SEARCH_EMPTY");
  }

  // #region agent log
  agentDebugLog("H3,H4", "server/src/services/aiScholarshipService.js:46", "scholarship openai request starting", {
    model: getOpenAIModel(),
    preferredCountryCount: form.preferredCountries.length,
    fieldLength: form.fieldOfStudy.length,
    goalLength: form.educationGoal.length,
    liveSourceCount: liveContext.sources.length,
  });
  // #endregion
  const completion = await client.chat.completions.create({
    model: getOpenAIModel(),
    temperature: 0.55,
    max_tokens: 1400,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are FinWise scholarship discovery copilot. Ground every specific scholarship detail in provided live web search sources and be conservative.",
      },
      { role: "user", content: buildPrompt(form, liveContext) },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  // #region agent log
  agentDebugLog("H3,H4", "server/src/services/aiScholarshipService.js:68", "scholarship openai response received", {
    model: completion.model,
    rawLength: raw.length,
    finishReason: completion.choices[0]?.finish_reason ?? null,
    promptTokens: completion.usage?.prompt_tokens ?? null,
    completionTokens: completion.usage?.completion_tokens ?? null,
  });
  // #endregion

  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // #region agent log
    agentDebugLog("H4", "server/src/services/aiScholarshipService.js:82", "scholarship json parse failed", {
      rawLength: raw.length,
      rawPrefix: raw.slice(0, 80),
    });
    // #endregion
    throw new Error("SCHOLARSHIP_JSON_PARSE");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("SCHOLARSHIP_INVALID_SHAPE");
  }

  /** @type {Record<string, unknown>} */
  const obj = /** @type {Record<string, unknown>} */ (parsed);
  const disclaimer =
    typeof obj.disclaimer === "string"
      ? obj.disclaimer
      : "Always verify deadlines and eligibility on official sources.";
  const rows = Array.isArray(obj.scholarships) ? obj.scholarships : [];

  const scholarships = rows
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const r = /** @type {Record<string, unknown>} */ (row);
      return {
        name: stringOr(r.name, "Unnamed opportunity"),
        region: stringOr(r.region, "Unspecified"),
        level: stringOr(r.level, "Unspecified"),
        eligibility: stringOr(r.eligibility, ""),
        fundingCoverage: stringOr(r.fundingCoverage, ""),
        deadline: stringOr(r.deadline, "Verify on official source"),
        sourceTitle: stringOr(r.sourceTitle, ""),
        sourceUrl: sourceUrlOr(r.sourceUrl, ""),
        sourceSnippet: stringOr(r.sourceSnippet, ""),
        applicationTips: toStringArray(r.applicationTips),
        verifyUrlHint: stringOr(r.verifyUrlHint, ""),
        notes: stringOr(r.notes, ""),
        freshness: stringOr(r.freshness, `Web checked ${liveContext.checkedAt}`),
      };
    });

  return {
    disclaimer,
    scholarships,
    checkedAt: liveContext.checkedAt,
    liveSources: liveContext.sources,
    sourceErrors: liveContext.errors,
    usage: completion.usage ?? null,
    modelUsed: completion.model,
  };
}

/** @param {ScholarshipForm} form */
async function discoverScholarshipSources(form) {
  const checkedAt = new Date().toISOString();
  const queries = buildSearchQueries(form);
  const settled = await Promise.allSettled(queries.map((query) => searchScholarships(query)));

  /** @type {ScholarshipSource[]} */
  const sources = [];
  /** @type {string[]} */
  const errors = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      sources.push(...result.value);
    } else {
      errors.push(`${queries[index]}: ${String(result.reason?.message ?? result.reason)}`);
    }
  });

  return {
    checkedAt,
    sources: dedupeAndRankSources(sources).slice(0, 12),
    errors,
  };
}

/** @param {ScholarshipForm} form */
function buildSearchQueries(form) {
  const countries = form.preferredCountries.slice(0, 3);
  if (form.studentPath === "AL_PASSOUT") {
    return buildAlPassoutQueries(form, countries);
  }

  const targetIntake = form.profileDetails?.targetIntake
    ? ` ${form.profileDetails.targetIntake}`
    : "";
  const profile = `${form.degreeLevel} ${form.fieldOfStudy} scholarship`;
  const countryQueries = countries.map(
    (country) => `${profile} ${country}${targetIntake} deadline official`,
  );

  return [
    ...countryQueries,
    `Sri Lanka ${form.fieldOfStudy} scholarship official deadline`,
    `${form.educationGoal} scholarship official deadline`,
  ].slice(0, 5);
}

/** @param {ScholarshipForm} form @param {string[]} countries */
function buildAlPassoutQueries(form, countries) {
  const details = form.profileDetails ?? {};
  const stream = details.alStream || "A/L";
  const district = details.district || "Sri Lanka";
  const zScore = details.zScore ? ` Z score ${details.zScore}` : " Z score";
  const course = details.intendedCourse || form.fieldOfStudy || "undergraduate";
  const year = details.alYear ? ` ${details.alYear}` : "";
  const countryQueries = countries.map(
    (country) =>
      `Sri Lanka GCE A/L passout ${stream} ${course} scholarship ${country}${zScore} official`,
  );

  return [
    ...countryQueries,
    `Sri Lanka A/L Z score scholarship ${district} ${stream} official`,
    `Mahapola scholarship A/L results Z score ${course} official`,
    `University Grants Commission Sri Lanka A/L scholarship ${course}${year} official`,
    `${course} scholarship Sri Lankan A/L students deadline official`,
  ].slice(0, 5);
}

/** @param {string} query */
async function searchScholarships(query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FinWiseAI/1.0; scholarship-source-check)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`search rejected HTTP ${res.status}`);
    const html = await res.text();
    return parseDuckDuckGoResults(html, query).slice(0, 8);
  } finally {
    clearTimeout(timeout);
  }
}

/** @param {string} html @param {string} query */
function parseDuckDuckGoResults(html, query) {
  const blocks = html.match(/<div[^>]+class="[^"]*result[^"]*"[\s\S]*?(?=<div[^>]+class="[^"]*result|<\/body>|$)/gi) ?? [];
  /** @type {ScholarshipSource[]} */
  const results = [];

  for (const block of blocks) {
    const anchor = block.match(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!anchor) continue;

    const url = normalizeResultUrl(anchor[1]);
    if (!url || !/^https?:\/\//i.test(url)) continue;

    const title = cleanHtml(anchor[2]);
    const snippetMatch = block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    const snippet = snippetMatch ? cleanHtml(snippetMatch[1]) : "";
    if (!isScholarshipLike(title, snippet, url)) continue;

    results.push({
      title,
      url,
      displayUrl: displayUrl(url),
      snippet,
      query,
      officialHint: officialHint(url),
      rank: sourceRank(url, title, snippet),
    });
  }

  return results.sort((a, b) => b.rank - a.rank);
}

/** @param {ScholarshipSource[]} sources */
function dedupeAndRankSources(sources) {
  const seen = new Set();
  return sources
    .filter((source) => {
      const key = source.url.replace(/[#?].*$/, "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.rank - a.rank);
}

/** @param {string} title @param {string} snippet @param {string} url */
function isScholarshipLike(title, snippet, url) {
  const text = `${title} ${snippet} ${url}`.toLowerCase();
  return /(scholarship|studentship|financial aid|bursary|grant|fellowship|funding|tuition)/.test(text);
}

/** @param {string} url @param {string} title @param {string} snippet */
function sourceRank(url, title, snippet) {
  const text = `${url} ${title} ${snippet}`.toLowerCase();
  let rank = 0;
  if (/\.(edu|ac)\b|\.ac\.lk\b|\.gov\b|\.gov\.lk\b/.test(text)) rank += 5;
  if (/(university|college|ministry|embassy|council|commission)/.test(text)) rank += 3;
  if (/(chevening|commonwealth|fulbright|daad|erasmus|study-uk|britishcouncil)/.test(text)) rank += 4;
  if (/(deadline|apply|application|eligibility|tuition|fully funded|partial)/.test(text)) rank += 2;
  if (/(blog|forum|reddit|quora|youtube)/.test(text)) rank -= 4;
  return rank;
}

/** @param {string} rawUrl */
function normalizeResultUrl(rawUrl) {
  const withProtocol = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
  const decoded = decodeHtmlEntities(withProtocol);
  try {
    const parsed = new URL(decoded);
    const redirectTarget = parsed.searchParams.get("uddg");
    return redirectTarget ? decodeURIComponent(redirectTarget) : parsed.toString();
  } catch {
    return "";
  }
}

/** @param {string} url */
function displayUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** @param {string} url */
function officialHint(url) {
  const host = displayUrl(url).toLowerCase();
  if (host.endsWith(".gov.lk") || host.includes(".gov.")) return "government source";
  if (host.endsWith(".ac.lk") || host.includes(".edu")) return "university source";
  if (/(chevening|commonwealth|fulbright|daad|erasmus|britishcouncil)/.test(host)) {
    return "recognized scholarship provider";
  }
  return "web source";
}

/** @param {unknown} value @param {string} fallback */
function sourceUrlOr(value, fallback) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    const url = new URL(value.trim());
    return /^https?:$/.test(url.protocol) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

/** @param {string} html */
function cleanHtml(html) {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
}

/** @param {string} value */
function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/");
}

function stringOr(value, fallback) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x) => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());
}
