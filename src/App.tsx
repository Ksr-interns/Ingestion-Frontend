import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { AuthPage } from "@/features/auth/components/AuthPage";
import { DatasetsPage } from "@/features/datasets/components/DatasetsPage";
import { DatasetDetailPage } from "@/features/datasets/components/DatasetDetailPage";
import { IntegrationsPage } from "@/features/integrations/components/IntegrationsPage";
import { HistoryPage } from "@/features/ingestion/components/HistoryPage";
import { AuditPage } from "@/features/audit/components/AuditPage";
import { MembersPage } from "@/features/organization/components/MembersPage";
import { CreateUserPage } from "@/features/organization/components/CreateUserPage";
import { SettingsPage } from "@/features/settings/components/SettingsPage";
import { OrganizationsPage } from "@/features/admin/components/OrganizationsPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<Navigate to="/login" replace />} />

        {/* Protected routes — wrapped in WorkspaceShell */}
        <Route element={<ProtectedRoute />}>
          <Route
            element={
              <WorkspaceShell>
                <Routes>
                  <Route index element={<Navigate to="/datasets" replace />} />
                  <Route path="datasets" element={<DatasetsPage />} />
                  <Route path="datasets/:id" element={<DatasetDetailPage />} />
                  <Route path="uploads" element={<IntegrationsPage />} />
                  <Route path="integrations" element={<Navigate to="/uploads" replace />} />
                  <Route path="history" element={<HistoryPage />} />
                  <Route path="audit-logs" element={<AuditPage />} />
                  <Route path="organization/members" element={<MembersPage />} />
                  <Route path="organization/create-user" element={<CreateUserPage />} />
                  <Route path="organization/settings" element={<SettingsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="admin/organizations" element={<OrganizationsPage />} />
                  <Route path="*" element={<Navigate to="/datasets" replace />} />
                </Routes>
              </WorkspaceShell>
            }
            path="/*"
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
