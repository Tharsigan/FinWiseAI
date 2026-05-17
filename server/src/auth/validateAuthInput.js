const EMAIL_MAX = 254;

/**
 * @param {unknown} raw
 * @returns {string|null} normalized email or null
 */
export function normalizeEmail(raw) {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > EMAIL_MAX) return null;
  const basic =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.includes("..");
  return basic ? email : null;
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true; password: string } | { ok: false; message: string }}
 */
export function validateNewPassword(raw) {
  if (typeof raw !== "string") {
    return { ok: false, message: "Password is required." };
  }
  const password = raw;
  if (password.length < 10) {
    return {
      ok: false,
      message: "Password must be at least 10 characters.",
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      ok: false,
      message: "Password must contain at least one uppercase letter.",
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      ok: false,
      message: "Password must contain at least one number.",
    };
  }
  return { ok: true, password };
}
