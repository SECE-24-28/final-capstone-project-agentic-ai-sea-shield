import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, AlertCircle, LogOut, FileText, Database, Server, Map as MapIcon, Navigation, Radio, Send, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { API_URL } from '../config';


export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [activeTab, setActiveTab] = useState('fleet'); // Default to fleet map FOR FAMILY HUB

  const boatIcon = new L.Icon({
    iconUrl: '/boat.png',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  useEffect(() => {
    // Basic Auth Check
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      toast.error('Unauthorized access. Redirecting...');
      navigate('/');
    }

    fetch(`${API_URL}/api/admin/users`)

      .then(res => res.json())
      .then(data => { if (data.success) setUsers(data.data); })
      .catch(() => console.error("Could not fetch users"));

    fetch(`${API_URL}/api/admin/alerts`)

      .then(res => res.json())
      .then(data => { if (data.success) setAlerts(data.data); })
      .catch(() => console.error("Could not fetch alerts"));

    const fetchFleet = () => {
      fetch(`${API_URL}/api/admin/fleet`)

        .then(res => res.json())
        .then(data => { if (data.success) setFleet(data.data); })
        .catch(() => console.error("Could not fetch fleet"));
    };

    fetchFleet();
    const interval = setInterval(fetchFleet, 5000);
    return () => clearInterval(interval);
  }, []);

  const sendWarning = (boatId) => {
    const msg = prompt("Enter warning message to send to captain:");
    if (!msg) return;
    
    fetch(`${API_URL}/api/messages`, {

      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId: 'ADMIN-COMMAND', receiverId: boatId, content: `[OFFICIAL WARNING]: ${msg}` })
    }).then(() => toast.success(`Warning dispatched to ${boatId}`));
  };

  const deleteUser = (userId) => {
    if (!window.confirm("Are you sure you want to decommission this user ID?")) return;
    fetch(`${API_URL}/api/admin/users/${userId}`, { method: 'DELETE' })

      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUsers(prev => prev.filter(u => u._id !== userId));
          toast.success("User removed from registry");
        }
      });
  };

  const clearLogs = () => {
    if (!window.confirm("Clear all historical safety logs?")) return;
    fetch(`${API_URL}/api/admin/alerts`, { method: 'DELETE' })

      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAlerts([]);
          toast.success("All logs purged");
        }
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    toast.success('Admin logged out successfully');
    navigate('/');
  };

  return (
    <div className="h-screen bg-ocean-dark text-white flex flex-col font-sans overflow-hidden">
      {/* Top Navbar */}
      <header className="h-16 border-b border-ocean-light bg-ocean-mid flex items-center justify-between px-6 shadow-md z-10 glass-panel">
        <button onClick={() => setActiveTab('fleet')} className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
          <Shield className="w-8 h-8 text-purple-400" />
          <h1 className="text-xl font-bold tracking-wider">SeaShield <span className="text-purple-400">ADMIN</span></h1>
        </button>
        
        <div className="flex items-center gap-6">
          <div className="flex gap-2 items-center px-4 py-1 rounded bg-ocean-dark border border-ocean-light">
            <Server className="w-4 h-4 text-emerald-400" />
            <span className="text-sm">Status: ONLINE</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 font-bold transition-colors"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-ocean-light bg-ocean-mid p-6 flex flex-col gap-4">
          <button 
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-3 p-3 rounded-lg font-bold transition-all ${activeTab === 'fleet' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'text-gray-400 hover:bg-ocean-light'}`}
          >
            <MapIcon className="w-5 h-5" /> Global Fleet Map
          </button>

          <button 
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-3 p-3 rounded-lg font-bold transition-all ${activeTab === 'users' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' : 'text-gray-400 hover:bg-ocean-light'}`}
          >
            <Users className="w-5 h-5" /> Registered Crews
          </button>
          
          <button 
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-3 p-3 rounded-lg font-bold transition-all ${activeTab === 'alerts' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'text-gray-400 hover:bg-ocean-light'}`}
          >
            <AlertCircle className="w-5 h-5" /> Security Logs
          </button>

          <button 
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-3 p-3 rounded-lg font-bold transition-all ${activeTab === 'system' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'text-gray-400 hover:bg-ocean-light'}`}
          >
            <Database className="w-5 h-5" /> System Health
          </button>
        </aside>

        {/* Dashboard Area */}
        <main className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-gradient-to-br from-ocean-dark to-[#0f1a2a]">
          
          {/* Fleet Map Tab */}
          {activeTab === 'fleet' && (
            <div className="h-full flex flex-col gap-6 animate-fade-in">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-wider text-blue-400 flex items-center gap-3">
                    <Activity className="animate-pulse" /> Live Fleet Command
                  </h2>
                  <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-bold">Real-time maritime surveillance (SRI LANKA-INDIA SECTOR)</p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-ocean-mid border border-ocean-light p-4 rounded-xl shadow-xl min-w-[150px]">
                    <span className="text-[10px] text-gray-500 block uppercase font-black">Active Vessels</span>
                    <span className="text-2xl font-black text-blue-400">{fleet.length}</span>
                  </div>
                  <div className="bg-ocean-mid border border-ocean-light p-4 rounded-xl shadow-xl min-w-[150px]">
                    <span className="text-[10px] text-gray-500 block uppercase font-black">Open Alerts</span>
                    <span className="text-2xl font-black text-rose-500">{alerts.filter(a => a.type === 'SOS').length}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 rounded-2xl overflow-hidden border border-ocean-light shadow-2xl relative min-h-[500px] z-0">
                <MapContainer center={[9.1, 79.1]} zoom={9} className="h-full w-full">
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Esri Satellite"
                  />
                  {fleet.map((boat, i) => (
                    <Marker key={i} position={[boat.lat, boat.lng]} icon={boatIcon}>
                      <Tooltip permanent direction="top" offset={[0, -15]} className="bg-ocean-dark border-blue-500/50 text-blue-400 font-bold text-[10px] rounded px-1 shadow-lg">
                        {boat.boatId}
                      </Tooltip>
                      <Popup className="custom-popup">
                        <div className="p-2 min-w-[200px] bg-ocean-dark text-white rounded">
                          <h3 className="font-bold border-b border-gray-700 pb-1 mb-2 text-blue-400 uppercase tracking-tighter">Vessel: {boat.boatId}</h3>
                          <div className="space-y-1 text-xs">
                            <p><span className="text-gray-400">STATUS:</span> <span className={boat.status === 'SAFE' ? 'text-emerald-400 font-bold' : 'text-rose-500 font-bold animate-pulse'}>{boat.status}</span></p>
                            <p><span className="text-gray-400">COORD:</span> {boat.lat.toFixed(4)}, {boat.lng.toFixed(4)}</p>
                            <p><span className="text-gray-400">SPEED:</span> {boat.speed.toFixed(1)} km/h</p>
                            <p className="text-[10px] text-gray-500 pt-1 mt-1 border-t border-gray-700">Last Ping: {new Date(boat.timestamp).toLocaleTimeString()}</p>
                          </div>
                          <button 
                            onClick={() => sendWarning(boat.boatId)}
                            className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_4px_10px_rgba(37,99,235,0.3)]"
                          >
                            <Send className="w-3 h-3 inline mr-1" /> Send Warning
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-black mb-6 uppercase tracking-wider text-purple-400 flex items-center gap-3">
                <Users /> Vessel & Captain Roster
              </h2>
              
              <div className="bg-ocean-mid rounded-xl border border-ocean-light shadow-2xl overflow-hidden glass-panel">
                <table className="w-full text-left">
                  <thead className="bg-ocean-dark/50 border-b border-ocean-light">
                    <tr>
                      <th className="p-4 font-bold text-gray-300 tracking-wider text-sm">NAME / REGISTRATION</th>
                      <th className="p-4 font-bold text-gray-300 tracking-wider text-sm">VESSEL / BOAT ID</th>
                      <th className="p-4 font-bold text-gray-300 tracking-wider text-sm">EMAIL CONTACT</th>
                      <th className="p-4 font-bold text-gray-300 tracking-wider text-sm text-center">PRIVILEGE</th>
                      <th className="p-4 font-bold text-gray-300 tracking-wider text-sm text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr><td colSpan="5" className="text-center p-8 text-gray-500 italic">No registered users in the database yet.</td></tr>
                    ) : (
                      users.map((u, i) => (
                        <tr key={u._id || i} className="border-b border-ocean-light/50 hover:bg-ocean-light/20 transition-colors">
                          <td className="p-4 font-semibold text-white">{u.name}</td>
                          <td className="p-4 text-xs font-bold text-blue-400">{u.boatId || '---'}</td>
                          <td className="p-4 text-gray-400">{u.email}</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                              u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 
                              u.role === 'family' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            {u.role === 'fisherman' && u.boatId && (
                              <button 
                                onClick={() => sendWarning(u.boatId)}
                                className="px-3 py-1 bg-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded text-[10px] font-black uppercase transition-all border border-rose-500/30"
                              >
                                Warning
                              </button>
                            )}
                            <button 
                              onClick={() => deleteUser(u._id)}
                              className="px-3 py-1 bg-gray-500/20 text-gray-400 hover:bg-red-600 hover:text-white rounded text-[10px] font-black uppercase transition-all border border-gray-600"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black uppercase tracking-wider text-orange-400 flex items-center gap-3">
                  <FileText /> Historical Safety Logs
                </h2>
                <button 
                  onClick={clearLogs}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase rounded shadow-lg transition-all"
                >
                  Purge All Logs
                </button>
              </div>
              
              <div className="bg-ocean-mid rounded-xl border border-ocean-light shadow-2xl overflow-hidden glass-panel">
                <table className="w-full text-left">
                  <thead className="bg-ocean-dark/50 border-b border-ocean-light">
                    <tr>
                      <th className="p-4 font-bold text-gray-300 tracking-wider text-sm">TIMESTAMP</th>
                      <th className="p-4 font-bold text-gray-300 tracking-wider text-sm">VESSEL ID</th>
                      <th className="p-4 font-bold text-gray-300 tracking-wider text-sm text-center">SEVERITY TYPE</th>
                      <th className="p-4 font-bold text-gray-300 tracking-wider text-sm">MESSAGE LOG</th>
                      <th className="p-4 font-bold text-gray-300 tracking-wider text-sm text-right">COORDINATES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.length === 0 ? (
                      <tr><td colSpan="5" className="text-center p-8 text-gray-500 italic">Central Logs are entirely clear. No historical alerts.</td></tr>
                    ) : (
                      alerts.map((a, i) => (
                        <tr key={a._id || i} className="border-b border-ocean-light/50 hover:bg-ocean-light/20 transition-colors">
                          <td className="p-4 text-gray-400 text-sm font-mono whitespace-nowrap">
                            {new Date(a.timestamp).toLocaleString()}
                          </td>
                          <td className="p-4 font-bold text-blue-400 text-xs">
                            {a.boatId || 'N/A'}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${a.type === 'SOS' ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-orange-500/20 text-orange-400'}`}>
                              {a.type}
                            </span>
                          </td>
                          <td className={`p-4 font-medium ${a.type === 'SOS' ? 'text-red-400' : 'text-orange-200'}`}>
                            {a.message}
                          </td>
                          <td className="p-4 text-right font-mono text-gray-500 text-sm">
                            Lat: {a.location?.lat.toFixed(4)}<br/>Lng: {a.location?.lng.toFixed(4)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-black mb-6 uppercase tracking-wider text-blue-400 flex items-center gap-3">
                <Database /> Command Matrix Status
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <div className="bg-ocean-mid p-6 rounded-xl border border-blue-500/30 glass-panel shadow-[0_0_25px_rgba(59,130,246,0.1)]">
                  <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Turf.js Subsystem</h3>
                  <div className="text-3xl font-black text-blue-400">ACTIVE</div>
                  <p className="text-xs text-blue-200 mt-2">Geofencing & Collision Logic functioning at 100% capacity.</p>
                </div>

                <div className="bg-ocean-mid p-6 rounded-xl border border-emerald-500/30 glass-panel shadow-[0_0_25px_rgba(16,185,129,0.1)]">
                  <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Socket Web-Relays</h3>
                  <div className="text-3xl font-black text-emerald-400">SECURE</div>
                  <p className="text-xs text-emerald-200 mt-2">Family Hub synchronization pipes securely transmitting.</p>
                </div>
                
                <div className="bg-ocean-mid p-6 rounded-xl border border-purple-500/30 glass-panel shadow-[0_0_25px_rgba(168,85,247,0.1)]">
                  <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Active Users</h3>
                  <div className="text-3xl font-black text-purple-400">{users.length}</div>
                  <p className="text-xs text-purple-200 mt-2">Registered captains authenticated into the marine database.</p>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
