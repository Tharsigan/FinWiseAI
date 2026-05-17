import { useEffect, useMemo, useState } from "react";

import PageHeading from "../components/PageHeading.jsx";
import ShellPageBody from "../components/ShellPageBody.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { applyDocumentTheme } from "../lib/theme.js";
import {
  patchAuthProfile,
  postAuthAvatar,
  postAuthChangeEmail,
  postAuthChangePassword,
} from "../services/api.js";

function FieldLabel({ htmlFor, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold uppercase tracking-wide text-fw-muted"
    >
      {children}
    </label>
  );
}

export default function SettingsPage() {
  const {
    user,
    profile,
    refreshAuth,
    setUser,
  } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [district, setDistrict] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [theme, setTheme] = useState(
    /** @type {"light" | "dark"} */ (profile?.theme === "dark" ? "dark" : "light"),
  );

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setMobile(profile.mobile);
    setDistrict(profile.district);
    setInstitutionName(profile.institutionName);
    setTheme(profile.theme);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    applyDocumentTheme(theme);
  }, [theme, profile]);

  const profileFormDirty = useMemo(() => {
    if (!profile) return false;
    return (
      firstName !== profile.firstName ||
      lastName !== profile.lastName ||
      mobile !== profile.mobile ||
      district !== profile.district ||
      institutionName !== profile.institutionName ||
      theme !== profile.theme
    );
  }, [profile, firstName, lastName, mobile, district, institutionName, theme]);

  const [picBusy, setPicBusy] = useState(false);
  const [picError, setPicError] = useState(/** @type {string | null} */ (null));
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState(/** @type {string | null} */ (null));
  const [profileErr, setProfileErr] = useState(/** @type {string | null} */ (null));

  const avatarSrc =
    profile?.avatarUrl &&
    `${profile.avatarUrl}${profile.avatarTs != null ? `?t=${profile.avatarTs}` : ""}`;

  async function uploadAvatar(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    ev.target.value = "";
    setPicError(null);
    setPicBusy(true);
    try {
      await postAuthAvatar(file);
      await refreshAuth();
      setPicError(null);
    } catch (e) {
      setPicError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setPicBusy(false);
    }
  }

  async function submitProfile(ev) {
    ev.preventDefault();
    setProfileMsg(null);
    setProfileErr(null);
    setProfileBusy(true);
    try {
      await patchAuthProfile({
        firstName,
        lastName,
        mobile,
        district,
        institutionName,
        theme,
      });
      await refreshAuth();
      setProfileMsg("Profile saved.");
    } catch (e) {
      setProfileErr(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setProfileBusy(false);
    }
  }

  const [newEmail, setNewEmail] = useState("");
  const [emailCurPw, setEmailCurPw] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState(/** @type {string | null} */ (null));
  const [emailErr, setEmailErr] = useState(/** @type {string | null} */ (null));

  async function submitEmail(ev) {
    ev.preventDefault();
    setEmailMsg(null);
    setEmailErr(null);
    setEmailBusy(true);
    try {
      const data = await postAuthChangeEmail({
        newEmail: newEmail.trim(),
        currentPassword: emailCurPw,
      });
      setEmailCurPw("");
      setNewEmail("");
      const nu =
        data && typeof data === "object" && "user" in data ? data.user : null;
      if (
        nu &&
        typeof nu === "object" &&
        typeof nu.id === "string" &&
        typeof nu.email === "string"
      ) {
        setUser({ id: nu.id, email: nu.email });
      } else {
        await refreshAuth();
      }
      setEmailMsg("Email updated for your account.");
    } catch (e) {
      setEmailErr(e instanceof Error ? e.message : "Could not update email.");
    } finally {
      setEmailBusy(false);
    }
  }

  const [curPwChange, setCurPwChange] = useState("");
  const [nextPwChange, setNextPwChange] = useState("");
  const [nextPwRepeat, setNextPwRepeat] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState(/** @type {string | null} */ (null));
  const [pwErr, setPwErr] = useState(/** @type {string | null} */ (null));

  async function submitPassword(ev) {
    ev.preventDefault();
    setPwMsg(null);
    setPwErr(null);
    if (nextPwChange !== nextPwRepeat) {
      setPwErr("New password fields must match.");
      return;
    }
    setPwBusy(true);
    try {
      await postAuthChangePassword({
        currentPassword: curPwChange,
        newPassword: nextPwChange,
      });
      setCurPwChange("");
      setNextPwChange("");
      setNextPwRepeat("");
      await refreshAuth();
      setPwMsg("Password updated.");
    } catch (e) {
      setPwErr(e instanceof Error ? e.message : "Could not update password.");
    } finally {
      setPwBusy(false);
    }
  }



  return (
    <ShellPageBody>
      <div className="flex min-h-full flex-col gap-6 pb-8">
        <PageHeading eyebrow="Account" title="Settings" />

        <section aria-labelledby="settings-photo" className="finwise-card rounded-2xl p-6">
          <h2 id="settings-photo" className="text-lg font-semibold text-fw-ink">
            Profile photo
          </h2>
          <p className="mt-1 text-sm text-fw-muted">
            JPEG, PNG, or WebP · up to 2 MB. Shown beside your greeting in navigation.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-6">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-fw-border bg-fw-section shadow-inner shadow-black/10">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl text-fw-muted">
                  +
                </div>
              )}
            </div>
            <label className="inline-flex cursor-pointer flex-col gap-2">
              <span className="rounded-xl bg-gradient-to-b from-[#E31D23] to-[#B81419] px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-fw-red-600/30 transition hover:brightness-105 disabled:opacity-50">
                {picBusy ? "Uploading…" : "Choose photo"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={picBusy}
                onChange={uploadAvatar}
              />
            </label>
          </div>
          {picError ? (
            <p className="mt-4 text-sm text-fw-red-600" role="alert">
              {picError}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="settings-profile-fields" className="finwise-card rounded-2xl p-6">
          <h2 id="settings-profile-fields" className="text-lg font-semibold text-fw-ink">
            Your details
          </h2>
          <form className="mt-6 space-y-5" onSubmit={submitProfile}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="st-fn">First name</FieldLabel>
                <input
                  id="st-fn"
                  className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm text-fw-ink outline-none ring-fw-red-500/30 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <FieldLabel htmlFor="st-ln">Last name</FieldLabel>
                <input
                  id="st-ln"
                  className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm text-fw-ink outline-none ring-fw-red-500/30 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="st-phone">Mobile number</FieldLabel>
                <input
                  id="st-phone"
                  type="tel"
                  autoComplete="tel"
                  className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm text-fw-ink outline-none ring-fw-red-500/30 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="st-uni">University / school</FieldLabel>
                <input
                  id="st-uni"
                  className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm text-fw-ink outline-none ring-fw-red-500/30 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="Shown with your greeting on Home"
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="st-dist">District</FieldLabel>
                <input
                  id="st-dist"
                  className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm text-fw-ink outline-none ring-fw-red-500/30 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
              </div>
            </div>
            <fieldset>
              <legend className="sr-only">Theme</legend>
              <span className="block text-xs font-semibold uppercase tracking-wide text-fw-muted">
                Theme
              </span>
              <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-fw-ink">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={theme === "light"}
                    onChange={() => setTheme("light")}
                  />
                  Light
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-fw-ink">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={theme === "dark"}
                    onChange={() => setTheme("dark")}
                  />
                  Dark
                </label>
              </div>
              {profileFormDirty ? (
                <p className="mt-3 text-xs text-amber-800 dark:text-amber-200/95">
                  You have unsaved profile changes (including theme). Save profile to keep them on this
                  device.
                </p>
              ) : null}
            </fieldset>

            <button
              type="submit"
              disabled={profileBusy}
              className="w-full rounded-xl bg-gradient-to-b from-[#E31D23] to-[#B81419] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-fw-red-600/30 transition enabled:hover:brightness-105 disabled:opacity-55 sm:w-auto"
            >
              {profileBusy ? "Saving…" : "Save profile"}
            </button>

            {profileMsg ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">{profileMsg}</p>
            ) : null}
            {profileErr ? (
              <p className="text-sm text-fw-red-600" role="alert">
                {profileErr}
              </p>
            ) : null}
          </form>
        </section>

        <section aria-labelledby="settings-email" className="finwise-card rounded-2xl p-6">
          <h2 id="settings-email" className="text-lg font-semibold text-fw-ink">
            Email address
          </h2>
          <p className="mt-1 text-sm text-fw-muted">
            Current login:{" "}
            <span className="font-semibold text-fw-ink">{user.email}</span>
          </p>
          <form className="mt-6 space-y-4" onSubmit={submitEmail}>
            <div>
              <FieldLabel htmlFor="st-email">New email</FieldLabel>
              <input
                id="st-email"
                required
                type="email"
                autoComplete="email"
                className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm text-fw-ink outline-none ring-fw-red-500/30 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="st-email-pw">Current password</FieldLabel>
              <input
                id="st-email-pw"
                required
                type="password"
                autoComplete="current-password"
                className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm text-fw-ink outline-none ring-fw-red-500/30 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                value={emailCurPw}
                onChange={(e) => setEmailCurPw(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={emailBusy}
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-55 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {emailBusy ? "Updating…" : "Update email"}
            </button>
          </form>
          {emailMsg ? (
            <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{emailMsg}</p>
          ) : null}
          {emailErr ? (
            <p className="mt-4 text-sm text-fw-red-600" role="alert">
              {emailErr}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="settings-pw" className="finwise-card rounded-2xl p-6">
          <h2 id="settings-pw" className="text-lg font-semibold text-fw-ink">
            Password
          </h2>
          <form className="mt-6 space-y-4" onSubmit={submitPassword}>
            <div>
              <FieldLabel htmlFor="st-cur-pw">Current password</FieldLabel>
              <input
                id="st-cur-pw"
                required
                type="password"
                autoComplete="current-password"
                className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm text-fw-ink outline-none ring-fw-red-500/30 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                value={curPwChange}
                onChange={(e) => setCurPwChange(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <FieldLabel htmlFor="st-np1">New password</FieldLabel>
                <input
                  id="st-np1"
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm text-fw-ink outline-none ring-fw-red-500/30 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                  value={nextPwChange}
                  onChange={(e) => setNextPwChange(e.target.value)}
                />
              </div>
              <div className="min-w-0">
                <FieldLabel htmlFor="st-np2">Confirm new password</FieldLabel>
                <input
                  id="st-np2"
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm text-fw-ink outline-none ring-fw-red-500/30 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                  value={nextPwRepeat}
                  onChange={(e) => setNextPwRepeat(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-fw-muted">
              At least 10 characters including one uppercase letter and one number.
            </p>
            <button
              type="submit"
              disabled={pwBusy}
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-55 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {pwBusy ? "Updating…" : "Change password"}
            </button>
          </form>
          {pwMsg ? (
            <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{pwMsg}</p>
          ) : null}
          {pwErr ? (
            <p className="mt-4 text-sm text-fw-red-600" role="alert">
              {pwErr}
            </p>
          ) : null}
        </section>
      </div>
    </ShellPageBody>
  );
}
