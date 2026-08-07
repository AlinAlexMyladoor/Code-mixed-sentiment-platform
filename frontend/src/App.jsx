import { useCallback, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import { useWebSocket } from './hooks/useWebSocket';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import CommentExplorer from './pages/CommentExplorer';
import AIInsights from './pages/AIInsights';
import ConnectPages from './pages/ConnectPages';
import Settings from './pages/Settings';
import './index.css';

function AppShell() {
  const [wsStatus, setWsStatus] = useState('connecting');

  // Track WebSocket status at the shell level for sidebar indicator
  const onWsMessage = useCallback(() => {}, []);

  // We use a simple status-only WS hook here; Dashboard creates its own
  const status = useWebSocket(onWsMessage);

  // Keep sidebar status in sync
  if (status !== wsStatus) setWsStatus(status);

  return (
    <div className="app-shell">
      <Sidebar wsStatus={wsStatus} />
      <main className="main-content">
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/analytics"  element={<Analytics />} />
          <Route path="/comments"   element={<CommentExplorer />} />
          <Route path="/ai-insights" element={<AIInsights />} />
          <Route path="/connect"    element={<ConnectPages />} />
          <Route path="/settings"   element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
