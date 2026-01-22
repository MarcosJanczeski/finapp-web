import { Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "../features/auth/useSession";
import { LoginPage } from "../features/auth/LoginPage";
import { DashboardPage } from "../features/auth/DashboardPage";
import { AccountsPage } from "../features/accounts/AccountsPage";
import { LedgerNewPage } from "../features/ledger/LedgerNewPage";
import type { ReactNode } from "react";

function PrivateRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  if (loading) return <div style={{ padding: 16 }}>Carregando…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/accounts"
        element={
          <PrivateRoute>
            <AccountsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/ledger/new"
        element={
          <PrivateRoute>
            <LedgerNewPage />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
