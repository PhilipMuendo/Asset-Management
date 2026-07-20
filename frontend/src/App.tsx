import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { UsersPage } from "./pages/UsersPage";
import { AssetsPage } from "./pages/AssetsPage";
import { BorrowingPage } from "./pages/BorrowingPage";
import { ConfigurationsPage } from "./pages/ConfigurationsPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { SettingsPage } from "./pages/SettingsPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/borrowing" element={<BorrowingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route element={<ProtectedRoute roles={["admin", "superadmin"]} />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/admin/configurations" element={<ConfigurationsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

