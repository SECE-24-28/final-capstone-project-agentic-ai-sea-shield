import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Users, Activity, Clock, Navigation, AlertCircle, MessageSquare, Send, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../translations';
import { SOCKET_URL, API_URL } from '../config';

const socket = io(SOCKET_URL);

// Map center updater
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(center, { animate: true });
  }, [center, map]);
  return null;
}

const boatIcon = new L.Icon({
  iconUrl: '/boat.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  className: 'marker-boat'
});

const SAFE_ZONE_POLYGON = [
  [9.35, 78.90],
  [9.35, 79.20],
  [9.25, 79.35],
  [9.10, 79.45],
  [8.95, 79.30],
  [8.90, 79.00],
  [9.00, 78.80],
  [9.20, 78.80],
  [9.35, 78.90] // Closed polygon
];

const SRI_LANKA_WATERS = [
  [9.60, 79.50],
  [9.35, 79.40],
  [9.25, 79.55],
  [9.10, 79.65],
  [8.85, 79.55],
  [8.85, 80.50],
  [9.60, 80.50],
  [9.60, 79.50] // Closed
];

const IMBL_LINE = [
  [9.60, 79.50],
  [9.35, 79.40],
  [9.25, 79.55],
  [9.10, 79.65],
  [8.85, 79.55]
];

const CORAL_REEF_ZONE = [
  [9.15, 79.05],
  [9.20, 79.08],
  [9.18, 79.15],
  [9.10, 79.12]
];
export default function FamilyDashboard() {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('user')) || {};
  const lang = localStorage.getItem('preferredLanguage') || userData.language || 'en';
  const t = translations[lang] || translations.en;

  const [boatData, setBoatData] = useState({
    lat: 9.15,
    lng: 79.15,
    speed: 0,
    status: 'OFFLINE',
    lastUpdate: null
  });
  const [alerts, setAlerts] = useState([]);
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [tripHistory, setTripHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [inactivity, setInactivity] = useState(false);

  const handleNewAlert = (msg, type) => {
    const isDanger = type === 'danger';
    setAlerts(prev => [{
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      msg,
      type
    }, ...prev].slice(0, 5));

    toast(msg, {
      icon: isDanger ? 'SOS' : '!',
      style: {
        background: isDanger ? '#ef4444' : '#f59e0b',
        color: '#fff',
        fontWeight: 'bold'
      }
    });
  };

  useEffect(() => {
    const boatId = userData.boatId || 'BOAT_DEMO';
    const familyId = 'FAMILY_' + (userData.boatId || 'DEMO');

    // Fetch initial status on load
    fetch(`${API_URL}/api/location/${boatId}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data) {
          const { lat, lng, speed, status, timestamp } = resData.data;
          setBoatData({
            lat,
            lng,
            speed,
            status,
            lastUpdate: new Date(timestamp).toLocaleString()
          });
        }
      })
      .catch(console.error);

    socket.on('location_update', (data) => {
      if (data.boatId !== boatId) return;
      setBoatData({
        lat: data.lat,
        lng: data.lng,
        speed: data.speed,
        status: data.status,
        lastUpdate: new Date(data.timestamp).toLocaleString()
      });
      // Add point to history instantly
      setTripHistory(prev => [...prev, [data.lat, data.lng]].slice(-100));
    });

    socket.on('system_alert', (data) => {
      if (data.boatId === boatId) {
        handleNewAlert(`Warning: ${data.message}`, 'warning');
      }
    });

    socket.on('emergency_sos', (data) => {
      if (data.boatId === boatId) {
        handleNewAlert(`EMERGENCY SOS: ${data.message}`, 'danger');
      }
    });

    socket.on('new_message', (msg) => {
      if (msg.receiverId === familyId) {
        setReceivedMessages(prev => [msg, ...prev]);
        toast.success("New message from the Captain!");
      }
    });

    const fetchIncoming = () => {
      fetch(`${API_URL}/api/messages/${familyId}`)
        .then(res => res.json())
        .then(data => { if (data.success) setReceivedMessages(data.data); });
    };

    fetchIncoming();

    const fetchHistory = () => {
      fetch(`${API_URL}/api/location/history/${boatId}`)
        .then(res => res.json())
        .then(data => { if (data.success) setTripHistory(data.data.map(p => [p.lat, p.lng])); });
    };

    fetchHistory();
    const histInterval = setInterval(fetchHistory, 10000);

    return () => {
      socket.off('location_update');
      socket.off('system_alert');
      socket.off('emergency_sos');
      clearInterval(histInterval);
    };
  }, []);

  useEffect(() => {
    if (!boatData.lastUpdate) return;
    const checkInactivity = () => {
      const last = new Date(boatData.lastUpdate).getTime();
      const now = new Date().getTime();
      if (now - last > 600000) { // 10 minutes inactivity
        setInactivity(true);
        handleNewAlert("ALERT: Boat has not moved or updated status in over 10 minutes!", "danger");
      } else {
        setInactivity(false);
      }
    };
    checkInactivity();
    const interval = setInterval(checkInactivity, 60000);
    return () => clearInterval(interval);
  }, [boatData.lastUpdate]);

  const sendMessage = () => {
    if (!message.trim()) return;
    fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        senderId: 'FAMILY_' + (userData.boatId || 'DEMO'), 
        receiverId: userData.boatId || 'BOAT_DEMO', 
        content: message 
      })
    }).then(() => {
      toast.success("Message sent to Captain");
      setMessage("");
    });
  };

  // eslint-disable-next-line no-unused-vars
  function unusedHandleNewAlert(msg, type) {
    const isDanger = type === 'danger';
    setAlerts(prev => [{
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      msg,
      type
    }, ...prev].slice(0, 5)); // Keep last 5

    toast(msg, {
      icon: isDanger ? '🚨' : '⚠️',
      style: {
        background: isDanger ? '#ef4444' : '#f59e0b',
        color: '#fff',
        fontWeight: 'bold'
      }
    });
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'SAFE': return 'text-safe bg-safe/20 border-safe/50';
      case 'WARNING': return 'text-warn bg-warn/20 border-warn/50';
      case 'DANGER': return 'text-danger bg-danger/20 border-danger/50 animate-pulse';
      default: return 'text-gray-400 bg-gray-800 border-gray-600';
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-ocean-dark text-white font-sans overflow-hidden">
      
      {/* Header */}
      <header className="min-h-[4rem] sm:h-16 border-b border-ocean-light bg-ocean-mid flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-2 sm:py-0 shadow-md z-30 gap-2">
        <button onClick={() => navigate('/home')} className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
          <h1 className="text-base sm:text-l font-bold tracking-wider">SeaShield {t.family_hub}</h1>
        </button>
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto w-full sm:w-auto justify-center sm:justify-end pb-1 sm:pb-0">
          <button 
            onClick={() => navigate('/home')}
            className="whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2 bg-ocean-light hover:bg-gray-600 rounded text-[10px] sm:text-sm font-semibold transition"
          >
            {t.back_to_dashboard}
          </button>
          <button 
            onClick={() => { localStorage.removeItem('user'); navigate('/'); }}
            className="whitespace-nowrap text-gray-400 hover:text-white font-bold transition-colors text-[10px] sm:text-sm uppercase"
          >
            {t.logout}
          </button>
        </div>
      </header>


      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row p-3 lg:p-6 gap-3 lg:gap-6 overflow-hidden relative">
        
        {/* Stats Panel */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4 lg:gap-6 overflow-y-auto lg:overflow-visible custom-scrollbar max-h-[40vh] lg:max-h-none order-2 lg:order-1">

          
          {/* Status Card */}
          <div className="bg-ocean-mid p-6 rounded-xl border border-ocean-light shadow-xl glass-panel relative overflow-hidden">
            <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> {t.live_status}
            </h2>
            
            <div className={`p-4 rounded border-l-4 mb-6 ${getStatusColor(boatData.status)}`}>
              <p className="text-3xl font-black tracking-widest">{boatData.status === 'SAFE' ? t.status_safe : boatData.status === 'WARNING' ? t.status_warning : t.status_danger}</p>
              <p className="text-sm opacity-80 mt-1">{t.status}</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-ocean-light pb-2">
                <span className="text-gray-400 flex items-center gap-2"><Navigation className="w-4 h-4"/> {t.speed}</span>
                <span className="font-mono text-lg">{boatData.speed ? boatData.speed.toFixed(1) : 0} km/h</span>
              </div>
              <div className="flex justify-between items-center border-b border-ocean-light pb-2">
                <span className="text-gray-400 flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${inactivity ? 'text-danger animate-pulse' : ''}`}/> 
                  {t.last_sync}
                </span>
                <span className={`font-mono text-sm ${inactivity ? 'text-danger font-bold' : ''}`}>
                  {boatData.lastUpdate || 'Waiting...'}
                  {inactivity && <span className="block text-[8px] uppercase">INACTIVE 10M+</span>}
                </span>
              </div>
            </div>

            {/* Messaging Input */}
            <div className="mt-6 pt-6 border-t border-ocean-light">
              <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2 block flex items-center gap-2">
                <MessageSquare className="w-3 h-3" /> {t.message_to_boat}
              </label>
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t.type_message}
                  className="flex-1 bg-ocean-dark border border-ocean-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button 
                  onClick={sendMessage}
                  className="bg-blue-600 hover:bg-blue-500 p-2 rounded-lg transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Messages from Captain */}
              <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1 block">
                  {t.from_captain}
                </label>
                {receivedMessages.length === 0 ? (
                  <p className="text-xs text-gray-600 italic">{t.no_messages}</p>
                ) : (
                  receivedMessages.map((m, idx) => (
                    <div key={idx} className="bg-ocean-dark/40 border border-blue-500/10 p-2 rounded text-xs">
                      <div className="flex justify-between items-center mb-1 opacity-60">
                        <span className="font-black text-[8px] uppercase">{t.captain_label}</span>
                        <span className="text-[8px]">{new Date(m.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-gray-300">{m.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Background Accent */}
            <div className="absolute -right-10 -bottom-10 opacity-5">
              <Users className="w-64 h-64" />
            </div>
          </div>

          {/* Recent Alerts Card */}
          <div className="bg-ocean-mid p-6 rounded-xl border border-ocean-light shadow-xl flex-1 flex flex-col glass-panel">
            <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {t.system_alerts}
            </h2>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {alerts.length === 0 ? (
                <div className="text-gray-500 text-center text-sm py-10 italic">
                  {t.no_alerts_all_clear}
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className={`p-3 rounded-lg border-l-2 bg-ocean-dark shadow-md ${alert.type === 'danger' ? 'border-danger' : 'border-warn'}`}>
                    <span className={`text-xs block mb-1 font-mono ${alert.type === 'danger' ? 'text-danger' : 'text-warn'}`}>
                      {alert.time}
                    </span>
                    <p className="text-sm">{alert.msg}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Map Panel */}
        <div className="w-full lg:w-2/3 flex-1 min-h-[40vh] rounded-xl overflow-hidden border border-ocean-light relative shadow-2xl z-0 tracking-map order-1 lg:order-2">

          <MapContainer 
            center={[boatData.lat, boatData.lng]} 
            zoom={13} 
            className="w-full h-full"
            zoomControl={true}
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            />
            
            {/* Trip History Track */}
            {tripHistory.length > 1 && (
              <Polyline 
                positions={tripHistory} 
                pathOptions={{ 
                  color: '#60a5fa', 
                  weight: 3, 
                  opacity: 0.6,
                  dashArray: "5, 10" 
                }} 
              />
            )}
            {/* Safe Zone Region */}
            <Polygon 
              positions={SAFE_ZONE_POLYGON} 
              pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.1, weight: 3, dashArray: "10, 10" }} 
            />
            
            {/* Coral Reef Zone */}
            <Polygon 
              positions={CORAL_REEF_ZONE} 
              pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.2, weight: 2 }} 
            />

            {/* Sri Lanka Waters */}
            <Polygon 
              positions={SRI_LANKA_WATERS} 
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.2, weight: 0 }} 
            />

            {/* Actual IMBL Border Line */}
            <Polyline 
              positions={IMBL_LINE} 
              pathOptions={{ color: '#ef4444', weight: 4, dashArray: "15, 10" }} 
            />
            
            {/* Live Boat Marker */}
            <Marker position={[boatData.lat, boatData.lng]} icon={boatIcon} />
            <MapUpdater center={[boatData.lat, boatData.lng]} />
          </MapContainer>
          
          <div className="absolute bottom-4 right-4 bg-ocean-dark/80 backdrop-blur-md px-4 py-2 rounded text-xs border border-ocean-light z-[400]">
            Lat: {boatData.lat?.toFixed(4)} | Lng: {boatData.lng?.toFixed(4)}
          </div>
        </div>

      </div>
    </div>
  );
}
