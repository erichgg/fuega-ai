import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/ThemeContext';
import { ToastProvider } from './lib/ToastContext';
import { ToastContainer } from './components/Toast';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
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

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<ErrorBoundary><Layout /></ErrorBoundary>}>
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
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<div className="text-center py-24"><h1 className="text-2xl font-bold gradient-text">404</h1><p className="text-chispa-text-secondary mt-2">Page not found</p></div>} />
            </Route>
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
