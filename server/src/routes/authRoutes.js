import crypto from "crypto";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  unlinkSync,
} from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";

import { hashPassword, verifyPassword } from "../auth/password.js";
import { clearSessionCookie, readSessionCookie } from "../auth/sessionCookie.js";
import {
  establishSession,
  resolveSessionUser,
} from "../auth/sessionFlow.js";
import { hashOpaqueToken, randomOpaqueToken } from "../auth/tokens.js";
import {
  normalizeEmail,
  validateNewPassword,
} from "../auth/validateAuthInput.js";
import {
  validateMobile,
  validateTheme,
  validateTrimmed,
} from "../auth/validateProfile.js";
import { env } from "../config/env.js";
import { failure, success } from "../http/response.js";
import { requireSession } from "../middleware/requireSession.js";
import * as repo from "../repos/authRepository.js";
import * as profileRepo from "../repos/profileRepository.js";
import { sendPasswordResetEmail } from "../services/authMail.js";

export const authRouter = Router();

const RESET_NEUTRAL = {
  message:
    "If an account exists for that address, we sent password-reset instructions shortly.",
};

const MIME_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const avatarUploadDir = env.auth.avatarUploadDir;

/**
 * @param {{ avatar_path?: string|null }} row
 */
function avatarUrlFromRow(row) {
  return typeof row.avatar_path === "string" && row.avatar_path.length > 0
    ? "/api/auth/profile/avatar"
    : null;
}

/**
 * @param {import("../repos/profileRepository.js").ProfileRow} row
 * @param {{ id: string; email: string }} user
 */
function profilePayload(row, user) {
  return {
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    mobile: row.mobile || "",
    district: row.district || "",
    institutionName: row.institution_name || "",
    theme: row.theme === "dark" ? "dark" : "light",
    avatarUrl: avatarUrlFromRow(row),
    avatarTs: avatarUrlFromRow(row) ? row.updated_at : null,
    userId: user.id,
    email: user.email,
  };
}

const avatarMulterInner = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      mkdirSync(avatarUploadDir, { recursive: true });
      cb(null, avatarUploadDir);
    },
    filename: (_req, file, cb) => {
      const ext = MIME_EXT[/** @type {keyof typeof MIME_EXT} */ (file.mimetype)] || "";
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (MIME_EXT[/** @type {keyof typeof MIME_EXT} */ (file.mimetype)]) {
      cb(null, true);
      return;
    }
    cb(new Error("UNSUPPORTED_MEDIA"));
  },
});

const uploadAvatarMw = avatarMulterInner.single("file");

authRouter.post("/register", async (req, res, next) => {
  const emailNorm = normalizeEmail(req.body?.email);
  const pwCheck = validateNewPassword(req.body?.password);
  if (!emailNorm) {
    return failure(res, 400, "VALIDATION_ERROR", "Enter a valid email address.");
  }
  if (!pwCheck.ok) {
    return failure(res, 400, "VALIDATION_ERROR", pwCheck.message);
  }

  try {
    const password_hash = await hashPassword(pwCheck.password);
    const id = crypto.randomUUID();
    const created_at = repo.nowMs();
    repo.insertUser({ id, email: emailNorm, password_hash, created_at });
    establishSession(res, id);
    success(res, { user: { id, email: emailNorm } }, { source: "auth" });
    return;
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      /** @type {{ code?: string }} */ (e).code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      failure(
        res,
        409,
        "DUPLICATE_EMAIL",
        "An account with this email already exists.",
      );
      return;
    }
    next(e);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const emailNorm = normalizeEmail(req.body?.email);
    if (!emailNorm || typeof req.body?.password !== "string") {
      failure(res, 400, "VALIDATION_ERROR", "Email and password are required.");
      return;
    }

    repo.deleteExpiredSessions();
    const user = repo.findUserByEmail(emailNorm);
    const okPwd = user
      ? await verifyPassword(user.password_hash, req.body.password)
      : false;

    if (!user || !okPwd) {
      failure(res, 401, "LOGIN_FAILED", "Invalid email or password.");
      return;
    }

    establishSession(res, user.id);
    success(res, { user: { id: user.id, email: user.email } }, { source: "auth" });
    return;
  } catch (e) {
    next(e);
  }
});

authRouter.post("/logout", (req, res) => {
  const token = readSessionCookie(req);
  if (token) {
    repo.deleteSessionByTokenHash(hashOpaqueToken(token));
  }
  clearSessionCookie(res);
  success(res, { done: true }, { source: "auth" });
});

authRouter.get("/me", (req, res) => {
  const user = resolveSessionUser(req, res, { clearInvalidCookie: true });
  if (!user) {
    failure(res, 401, "UNAUTHORIZED", "Not signed in.");
    return;
  }

  success(res, { user: { id: user.id, email: user.email } }, { source: "auth" });
});

authRouter.post("/forgot-password", async (req, res, next) => {
  try {
    const emailNorm = normalizeEmail(req.body?.email);
    const user = emailNorm ? repo.findUserByEmail(emailNorm) : undefined;

    if (user && emailNorm) {
      repo.deleteOutstandingResetTokensForUser(user.id);
      const token = randomOpaqueToken(32);
      const token_hash = hashOpaqueToken(token);
      const created = repo.nowMs();
      repo.insertResetToken({
        id: crypto.randomUUID(),
        user_id: user.id,
        token_hash,
        expires_at: created + env.auth.passwordResetExpiryMs,
        created_at: created,
      });
      const base = env.auth.passwordResetFrontendOrigin.replace(/\/$/, "");
      const resetUrl = `${base}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail(emailNorm, resetUrl).catch((err) => {
        console.error("[finwise-auth] sendPasswordResetEmail failed", err);
      });
    }

    success(res, RESET_NEUTRAL, { source: "auth" });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const pw = validateNewPassword(req.body?.newPassword);
    const rawTok =
      typeof req.body?.token === "string" ? req.body.token.trim() : "";

    if (!rawTok || !pw.ok) {
      failure(res, 400, "RESET_FAILED", "Invalid or expired reset link.");
      return;
    }

    const token_hash = hashOpaqueToken(rawTok);
    const hit = repo.findOutstandingResetRow(token_hash);
    if (!hit) {
      failure(res, 400, "RESET_FAILED", "Invalid or expired reset link.");
      return;
    }

    const password_hash = await hashPassword(pw.password);
    repo.updateUserPassword(hit.user_id, password_hash);
    repo.consumeResetToken(token_hash);
    repo.deleteSessionsForUser(hit.user_id);
    clearSessionCookie(res);

    success(
      res,
      {
        message:
          "Your password has been updated. Sign in with your new password.",
      },
      { source: "auth" },
    );
    return;
  } catch (e) {
    next(e);
  }
});

/* ---- Profile subtree: /api/auth/profile/* -------------------------------- */

const profileRouter = Router();
profileRouter.use(requireSession);

profileRouter.get("/", (req, res) => {
  const uid = req.authUser.id;
  const row = profileRepo.ensureProfile(uid);
  const user = repo.findUserById(uid);
  if (!user) {
    failure(res, 401, "UNAUTHORIZED", "Not signed in.");
    return;
  }
  success(
    res,
    { profile: profilePayload(row, { id: user.id, email: user.email }) },
    { source: "auth" },
  );
});

profileRouter.patch("/", (req, res) => {
  const uid = req.authUser.id;
  profileRepo.ensureProfile(uid);

  /** @type {Record<string, string>} */
  const sqlPatch = {};

  if (req.body.firstName !== undefined) {
    const fn = validateTrimmed(req.body.firstName, 80, "First name");
    if (!fn.ok) {
      failure(res, 400, "VALIDATION_ERROR", fn.message);
      return;
    }
    sqlPatch.first_name = fn.value;
  }
  if (req.body.lastName !== undefined) {
    const ln = validateTrimmed(req.body.lastName, 80, "Last name");
    if (!ln.ok) {
      failure(res, 400, "VALIDATION_ERROR", ln.message);
      return;
    }
    sqlPatch.last_name = ln.value;
  }
  if (req.body.mobile !== undefined) {
    const m = validateMobile(req.body.mobile);
    if (!m.ok) {
      failure(res, 400, "VALIDATION_ERROR", m.message);
      return;
    }
    sqlPatch.mobile = m.value;
  }
  if (req.body.district !== undefined) {
    const d = validateTrimmed(req.body.district, 120, "District");
    if (!d.ok) {
      failure(res, 400, "VALIDATION_ERROR", d.message);
      return;
    }
    sqlPatch.district = d.value;
  }
  if (req.body.institutionName !== undefined) {
    const i = validateTrimmed(req.body.institutionName, 160, "School or university");
    if (!i.ok) {
      failure(res, 400, "VALIDATION_ERROR", i.message);
      return;
    }
    sqlPatch.institution_name = i.value;
  }
  if (req.body.theme !== undefined) {
    const tv = validateTheme(req.body.theme);
    if (!tv.ok) {
      failure(res, 400, "VALIDATION_ERROR", tv.message);
      return;
    }
    sqlPatch.theme = req.body.theme.trim().toLowerCase();
  }

  const row =
    Object.keys(sqlPatch).length === 0
      ? profileRepo.ensureProfile(uid)
      : profileRepo.patchProfile(uid, sqlPatch);

  const userNow = repo.findUserById(uid);
  success(
    res,
    {
      profile: profilePayload(row, {
        id: userNow?.id ?? uid,
        email: userNow?.email ?? req.authUser.email,
      }),
    },
    { source: "auth" },
  );
});

profileRouter.get("/avatar", (req, res) => {
  const uid = req.authUser.id;
  profileRepo.ensureProfile(uid);
  const row = profileRepo.getProfile(uid);
  if (
    !row ||
    typeof row.avatar_path !== "string" ||
    row.avatar_path.length === 0
  ) {
    failure(res, 404, "NO_AVATAR", "No profile picture uploaded yet.");
    return;
  }

  const safeBase = path.basename(row.avatar_path);
  if (!safeBase || safeBase.includes("..") || safeBase !== row.avatar_path) {
    failure(res, 403, "AVATAR_FORBIDDEN", "Invalid avatar reference.");
    return;
  }

  const fullPath = path.join(avatarUploadDir, safeBase);
  if (!existsSync(fullPath)) {
    failure(res, 404, "NO_AVATAR", "Avatar file is missing.");
    return;
  }

  const mime =
    safeBase.endsWith(".png")
      ? "image/png"
      : safeBase.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";

  res.setHeader("Content-Type", mime);
  createReadStream(fullPath).pipe(res);
});

profileRouter.post("/avatar", (req, res, next) => {
  uploadAvatarMw(req, res, async (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      failure(res, 400, "FILE_TOO_LARGE", "Image must be 2 MB or smaller.");
      return;
    }
    if (err) {
      if (String(err.message) === "UNSUPPORTED_MEDIA") {
        failure(
          res,
          400,
          "UNSUPPORTED_MEDIA",
          "Use JPEG, PNG, or WebP for your photo.",
        );
        return;
      }
      next(err);
      return;
    }

    const file = req.file;
    if (!file) {
      failure(res, 400, "MISSING_FILE", "Include a multipart field named \"file\".");
      return;
    }

    try {
      const uid = req.authUser.id;
      const prior = profileRepo.getProfile(uid);
      const prevName =
        prior && typeof prior.avatar_path === "string"
          ? path.basename(prior.avatar_path)
          : null;

      profileRepo.setAvatarFilename(uid, file.filename);

      if (prevName && prevName !== file.filename && !prevName.includes("..")) {
        const oldPath = path.join(avatarUploadDir, prevName);
        try {
          unlinkSync(oldPath);
        } catch (_) {
          /* previous copy may already be deleted */
        }
      }

      const row = profileRepo.ensureProfile(uid);
      const user = repo.findUserById(uid);
      success(
        res,
        {
          profile: profilePayload(row, {
            id: user?.id ?? uid,
            email: user?.email ?? req.authUser.email,
          }),
        },
        { source: "auth" },
      );
      return;
    } catch (e) {
      next(e);
      return;
    }
  });
});

authRouter.use("/profile", profileRouter);

/* ---- Credential changes --------------------------------------------------- */

authRouter.post("/change-email", requireSession, async (req, res, next) => {
  try {
    const uid = req.authUser.id;
    const newNorm = normalizeEmail(req.body?.newEmail);
    const curPw =
      typeof req.body?.currentPassword === "string"
        ? req.body.currentPassword
        : "";

    if (!curPw || !newNorm) {
      failure(
        res,
        400,
        "VALIDATION_ERROR",
        "New email and current password are required.",
      );
      return;
    }

    const user = repo.findUserById(uid);
    if (!user) {
      failure(res, 401, "UNAUTHORIZED", "Not signed in.");
      return;
    }

    const okPw = await verifyPassword(user.password_hash, curPw);
    if (!okPw) {
      failure(res, 401, "AUTH_FAILED", "Current password is incorrect.");
      return;
    }

    if (newNorm === user.email) {
      success(res, { user: { id: user.id, email: user.email } }, { source: "auth" });
      return;
    }

    repo.deleteSessionsForUser(user.id);
    try {
      repo.updateUserEmail(user.id, newNorm);
    } catch (e) {
      const code =
        typeof e === "object" &&
        e !== null &&
        /** @type {{ code?: string }} */ (e).code;
      if (code === "SQLITE_CONSTRAINT_UNIQUE") {
        establishSession(res, user.id);
        failure(res, 409, "DUPLICATE_EMAIL", "That email is already in use.");
        return;
      }
      establishSession(res, user.id);
      next(e);
      return;
    }

    establishSession(res, user.id);

    success(
      res,
      { user: { id: user.id, email: newNorm } },
      { source: "auth" },
    );
    return;
  } catch (e) {
    next(e);
  }
});

authRouter.post("/change-password", requireSession, async (req, res, next) => {
  try {
    const uid = req.authUser.id;
    const pwCheck = validateNewPassword(req.body?.newPassword);
    const curPw =
      typeof req.body?.currentPassword === "string"
        ? req.body.currentPassword
        : "";

    if (!curPw || !pwCheck.ok) {
      failure(
        res,
        400,
        "VALIDATION_ERROR",
        pwCheck.ok ? "Current password is required." : pwCheck.message,
      );
      return;
    }

    const user = repo.findUserById(uid);
    if (!user) {
      failure(res, 401, "UNAUTHORIZED", "Not signed in.");
      return;
    }

    const okPw = await verifyPassword(user.password_hash, curPw);
    if (!okPw) {
      failure(res, 401, "AUTH_FAILED", "Current password is incorrect.");
      return;
    }

    const password_hash = await hashPassword(pwCheck.password);
    repo.deleteSessionsForUser(user.id);
    repo.updateUserPassword(user.id, password_hash);
    establishSession(res, user.id);

    success(res, { message: "Password updated." }, { source: "auth" });
    return;
  } catch (e) {
    next(e);
  }
});
