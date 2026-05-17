import nodemailer from "nodemailer";

import { env } from "../config/env.js";

/**
 * @returns {boolean}
 */
function smtpConfigured() {
  if (env.auth.smtp.url) return true;
  return Boolean(env.auth.smtp.host && env.auth.smtp.user);
}

/**
 * @returns {import("nodemailer").Transporter}
 */
function createMailer() {
  if (env.auth.smtp.url) {
    return nodemailer.createTransport(env.auth.smtp.url);
  }
  return nodemailer.createTransport({
    host: env.auth.smtp.host,
    port: env.auth.smtp.port,
    secure: env.auth.smtp.port === 465,
    auth: env.auth.smtp.user
      ? { user: env.auth.smtp.user, pass: env.auth.smtp.pass }
      : undefined,
  });
}

/**
 * @param {string} toEmail
 * @param {string} resetUrl
 */
export async function sendPasswordResetEmail(toEmail, resetUrl) {
  if (!smtpConfigured()) {
    console.info(
      "[finwise-auth] SMTP not configured — password reset URL (dev only):\n" +
        resetUrl,
    );
    return;
  }

  const mailer = createMailer();
  await mailer.sendMail({
    from: env.auth.passwordResetEmailFrom,
    to: toEmail,
    subject: "Reset your FinWise AI password",
    text:
      `We received a request to reset your password. Open:\n\n${resetUrl}\n\n` +
      `If you did not request this, ignore this email.`,
    html: `<p>We received a request to reset your password.</p>
<p><a href="${resetUrl}">Set a new password</a></p>
<p>If you did not request this, you can ignore this message.</p>`,
  });
}
