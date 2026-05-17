import { useEffect, useMemo, useState } from "react";
import DemoBadge from "../components/DemoBadge.jsx";
import { FriendlyErrorState } from "../components/FinwiseUI.jsx";
import PageHeading from "../components/PageHeading.jsx";
import ShellPageBody from "../components/ShellPageBody.jsx";
import { fetchAiStatus, postAiScholarships } from "../services/api.js";

const STUDENT_PATHS = [
  { value: "AL_PASSOUT", label: "AL PASSOUT", degreeLevel: "A/L Passout" },
  { value: "UNDERGRADUATE", label: "UNDERGRADUATE", degreeLevel: "Undergraduate" },
  { value: "POSTGRADUATE", label: "POSTGRADUATE", degreeLevel: "Postgraduate" },
];

const DEFAULT_FORMS = {
  AL_PASSOUT: {
    studentPath: "AL_PASSOUT",
    alStream: "Physical Science",
    district: "Colombo",
    zScore: "",
    alYear: "2025",
    subjectResults: "Combined Mathematics A, Physics B, Chemistry B",
    intendedCourse: "Engineering",
    preferredCountries: "Sri Lanka",
    financialNeed: "high",
    educationGoal: "Scholarships for Sri Lankan A/L passout students based on Z-score and results",
  },
  UNDERGRADUATE: {
    studentPath: "UNDERGRADUATE",
    fieldOfStudy: "Mechanical Engineering",
    academicStanding: "Second year · GPA ~3.5",
    preferredCountries: "Sri Lanka; United Kingdom",
    financialNeed: "high",
    educationGoal: "Scholarships for undergraduate study support",
  },
  POSTGRADUATE: {
    studentPath: "POSTGRADUATE",
    fieldOfStudy: "Computer Science",
    academicStanding: "Bachelor's degree · Second Upper / GPA ~3.4",
    targetIntake: "2027",
    preferredCountries: "United Kingdom; Australia; Sri Lanka",
    financialNeed: "medium",
    educationGoal: "Scholarships for postgraduate MSc abroad",
  },
};

const PROFILE_FIELDS = {
  AL_PASSOUT: [
    {
      key: "alStream",
      label: "A/L stream",
      type: "select",
      options: [
        "Physical Science",
        "Biological Science",
        "Commerce",
        "Arts",
        "Technology",
        "Other",
      ],
    },
    { key: "district", label: "District" },
    { key: "zScore", label: "Z-score", type: "number", step: "0.0001" },
    { key: "alYear", label: "A/L attempt year" },
    { key: "subjectResults", label: "Subject results / grades", type: "textarea" },
    { key: "intendedCourse", label: "Intended course or field" },
    { key: "preferredCountries", label: "Preferred countries (comma or semicolon separated)" },
    {
      key: "financialNeed",
      label: "Financial need",
      type: "select",
      options: ["low", "medium", "high"],
    },
    { key: "educationGoal", label: "Goal narrative", type: "textarea" },
  ],
  UNDERGRADUATE: [
    { key: "fieldOfStudy", label: "Field of study" },
    { key: "academicStanding", label: "Current year / GPA or class" },
    { key: "preferredCountries", label: "Preferred countries (comma or semicolon separated)" },
    {
      key: "financialNeed",
      label: "Financial need",
      type: "select",
      options: ["low", "medium", "high"],
    },
    { key: "educationGoal", label: "Goal narrative", type: "textarea" },
  ],
  POSTGRADUATE: [
    { key: "fieldOfStudy", label: "Research or course field" },
    { key: "academicStanding", label: "Current qualification / GPA or class" },
    { key: "targetIntake", label: "Target intake / year" },
    { key: "preferredCountries", label: "Preferred countries (comma or semicolon separated)" },
    {
      key: "financialNeed",
      label: "Financial need",
      type: "select",
      options: ["low", "medium", "high"],
    },
    { key: "educationGoal", label: "Goal narrative", type: "textarea" },
  ],
};

export default function ScholarshipsPage() {
  const [form, setForm] = useState(DEFAULT_FORMS.AL_PASSOUT);
  const [bundle, setBundle] = useState(/** @type {Record<string, unknown>|null} */ (null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [aiCaps, setAiCaps] = useState(
    /** @type {{ configured: boolean; model: string } | null} */ (null),
  );

  useEffect(() => {
    fetchAiStatus()
      .then(setAiCaps)
      .catch(() => setAiCaps({ configured: false, model: "—" }));
  }, []);

  const statusLine = useMemo(() => {
    if (!aiCaps) return "Checking OpenAI readiness…";
    if (!aiCaps.configured) return "Scholarship ideation is in safe demo mode.";
    return `Model · ${aiCaps.model}`;
  }, [aiCaps]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const selectedPath =
        STUDENT_PATHS.find((path) => path.value === form.studentPath) ?? STUDENT_PATHS[0];
      const payload = await postAiScholarships({
        ...form,
        degreeLevel: selectedPath.degreeLevel,
      });
      setBundle(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  /** @type {unknown[]} */
  const rows = bundle && Array.isArray(bundle.scholarships)
    ? bundle.scholarships
    : [];
  const checkedAt =
    bundle && typeof bundle.checkedAt === "string"
      ? new Date(bundle.checkedAt).toLocaleString()
      : null;
  const sourceErrors =
    bundle && Array.isArray(bundle.sourceErrors) ? bundle.sourceErrors : [];
  const fields = PROFILE_FIELDS[form.studentPath] ?? PROFILE_FIELDS.AL_PASSOUT;

  return (
    <ShellPageBody>
      <div className="flex flex-col gap-4 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-xl flex-1 space-y-2">
            <PageHeading eyebrow="Aid desk" title="Scholarship ideation studio" />
            <p className="text-sm leading-snug text-fw-muted">
              Generate a polished shortlist for Sri Lankan students, with verification
              reminders so scholarship advice stays responsible.
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fw-red-600">
              {statusLine}
            </p>
          </div>
          <DemoBadge />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <form
            className="finwise-card space-y-3 rounded-2xl p-5 backdrop-blur"
          onSubmit={(event) => {
            event.preventDefault();
            generate();
          }}
        >
          <label className="block text-sm font-semibold text-fw-ink">
            Student level
            <select
              required
              value={form.studentPath}
              onChange={(event) => {
                setForm(DEFAULT_FORMS[event.target.value] ?? DEFAULT_FORMS.AL_PASSOUT);
                setBundle(null);
                setError(null);
              }}
              className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm font-normal text-fw-ink shadow-inner outline-none ring-fw-red-600/25 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
            >
              {STUDENT_PATHS.map((path) => (
                <option key={path.value} value={path.value}>
                  {path.label}
                </option>
              ))}
            </select>
          </label>

          {fields.map((field) => (
            <label key={field.key} className="block text-sm font-semibold text-fw-ink">
              {field.label}
              {field.type === "select" ? (
                <select
                  required
                  value={form[field.key] ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm font-normal text-fw-ink shadow-inner outline-none ring-fw-red-600/25 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                >
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  required
                  rows={3}
                  value={form[field.key] ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm font-normal text-fw-ink shadow-inner outline-none ring-fw-red-600/25 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                />
              ) : (
                <input
                  required
                  type={field.type ?? "text"}
                  step={field.step}
                  value={form[field.key] ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm font-normal text-fw-ink shadow-inner outline-none ring-fw-red-600/25 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                />
              )}
            </label>
          ))}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-b from-[#E31D23] to-[#B81419] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-fw-red-700/40 transition hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:grayscale"
          >
            {busy ? "Summoning ideas…" : "Generate scholarship map"}
          </button>
        </form>

        <section className="finwise-card rounded-2xl bg-gradient-to-br from-fw-panel via-fw-panel to-fw-rose-soft p-5 dark:from-fw-section dark:via-fw-panel dark:to-red-950/25">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-fw-red-600">
            Model output
          </h2>
          {error ? (
            <div className="mt-4">
              <FriendlyErrorState
                title="Scholarship assistant is reconnecting"
                message={error || "Your saved profile is still here. Retry when AI services are ready."}
                onRetry={generate}
              />
            </div>
          ) : null}
          {bundle && typeof bundle.disclaimer === "string" ? (
            <p className="mt-4 text-sm leading-relaxed text-fw-ink">{bundle.disclaimer}</p>
          ) : (
            <p className="mt-4 text-sm text-fw-muted">
              Fill the form and generate — the backend checks live web sources, then
              asks OpenAI to summarize them as structured JSON.
            </p>
          )}
          {checkedAt ? (
            <p className="mt-3 rounded-xl border border-fw-red-100 bg-fw-panel/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-fw-red-600 dark:border-fw-red-500/30">
              Live sources checked · {checkedAt}
            </p>
          ) : null}
          {sourceErrors.length ? (
            <p className="mt-3 text-xs text-amber-800 dark:text-amber-200/95">
              Some live searches were unavailable, so fewer verified sources may be shown.
            </p>
          ) : null}
          <ul className="mt-6 space-y-4">
            {rows.map((row, index) => {
              if (!row || typeof row !== "object") return null;
              const item = /** @type {Record<string, unknown>} */ (row);
              const sourceUrl =
                typeof item.sourceUrl === "string" && item.sourceUrl.startsWith("http")
                  ? item.sourceUrl
                  : "";
              return (
                <li
                  key={`${String(item.name)}-${index}`}
                  className="rounded-2xl border border-fw-border/80 bg-fw-panel/95 p-4 shadow-md shadow-fw-red-900/20 dark:shadow-black/25"
                >
                  <p className="text-base font-semibold text-fw-strong">
                    {String(item.name ?? "Opportunity")}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.15em] text-fw-muted">
                    {String(item.region ?? "")} · {String(item.level ?? "")}
                  </p>
                  <p className="mt-3 text-sm text-fw-ink">
                    <span className="font-semibold text-fw-strong">Eligibility · </span>
                    {String(item.eligibility ?? "")}
                  </p>
                  <p className="mt-2 text-sm text-fw-ink">
                    <span className="font-semibold text-fw-strong">Funding · </span>
                    {String(item.fundingCoverage ?? "")}
                  </p>
                  <p className="mt-2 text-sm text-fw-ink">
                    <span className="font-semibold text-fw-strong">Deadline · </span>
                    {String(item.deadline ?? "Verify on official source")}
                  </p>
                  {Array.isArray(item.applicationTips) && item.applicationTips.length ? (
                    <div className="mt-3 text-sm">
                      <p className="font-semibold text-fw-strong">Tips</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {item.applicationTips.map(
                          /** @param {unknown} tip */ (tip, tipIndex) => (
                            <li key={tipIndex}>{String(tip)}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  ) : null}
                  {sourceUrl ? (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-xs font-semibold text-fw-red-600 underline decoration-fw-red-300 underline-offset-4"
                    >
                      Official/live source · {String(item.sourceTitle || sourceUrl)}
                    </a>
                  ) : null}
                  {item.sourceSnippet ? (
                    <p className="mt-2 text-xs leading-relaxed text-fw-muted">
                      Source preview · {String(item.sourceSnippet)}
                    </p>
                  ) : null}
                  {item.verifyUrlHint ? (
                    <p className="mt-3 text-xs text-fw-red-600">
                      Verification cue · {String(item.verifyUrlHint)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      </div>
    </ShellPageBody>
  );
}
