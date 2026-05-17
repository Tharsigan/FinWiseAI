import { NavLink, useNavigate } from "react-router-dom";
import BrandLogo from "./BrandLogo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useFinwiseData } from "../context/FinwiseDataProvider.jsx";
import { mergeUserProfile } from "../lib/mergeUserProfile.js";

const links = [
  { to: "/dashboard", label: "Home", desktopLabel: "Dashboard", icon: "◆" },
  { to: "/transactions", label: "Activity", desktopLabel: "Transactions", icon: "☰" },
  { to: "/transfer", label: "Pay", desktopLabel: "Transfer", icon: "↗" },
  { to: "/savings", label: "Save", desktopLabel: "Savings", icon: "◎" },
  { to: "/insights", label: "Insights", desktopLabel: "Insights", icon: "◇" },
  { to: "/ai", label: "AI", desktopLabel: "AI Assistant", icon: "✦" },
  { to: "/scholarships", label: "Aid", desktopLabel: "Scholarships", icon: "★" },
  { to: "/settings", label: "Set", desktopLabel: "Settings", icon: "⚙" },
];

const linkBase =
  "finwise-hover flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium border border-transparent";
const inactive =
  "text-fw-muted hover:bg-fw-section hover:text-fw-ink dark:hover:bg-white/[0.06]";
const active =
  "bank-red-gradient text-white shadow-[0_2px_8px_-3px_rgba(227,29,35,0.35),0_6px_14px_-8px_rgba(184,20,25,0.22)] ring-1 ring-white/20";

export default function AppNav() {
  const navigate = useNavigate();
  const { logout, user, profile } = useAuth();
  const { snapshot } = useFinwiseData();
  const greeting = mergeUserProfile(snapshot?.profile, user, profile);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <aside className="sticky top-4 hidden h-fit w-60 shrink-0 flex-col rounded-2xl border border-fw-border/80 bg-fw-panel/90 p-3 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_20px_-12px_rgba(0,0,0,0.03)] backdrop-blur-md dark:border-fw-border/90 dark:shadow-[0_2px_14px_-4px_rgba(0,0,0,0.4),0_12px_28px_-14px_rgba(0,0,0,0.28)] lg:flex">
        <div className="mb-6 px-2">
          <div className="flex items-start gap-3">
            {greeting.mergedAvatarSrc ? (
              <img
                alt=""
                className="h-10 w-10 shrink-0 rounded-full border border-fw-border bg-fw-section object-cover"
                src={greeting.mergedAvatarSrc}
              />
            ) : (
              <BrandLogo className="h-10 w-10 shrink-0 object-contain" />
            )}
            <div className="min-w-0">
              <p className="bg-[linear-gradient(135deg,#E31D23,#B81419)] bg-clip-text text-xs font-bold uppercase tracking-wider text-transparent">
                FinWise AI
              </p>
              <p className="mt-2 text-sm font-semibold text-fw-ink">
                Hi, {greeting.firstName}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-fw-muted">
                {greeting.university || "University not set"}
              </p>
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `${linkBase} ${isActive ? active : inactive}`
              }
            >
              {({ isActive }) => (
                <>
                  <span aria-hidden className={isActive ? "opacity-100" : "opacity-90"}>
                    {l.icon}
                  </span>
                  {l.desktopLabel}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          className="mt-6 rounded-xl px-3 py-2 text-center text-xs font-medium text-fw-muted underline-offset-2 hover:text-fw-red-600 hover:underline"
          onClick={handleLogout}
        >
          Log out
        </button>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex gap-1 border-t border-fw-border/80 bg-fw-panel/90 px-2 py-2 pb-[max(env(safe-area-inset-bottom),0.65rem)] shadow-[0_-4px_24px_-10px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-fw-border/90 dark:shadow-[0_-4px_28px_-10px_rgba(0,0,0,0.35)] lg:hidden">
        {links.slice(0, 5).map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center rounded-xl px-1 py-1.5 text-[10px] font-semibold transition ${
                isActive
                  ? "bank-red-gradient text-white shadow-[0_2px_8px_-3px_rgba(227,29,35,0.35)]"
                  : "text-fw-muted hover:bg-fw-section hover:text-fw-ink dark:hover:bg-white/[0.06]"
              }`
            }
          >
            <span aria-hidden className="text-xs">
              {l.icon}
            </span>
            <span className="truncate">{l.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={handleLogout}
          className="flex min-w-0 flex-[0.85] flex-col items-center rounded-xl px-1 py-1.5 text-[10px] font-semibold text-fw-muted transition hover:bg-fw-section hover:text-fw-ink dark:hover:bg-white/[0.06]"
        >
          <span aria-hidden className="text-xs">
            ⧉
          </span>
          <span className="truncate">Out</span>
        </button>
      </nav>
    </>
  );
}
