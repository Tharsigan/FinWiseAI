import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { applyDocumentTheme } from "../lib/theme.js";
import {
  fetchAuthMe,
  fetchAuthProfile,
  postAuthLogout,
} from "../services/api.js";

/** @typedef {{ id: string; email: string }} AuthUser */

/**
 * Normalized persisted profile/settings from `/api/auth/profile`.
 * @typedef {{
 *   firstName: string;
 *   lastName: string;
 *   mobile: string;
 *   district: string;
 *   institutionName: string;
 *   theme: "light"|"dark";
 *   avatarUrl: string|null;
 *   avatarTs: number|null;
 * }} SettingsProfileNormalized
 */

/**
 * @type {React.Context<{
 *   user: AuthUser | null;
 *   profile: SettingsProfileNormalized | null;
 *   authReady: boolean;
 *   setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
 *   refreshAuth: () => Promise<void>;
 *   refreshProfile: () => Promise<void>;
 *   logout: () => Promise<void>;
 * } | null>}
 */
const AuthContext = createContext(null);

/** @param {unknown} raw */
function coerceSettingsProfile(raw) {
  if (!raw || typeof raw !== "object") return null;

  /** @type {Record<string, unknown>} */
  const o = raw;
  const theme = o.theme === "dark" ? "dark" : "light";
  const ts = o.avatarTs;
  const avatarTs = typeof ts === "number" && Number.isFinite(ts) ? ts : null;

  return {
    firstName: String(o.firstName ?? ""),
    lastName: String(o.lastName ?? ""),
    mobile: String(o.mobile ?? ""),
    district: String(o.district ?? ""),
    institutionName: String(o.institutionName ?? ""),
    theme,
    avatarUrl: typeof o.avatarUrl === "string" ? o.avatarUrl : null,
    avatarTs,
  };
}

/** @param {{ children: import("react").ReactNode }} props */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(/** @type {AuthUser | null} */ (null));
  const [profile, setProfile] = useState(
    /** @type {SettingsProfileNormalized | null} */ (null),
  );
  const [authReady, setAuthReady] = useState(false);

  const refreshAuth = useCallback(async () => {
    const u = await fetchAuthMe();
    setUser(u);
    if (!u) {
      setProfile(null);
      applyDocumentTheme("light");
      return;
    }

    try {
      const raw = await fetchAuthProfile();
      const p = coerceSettingsProfile(raw);
      setProfile(p);
      applyDocumentTheme(p?.theme ?? "light");
    } catch {
      setProfile(null);
      applyDocumentTheme("light");
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const raw = await fetchAuthProfile();
      const p = coerceSettingsProfile(raw);
      setProfile(p);
      applyDocumentTheme(p?.theme ?? "light");
    } catch {
      /* keep prior profile cache */
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      await refreshAuth();
      if (!cancelled) setAuthReady(true);
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [refreshAuth]);

  const logout = useCallback(async () => {
    try {
      await postAuthLogout();
    } catch {
      /* still clear UI session */
    }
    setUser(null);
    setProfile(null);
    applyDocumentTheme("light");
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      authReady,
      setUser,
      refreshAuth,
      refreshProfile,
      logout,
    }),
    [user, profile, authReady, refreshAuth, refreshProfile, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
