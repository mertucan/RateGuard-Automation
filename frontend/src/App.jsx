import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainDashboardPage from './pages/MainDashboardPage'
import ContractReviewPage from './pages/ContractReviewPage'
import ClientManagementPage from './pages/ClientManagementPage'
import AnalyticsPage from './pages/AnalyticsPage'
import Layout from './components/Layout'
import SplashScreen from './components/SplashScreen'
import LoginPage from './pages/LoginPage'
import Registerpage from './pages/RegisterPage'

function App() {
  return (
    <BrowserRouter>
      <SplashScreen>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Layout><MainDashboardPage /></Layout>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Registerpage />} />
          <Route path="/renewal-review" element={<Layout><ContractReviewPage /></Layout>} />
          <Route path="/renewal-review/:id" element={<Layout><ContractReviewPage /></Layout>} />
          <Route path="/clients" element={<Layout><ClientManagementPage /></Layout>} />
          <Route path="/analytics" element={<Layout><AnalyticsPage /></Layout>} />
        </Routes>
      </SplashScreen>
    </BrowserRouter>
  )
}

export default App