import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Home from './pages/Home';
import MaritimeMap from './pages/MaritimeMap';
import FishermanDashboard from './pages/FishermanDashboard';
import AlertSystem from './pages/AlertSystem';
import FamilyDashboard from './pages/FamilyDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SOS from './pages/SOS';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <div className="bg-ocean-dark text-white min-h-screen">
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<Home />} />
        <Route path="/map" element={<MaritimeMap />} />
        <Route path="/tracking" element={<FishermanDashboard />} />
        <Route path="/alerts" element={<AlertSystem />} />
        <Route path="/family" element={<FamilyDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/sos" element={<SOS />} />
      </Routes>
    </div>
  );
}

export default App;
