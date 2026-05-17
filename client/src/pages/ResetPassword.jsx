import { useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import BrandLogo from "../components/BrandLogo.jsx";
import { postAuthResetPassword } from "../services/api.js";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(
    () => searchParams.get("token")?.trim() ?? "",
    [searchParams],
  );
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(/** @type {string | null} */ (null));
  const [error, setError] = useState(/** @type {string | null} */ (null));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!token) {
      setError(
        "This reset link is missing a token. Open the latest link from your email.",
      );
      return;
    }

    setBusy(true);
    try {
      const data = await postAuthResetPassword({
        token,
        newPassword: password,
      });
      const msg =
        typeof data?.message === "string"
          ? data.message
          : "Your password has been updated.";
      setNotice(msg);
      window.setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  }

  const missingLink = !token;

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
              New password
            </h1>
            <p className="mt-3 text-center text-sm leading-relaxed text-white/82">
              Pick a password you have not used here before — at least 10 characters with
              one uppercase letter and one number.
            </p>
          </div>
        </div>
        <div className="p-8">
          {notice ? (
            <p className="text-center text-sm text-fw-ink">{notice}</p>
          ) : missingLink ? (
            <p className="text-center text-sm text-fw-ink">
              This reset link looks incomplete.{" "}
              <Link className="font-medium text-fw-red-600 hover:underline" to="/forgot-password">
                Request a new link.
              </Link>
            </p>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={submit}>
              <label className="block text-sm font-medium text-fw-ink">
                New password
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  minLength={10}
                  className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-3 text-sm text-fw-ink outline-none ring-fw-red-500/30 transition placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                  value={password}
                  onChange={(evt) => setPassword(evt.target.value)}
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
                Update password
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
