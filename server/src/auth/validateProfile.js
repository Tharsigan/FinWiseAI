/** @typedef {"light"|"dark"} ThemeChoice */

/** @returns {{ ok: false; message: string } | { ok: true }} */
export function validateTheme(raw) {
  if (typeof raw !== "string") return { ok: false, message: "Theme is invalid." };
  const t = raw.trim().toLowerCase();
  if (t !== "light" && t !== "dark") {
    return { ok: false, message: 'Theme must be "light" or "dark".' };
  }
  return { ok: true };
}

/**
 * Trimmed plain text patch field (allows empty).
 * @param {unknown} raw
 * @param {number} maxLen
 * @param {string} label
 * @returns {{ ok: false; message: string } | { ok: true; value: string }}
 */
export function validateTrimmed(raw, maxLen, label) {
  if (typeof raw !== "string") {
    return { ok: false, message: `${label} must be text.` };
  }
  const v = raw.trim();
  if (v.length > maxLen) {
    return { ok: false, message: `${label} must be at most ${maxLen} characters.` };
  }
  return { ok: true, value: v };
}

/**
 * @returns {{ ok: false; message: string } | { ok: true; value: string }}
 */
export function validateMobile(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: "" };
  }
  if (typeof raw !== "string") {
    return { ok: false, message: "Mobile number must be text." };
  }
  const v = raw.trim();
  if (!v) return { ok: true, value: "" };
  if (v.length > 40) {
    return { ok: false, message: "Mobile is too long." };
  }
  if (!/^[\d+\-\s()]+$/.test(v)) {
    return { ok: false, message: "Mobile number looks invalid." };
  }
  const digits = v.replace(/\D/g, "");
  if (digits.length < 8) {
    return { ok: false, message: "Mobile number looks too short." };
  }
  return { ok: true, value: v };
}
