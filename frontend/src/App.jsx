import { useCallback, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import { useWebSocket } from './hooks/useWebSocket';
import { DemoProvider } from './context/DemoContext';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import CommentExplorer from './pages/CommentExplorer';
import Tickets from './pages/Tickets';
import AIInsights from './pages/AIInsights';
import ConnectPages from './pages/ConnectPages';
import AlertRules from './pages/AlertRules';
import Settings from './pages/Settings';
import PrivacyPolicy from './pages/PrivacyPolicy';
import './index.css';

function AppShell() {
  const [wsStatus, setWsStatus] = useState('connecting');
  const onWsMessage = useCallback(() => {}, []);
  const status = useWebSocket(onWsMessage);
  if (status !== wsStatus) setWsStatus(status);

  return (
    <div className="app-shell">
      <Sidebar wsStatus={wsStatus} />
      <main className="main-content">
        <Routes>
          <Route path="/"            element={<Dashboard />} />
          <Route path="/analytics"   element={<Analytics />} />
          <Route path="/comments"    element={<CommentExplorer />} />
          <Route path="/tickets"     element={<Tickets />} />
          <Route path="/ai-insights" element={<AIInsights />} />
          <Route path="/connect"     element={<ConnectPages />} />
          <Route path="/alert-rules" element={<AlertRules />} />
          <Route path="/settings"    element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <DemoProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/*" element={<AppShell />} />
        </Routes>
      </BrowserRouter>
    </DemoProvider>
  );
}
