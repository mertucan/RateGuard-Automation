import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import MainDashboardPage from "./pages/MainDashboardPage";
import ContractReviewPage from "./pages/ContractReviewPage";
import ClientManagementPage from "./pages/ClientManagementPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AuditLogPage from "./pages/AuditLogPage";
import TeamManagementPage from "./pages/TeamManagementPage";
import Layout from "./components/Layout";
import SplashScreen from "./components/SplashScreen";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import { PageLoader } from "./components/Spinner";
import ErrorBoundary from "./components/ErrorBoundary";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role))
    return <Navigate to="/dashboard" replace />;

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
      />
      <Route
        path="/forgot-password"
        element={
          user ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <MainDashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/renewal-review"
        element={
          <ProtectedRoute
            roles={[
              "super_admin",
              "company_admin",
              "finance",
              "sales",
              "client",
            ]}
          >
            <Layout>
              <ErrorBoundary>
                <ContractReviewPage />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/renewal-review/:id"
        element={
          <ProtectedRoute
            roles={[
              "super_admin",
              "company_admin",
              "finance",
              "sales",
              "client",
            ]}
          >
            <Layout>
              <ErrorBoundary>
                <ContractReviewPage />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute roles={["super_admin", "company_admin"]}>
            <Layout>
              <ClientManagementPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute roles={["super_admin", "company_admin", "finance"]}>
            <Layout>
              <AnalyticsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute roles={["super_admin", "company_admin"]}>
            <Layout>
              <TeamManagementPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-log"
        element={
          <ProtectedRoute roles={["super_admin", "company_admin", "finance"]}>
            <Layout>
              <AuditLogPage />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SplashScreen>
            <AppRoutes />
          </SplashScreen>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
