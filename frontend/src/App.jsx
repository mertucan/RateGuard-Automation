import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { RateBotProvider } from "./contexts/RateBotContext";
import MainDashboardPage from "./pages/MainDashboardPage";
import ContractReviewPage from "./pages/ContractReviewPage";
import ClientManagementPage from "./pages/ClientManagementPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AuditLogPage from "./pages/AuditLogPage";
import TeamManagementPage from "./pages/TeamManagementPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import ApplicationManagementPage from "./pages/ApplicationManagementPage";
import HRDashboardPage from "./pages/HRDashboardPage";
import Layout from "./components/Layout";
import SplashScreen from "./components/SplashScreen";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LandingPage from "./pages/LandingPage";
import SolutionsPage from "./pages/SolutionsPage";
import AboutUsPage from "./pages/AboutUsPage";
import KeyBenefitsPage from "./pages/KeyBenefitsPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import UserWelcomePage from "./pages/UserWelcomePage";
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
        element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />}
      />
      <Route path="/solutions" element={<SolutionsPage />} />
      <Route path="/about-us" element={<AboutUsPage />} />
      <Route path="/key-benefits" element={<KeyBenefitsPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/terms-of-service" element={<TermsOfServicePage />} />
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
              {user?.role === "user" && !user?.company_id ? (
                <UserWelcomePage />
              ) : user?.role === "hr" ? (
                <HRDashboardPage />
              ) : (
                <MainDashboardPage />
              )}
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
              "user",
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
              "user",
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
          <ProtectedRoute
            roles={[
              "super_admin",
              "company_admin",
              "finance",
              "user",
            ]}
          >
            <Layout>
              <AnalyticsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications"
        element={
          <ProtectedRoute roles={["user"]}>
            <Layout>
              <ApplicationsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/application-management"
        element={
          <ProtectedRoute roles={["super_admin", "company_admin", "hr"]}>
            <Layout>
              <ApplicationManagementPage />
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
          <RateBotProvider>
            <SplashScreen>
              <AppRoutes />
            </SplashScreen>
          </RateBotProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
