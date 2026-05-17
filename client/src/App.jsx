import { useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import AiAssistantPage from "./pages/AiAssistant.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import ForgotPasswordPage from "./pages/ForgotPassword.jsx";
import InsightsPage from "./pages/InsightsPage.jsx";
import LoginPage from "./pages/Login.jsx";
import RegisterPage from "./pages/Register.jsx";
import ResetPasswordPage from "./pages/ResetPassword.jsx";
import SavingsPlannerPage from "./pages/SavingsPlanner.jsx";
import ScholarshipsPage from "./pages/Scholarships.jsx";
import SettingsPage from "./pages/Settings.jsx";
import TransactionsPage from "./pages/Transactions.jsx";
import TransferPage from "./pages/Transfer.jsx";
import ApiStatusBanner from "./components/ApiStatusBanner.jsx";
import AppNav from "./components/AppNav.jsx";
import BrandLogo from "./components/BrandLogo.jsx";
import OfflineDataRibbon from "./components/OfflineDataRibbon.jsx";
import { useAuth } from "./context/AuthContext.jsx";

/**
 * @param {{ children: import("react").ReactNode; mainScrollable?: boolean }} props
 */
function AppShell({ children, mainScrollable = false }) {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-fw-canvas">
      <div className="shrink-0">
        <ApiStatusBanner />
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:gap-10">
        <AppNav />
        <main
          className={`finwise-page flex min-h-0 min-w-0 flex-1 flex-col pb-24 lg:pb-10 ${
            mainScrollable ? "overflow-y-auto overscroll-y-contain" : "overflow-hidden"
          }`}
        >
          <OfflineDataRibbon />
          {children}
        </main>
      </div>
      <footer className="shrink-0 border-t border-fw-border/80 bg-fw-panel/90 px-4 py-4 backdrop-blur-md sm:px-6 dark:border-fw-border/90">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 text-center text-xs text-fw-muted">
          <BrandLogo className="h-4 w-4 shrink-0 object-contain" alt="" />
          FinWise AI · A banking app designed for university students to track expenses,
          manage balances, and build better savings habits.
        </div>
      </footer>
    </div>
  );
}

function LoadingGate() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-fw-canvas text-sm text-fw-muted">
      Checking your session…
    </div>
  );
}

/** @param {{ children: import("react").ReactNode }} props */
function GuestOnly({ children }) {
  const { authReady, user } = useAuth();
  if (!authReady) return <LoadingGate />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

/**
 * @param {{ children: import("react").ReactNode; mainScrollable?: boolean }} props
 */
function RequireShell({ children, mainScrollable = false }) {
  const { authReady, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authReady && !user) {
      navigate("/login", { replace: true });
    }
  }, [authReady, user, navigate]);

  if (!authReady || !user) {
    return <LoadingGate />;
  }

  return <AppShell mainScrollable={mainScrollable}>{children}</AppShell>;
}

function RootRedirect() {
  const { authReady, user } = useAuth();
  if (!authReady) return <LoadingGate />;
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <GuestOnly>
            <ForgotPasswordPage />
          </GuestOnly>
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/dashboard"
        element={
          <RequireShell>
            <DashboardPage />
          </RequireShell>
        }
      />
      <Route path="/balance" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/insights"
        element={
          <RequireShell mainScrollable>
            <InsightsPage />
          </RequireShell>
        }
      />
      <Route
        path="/transactions"
        element={
          <RequireShell mainScrollable>
            <TransactionsPage />
          </RequireShell>
        }
      />
      <Route
        path="/transfer"
        element={
          <RequireShell>
            <TransferPage />
          </RequireShell>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireShell mainScrollable>
            <SettingsPage />
          </RequireShell>
        }
      />
      <Route
        path="/ai"
        element={
          <RequireShell>
            <AiAssistantPage />
          </RequireShell>
        }
      />
      <Route
        path="/scholarships"
        element={
          <RequireShell>
            <ScholarshipsPage />
          </RequireShell>
        }
      />
      <Route
        path="/savings"
        element={
          <RequireShell>
            <SavingsPlannerPage />
          </RequireShell>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
