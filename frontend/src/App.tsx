import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './lib/ThemeContext';
import { ToastProvider } from './lib/ToastContext';
import { ToastContainer } from './components/Toast';
import { AuthProvider, useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Spinner } from './components/Spinner';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import AgentDetail from './pages/AgentDetail';
import Content from './pages/Content';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import SEO from './pages/SEO';
import Campaigns from './pages/Campaigns';
import Analytics from './pages/Analytics';
import Workflows from './pages/Workflows';
import Settings from './pages/Settings';
import Organization from './pages/Organization';
import TeamChat from './pages/TeamChat';
import ControlPanel from './pages/ControlPanel';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Approvals from './pages/Approvals';
import Billing from './pages/Billing';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-fuega-surface">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-fuega-surface">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public routes — no Layout */}
              <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
              <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />

              {/* Protected routes — with Layout */}
              <Route element={<RequireAuth><ErrorBoundary><Layout /></ErrorBoundary></RequireAuth>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/control-panel" element={<ControlPanel />} />
                <Route path="/organization" element={<Organization />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/team-chat" element={<TeamChat />} />
                <Route path="/agents/:slug" element={<AgentDetail />} />
                <Route path="/content" element={<Content />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/leads/:id" element={<LeadDetail />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:id" element={<ClientDetail />} />
                <Route path="/seo" element={<SEO />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/workflows" element={<Workflows />} />
                <Route path="/approvals" element={<Approvals />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<div className="text-center py-24"><h1 className="text-2xl font-bold gradient-text">404</h1><p className="text-fuega-text-secondary mt-2">Page not found</p></div>} />
              </Route>
            </Routes>
            <ToastContainer />
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
