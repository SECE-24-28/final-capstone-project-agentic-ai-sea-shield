import React, { useState, useEffect } from 'react';
import { Shield, Home, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { translations } from '../translations';
import { SOCKET_URL, API_URL } from '../config';

const socket = io(SOCKET_URL);

export default function AlertSystem() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const backPath = user.role === 'admin' ? '/admin' : '/home';
  const lang = localStorage.getItem('preferredLanguage') || user.language || 'en';
  const t = translations[lang] || translations.en;

  useEffect(() => {
    // Initial fetch of historical alerts
    fetch(`${API_URL}/api/admin/alerts`)
      .then(res => res.json())
      .then(data => { if (data.success) setAlerts(data.data); })
      .catch(console.error);

    // Listen to real-time alerts
    socket.on('system_alert', (data) => {
      setAlerts(prev => [data, ...prev].slice(0, 100));
    });
    
    socket.on('emergency_sos', (data) => {
      setAlerts(prev => [data, ...prev].slice(0, 100));
    });

    return () => {
      socket.off('system_alert');
      socket.off('emergency_sos');
    };
  }, []);

  const getAlertIcon = (type) => {
    if (type === 'SOS') return <AlertTriangle className="text-red-500 w-6 h-6 animate-pulse" />;
    if (type === 'BORDER_WARNING') return <AlertCircle className="text-orange-400 w-6 h-6" />;
    return <Info className="text-blue-400 w-6 h-6" />;
  };

  const getAlertColors = (type) => {
    if (type === 'SOS') return 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20';
    if (type === 'BORDER_WARNING') return 'border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/20';
    return 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10';
  };

  return (
    <div className="min-h-screen bg-ocean-dark text-white flex flex-col font-sans relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <header className="min-h-[5rem] sm:h-20 bg-ocean-mid border-b border-ocean-light flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 sm:py-0 shadow-2xl z-20 glass-panel gap-4">
        <button onClick={() => navigate(backPath)} className="flex items-center gap-2 sm:gap-4 hover:opacity-80 transition-opacity cursor-pointer">
          <div className="bg-amber-500/20 p-2 rounded-lg border border-amber-500/30">
            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400" />
          </div>
          <h1 className="text-xl sm:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
            {t.warning_terminal.toUpperCase()}
          </h1>
        </button>
        <button 
          onClick={() => navigate(backPath)}
          className="px-4 py-1.5 sm:px-6 sm:py-2 bg-ocean-light hover:bg-gray-600 rounded-lg font-bold transition flex items-center gap-2 sm:gap-3 text-xs sm:text-base border border-ocean-light"
        >
          <Home className="w-4 h-4 sm:w-5 sm:h-5" /> {t.back_to_command}
        </button>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-8 z-10 overflow-y-auto custom-scrollbar">
        <h2 className="text-gray-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] font-bold mb-6 sm:mb-8 flex items-center gap-2 sm:gap-4 text-[10px] sm:text-sm mt-2 sm:mt-4">
          <span className="w-6 sm:w-8 h-[1px] bg-gray-600 block"></span>
          {t.incident_log}
          <span className="flex-1 h-[1px] bg-gray-600 block"></span>
        </h2>

        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center p-8 sm:p-12 glass-panel rounded-2xl border border-ocean-light">
              <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-lg sm:text-xl text-gray-400 font-bold">{t.scanning_secure}</p>
              <p className="text-xs sm:text-gray-500 mt-2">{t.no_danger_logs}</p>
            </div>
          ) : (
            alerts.map((alert, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center p-4 sm:p-6 rounded-2xl border glass-panel transition-all transform hover:-translate-y-1 shadow-lg ${getAlertColors(alert.type)}`}
              >
                <div className="shrink-0">
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 w-full">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 sm:mb-1 gap-1">
                    <h3 className={`font-bold text-base sm:text-lg tracking-wide ${alert.type === 'SOS' ? 'text-red-400 font-black' : alert.type === 'BORDER_WARNING' ? 'text-orange-300' : 'text-blue-300'}`}>
                      {alert.type.replace('_', ' ')}
                    </h3>
                    <span className="text-[10px] sm:text-sm font-mono text-gray-400 tracking-wider">
                      {new Date(alert.timestamp || Date.now()).toLocaleTimeString()} - {new Date(alert.timestamp || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm sm:text-gray-200 leading-relaxed font-medium">
                    {alert.message}
                  </p>
                  {alert.location && (
                    <p className="text-[10px] sm:text-xs text-gray-500 font-mono mt-3 uppercase tracking-wider">
                      COORDINATES: LAT {alert.location.lat.toFixed(4)} • LNG {alert.location.lng.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

