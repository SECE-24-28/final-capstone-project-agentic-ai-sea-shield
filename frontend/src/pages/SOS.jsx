import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneCall, Shield, Home, AlertOctagon, Radio } from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { translations } from '../translations';
import { SOCKET_URL, API_URL } from '../config';

const socket = io(SOCKET_URL);

export default function SOS() {
  const navigate = useNavigate();
  const [triggered, setTriggered] = useState(false);
  const [showCoastGuardPopup, setShowCoastGuardPopup] = useState(false);
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const backPath = user.role === 'admin' ? '/admin' : '/home';
  const lang = localStorage.getItem('preferredLanguage') || user.language || 'en';
  const t = translations[lang] || translations.en;

  React.useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role === 'family') {
      toast.error(t.emergency_restricted || 'Emergency trigger restricted to Vessel Captain.');
      navigate('/home');
    }
  }, []);

  const handleSOS = () => {
    if (triggered) return;
    
    // 1. VIBRATE
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    setTriggered(true);

    // 2. BROADCAST SOS
    toast.success(t.sos_broadcast_toast || 'EMERGENCY DISTRESS SIGNAL BROADCASTED!', { 
      style: { background: '#ef4444', color: '#fff' },
      duration: 5000 
    });

    socket.emit('emergency_sos', {
      type: 'SOS',
      message: t.sos_default_msg || 'CRITICAL EMERGENCY: Manual distress signal triggered.',
      location: { lat: 9.15, lng: 79.15 },
      familyPhone: user.familyPhone
    });

    fetch(`${API_URL}/api/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        lat: 9.15, 
        lng: 79.15, 
        message: "Manual distress signal triggered.", 
        boatId: user.boatId 
      })
    }).catch(console.error);
  };

  const callCoastGuard = () => {
    window.location.href = "tel:7904146844";
    setShowCoastGuardPopup(false);
  };


  return (
    <div className="min-h-screen bg-ocean-dark text-white flex flex-col font-sans relative overflow-hidden">
      
      {/* Dynamic Red Pulse Background if Triggered */}
      {triggered && (
        <div className="absolute inset-0 bg-red-900/20 animate-pulse pointer-events-none z-0"></div>
      )}

      <header className="min-h-[5rem] sm:h-20 bg-ocean-mid border-b border-ocean-light flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 sm:py-0 shadow-2xl z-20 glass-panel gap-4">
        <button onClick={() => navigate(backPath)} className="flex items-center gap-2 sm:gap-4 hover:opacity-80 transition-opacity cursor-pointer">
          <div className="bg-red-500/20 p-2 rounded-lg border border-red-500/30">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
          </div>
          <h1 className="text-xl sm:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-400">
            {t.emergency_center.toUpperCase()}
          </h1>
        </button>
        <button 
          onClick={() => navigate(backPath)}
          className="px-4 py-1.5 sm:px-6 sm:py-2 bg-ocean-light hover:bg-gray-600 rounded-lg font-bold transition flex items-center gap-2 sm:gap-3 text-xs sm:text-base border border-ocean-light"
        >
          <Home className="w-4 h-4 sm:w-5 sm:h-5" /> {t.back_to_command}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 z-10 text-center">
        
        <div className="max-w-2xl w-full mb-8 sm:mb-12">
          <AlertOctagon className="w-16 h-16 sm:w-20 sm:h-20 text-red-500 mx-auto mb-4 sm:mb-6 animate-pulse" />
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-3 sm:mb-4 tracking-wider uppercase">{t.sos_danger_title}</h2>
          <p className="text-sm sm:text-xl text-gray-400 leading-relaxed max-w-[300px] sm:max-w-none mx-auto">
            {t.sos_danger_desc}
          </p>
        </div>

        <button 
          onClick={handleSOS}
          disabled={triggered}
          className={`relative group w-48 h-48 sm:w-64 sm:h-64 rounded-full flex flex-col items-center justify-center gap-3 sm:gap-4 transition-all duration-300 shadow-[0_0_60px_rgba(239,68,68,0.4)] border-4 border-red-900/50 outline-none
            ${triggered 
              ? 'bg-red-900/80 cursor-not-allowed scale-95 border-red-500 shadow-none' 
              : 'bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 hover:scale-105 hover:shadow-[0_0_120px_rgba(239,68,68,0.6)] cursor-pointer active:scale-95'}`}
        >
          {/* Inner Rings for styling */}
          <div className={`absolute inset-2 border-2 border-red-400/30 rounded-full ${triggered ? 'animate-ping' : ''}`}></div>
          <div className="absolute inset-4 sm:inset-6 border border-red-400/20 rounded-full"></div>

          <PhoneCall className={`w-12 h-12 sm:w-20 sm:h-20 text-white ${!triggered && 'group-hover:animate-bounce'}`} />
          <span className="text-2xl sm:text-3xl font-black tracking-widest">SOS</span>
          
          {triggered && (
            <div className="absolute -bottom-16 w-[250px] sm:w-[300px] text-center">
              <span className="text-red-400 text-xs sm:text-sm font-bold bg-ocean-dark px-4 py-2 border border-red-500/30 rounded-full flex items-center justify-center gap-2">
                <Radio className="w-3 h-3 sm:w-4 sm:h-4 animate-pulse" /> {t.signal_transmitted}
              </span>
            </div>
          )}
        </button>

        <button 
          onClick={() => setShowCoastGuardPopup(true)}
          className="mt-12 group flex items-center gap-4 px-8 py-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border-2 border-red-600/50 rounded-2xl font-black text-xl transition-all active:scale-95 animate-pulse"
        >
          <PhoneCall className="w-6 h-6 group-hover:animate-bounce" />
          🚨 CALL COAST GUARD
        </button>

      </main>

      {/* Coast Guard Confirmation Popup */}
      {showCoastGuardPopup && (
        <div className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-ocean-mid w-full max-w-sm rounded-3xl border-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)] overflow-hidden">
            <div className="p-8 text-center text-white">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
                <Shield className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">Coast Guard</h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Do you want to call <span className="text-white font-bold">Coast Guard Emergency</span>?
                <br/>
                <span className="text-base font-mono mt-4 block text-red-400 bg-red-500/10 py-2 rounded-lg border border-red-500/20">7904 146 844</span>
                <p className="text-[10px] mt-4 opacity-50 hidden lg:block italic">
                  (Desktop user: Please dial this number manually from your phone)
                </p>
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={callCoastGuard}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <PhoneCall className="w-6 h-6" />
                  CALL NOW
                </button>
                <button 
                  onClick={() => setShowCoastGuardPopup(false)}
                  className="w-full py-3 bg-ocean-light hover:bg-gray-600 text-gray-300 rounded-xl font-bold transition-all text-sm"
                >
                  CANCEL
                </button>
              </div>
            </div>
            <div className="bg-red-600/10 p-4 border-t border-red-500/20 text-center">
              <p className="text-[10px] text-red-400 font-bold tracking-widest uppercase">Official Emergency Channel</p>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
