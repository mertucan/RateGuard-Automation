import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainDashboardPage from './pages/MainDashboardPage'
import ContractReviewPage from './pages/ContractReviewPage'
import ClientManagementPage from './pages/ClientManagementPage'
import Layout from './components/Layout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Layout><MainDashboardPage /></Layout>} />
        <Route path="/renewal-review" element={<Layout><ContractReviewPage /></Layout>} />
        <Route path="/clients" element={<Layout><ClientManagementPage /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
