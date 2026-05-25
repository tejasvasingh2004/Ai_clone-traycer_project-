import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PlanCreator from './pages/PlanCreator';
import Proposals from './pages/Proposals';
import Verify from './pages/Verify';
import History from './pages/History';

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plan" element={<PlanCreator />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
