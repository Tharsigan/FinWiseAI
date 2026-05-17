/** @returns {boolean} */
function truthy(raw) {
  if (!raw) return false;
  const v = String(raw).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export const env = {
  port: Number(process.env.PORT) || 5001,
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  seylan: {
    sandboxUrl: process.env.SEYLAN_SANDBOX_URL || "",
    lankaQrUrl: process.env.SEYLAN_SANDBOX_URL || "",
    inquiryUrl: process.env.SEYLAN_SANDBOX_URL || "",
    transferUrl: process.env.SEYLAN_SANDBOX_URL || "",
    teamApiKey: process.env.SEYLAN_TEAM_API_KEY || "",
    sourceAccount: process.env.SEYLAN_SOURCE_ACCOUNT || "",
    internalDestinationAccount:
      process.env.SEYLAN_INTERNAL_DESTINATION_ACCOUNT || "",
  },
  mpgs: {
    merchantId: process.env.MPGS_MERCHANT_ID || "TESTCURSOR6",
    apiPassword: process.env.MPGS_API_PASSWORD || "",
    baseUrl:
      process.env.MPGS_BASE_URL ||
      "https://test-seylan.mtf.gateway.mastercard.com/api/rest/version/62",
    checkoutJsUrl:
      process.env.MPGS_CHECKOUT_JS_URL ||
      "https://test-seylan.mtf.gateway.mastercard.com/checkout/version/62/checkout.js",
    merchantName: process.env.MPGS_MERCHANT_NAME || "Cursor Buildathon 6",
  },
  auth: {
    databasePath:
      process.env.DATABASE_PATH ||
      `${process.cwd().replace(/\\/g, "/")}/data/finwise-auth.sqlite`,
    sessionTtlMs: Number(process.env.SESSION_TTL_MS) || 14 * 24 * 60 * 60 * 1000,
    sessionCookieName: process.env.SESSION_COOKIE_NAME || "fw_session",
    cookieSecure:
      truthy(process.env.COOKIE_SECURE) ||
      (process.env.NODE_ENV === "production" && !truthy(process.env.COOKIE_INSECURE)),
    passwordResetExpiryMs:
      Number(process.env.PASSWORD_RESET_EXPIRY_MS) || 60 * 60 * 1000,
    passwordResetFrontendOrigin:
      process.env.PASSWORD_RESET_FRONTEND_ORIGIN ||
      process.env.CLIENT_ORIGIN ||
      "http://localhost:5173",
    passwordResetEmailFrom:
      process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@localhost",
    avatarUploadDir:
      process.env.AVATAR_UPLOAD_DIR ||
      `${process.cwd().replace(/\\/g, "/")}/data/uploads/avatars`,
    smtp: {
      url: process.env.SMTP_URL || "",
      host: process.env.SMTP_HOST || "",
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  },
};
