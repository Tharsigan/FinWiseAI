import { useState } from "react";
import { Link } from "react-router-dom";

import BrandLogo from "../components/BrandLogo.jsx";
import { postAuthForgotPassword } from "../services/api.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(/** @type {string | null} */ (null));
  const [error, setError] = useState(/** @type {string | null} */ (null));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const data = await postAuthForgotPassword({ email: email.trim() });
      const msg =
        typeof data?.message === "string"
          ? data.message
          : "If an account exists for that address, we sent password-reset instructions shortly.";
      setNotice(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-fw-canvas px-4 py-16">
      <div className="finwise-card finwise-page w-full max-w-md overflow-hidden rounded-[1.65rem] p-0 backdrop-blur">
        <div className="bg-gradient-to-b from-[#E31D23] to-[#B81419] px-8 py-8 text-white">
          <div className="flex flex-col items-center">
            <BrandLogo
              variant="tile"
              className="h-14 w-14 object-contain"
              tileClassName="mx-auto mb-5"
            />
            <h1 className="text-center text-2xl font-semibold tracking-tight">
              Reset password
            </h1>
            <p className="mt-3 text-center text-sm leading-relaxed text-white/82">
              We will email instructions if there is an account for this address.
            </p>
          </div>
        </div>
        <div className="p-8">
          {notice ? (
            <p className="text-center text-sm text-fw-ink">{notice}</p>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={submit}>
              <label className="block text-sm font-medium text-fw-ink">
                Email
                <input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="student@campus.edu.lk"
                  className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-3 text-sm text-fw-ink outline-none ring-fw-red-500/30 transition placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                  value={email}
                  onChange={(evt) => setEmail(evt.target.value)}
                />
              </label>
              {error ? (
                <p className="text-sm text-fw-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-gradient-to-b from-[#E31D23] to-[#B81419] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-fw-red-600/30 transition enabled:hover:scale-[1.02] enabled:hover:brightness-105 enabled:active:scale-[0.99] disabled:opacity-60"
              >
                Send reset instructions
              </button>
            </form>
          )}
          <div className="mt-8 text-center text-sm">
            <Link to="/login" className="font-medium text-fw-red-600 hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
