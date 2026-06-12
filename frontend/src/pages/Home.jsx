import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Navigation, Users, AlertTriangle, PhoneCall, Shield } from 'lucide-react';
import { translations } from '../translations';

export default function Home() {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('user')) || {};
  const isFamily = userData.role === 'family';
  const lang = localStorage.getItem('preferredLanguage') || userData.language || 'en';
  const t = translations[lang] || translations.en;

  return (
    <div className="min-h-screen bg-ocean-dark text-white flex flex-col items-center custom-scrollbar">
      {/* Top Header */}
      <header className="w-full min-h-[5rem] sm:h-24 border-b border-ocean-light bg-ocean-mid flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 sm:py-0 shadow-2xl relative z-20 gap-4">
        <div className="flex items-center gap-3 px-3 py-1 rounded bg-ocean-dark border border-ocean-light order-2 sm:order-1">
          <div className={`w-2 h-2 rounded-full ${isFamily ? 'bg-blue-400' : 'bg-emerald-400'} animate-pulse`}></div>
          <span className="text-[10px] sm:text-xs text-gray-400 uppercase font-bold tracking-widest leading-none">
            {isFamily ? t.family : t.fisherman}
          </span>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4 order-1 sm:order-2 text-center">
          <div className="bg-blue-500/20 p-2 sm:p-3 rounded-full border border-blue-500/30 inline-block sm:block">
            <Shield className="w-6 h-6 sm:w-10 sm:h-10 text-blue-400" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 inline-block sm:block ml-2 sm:ml-0">
            SEASHIELD AI
          </h1>
        </div>
        
        <button 
          onClick={() => { localStorage.removeItem('user'); navigate('/'); }}
          className="text-gray-400 hover:text-white font-bold transition-colors text-[10px] sm:text-sm tracking-tighter order-3 px-4 py-2 sm:p-0 rounded-lg bg-white/5 sm:bg-transparent"
        >
          {t.logout.toUpperCase()}
        </button>
      </header>


      {/* Main Content Layout */}
      <main className="flex-1 w-full max-w-6xl p-4 sm:p-8 flex flex-col items-center justify-center">
        <h2 className="text-gray-400 text-center uppercase tracking-[0.2em] sm:tracking-[0.4em] font-bold mb-8 sm:mb-12 flex items-center gap-2 sm:gap-4 text-xs sm:text-base">
          <span className="w-8 sm:w-12 h-[1px] bg-gray-600 block"></span>
          {isFamily ? t.family_hub : (t.fisherman.split(' /')[0].toUpperCase() + " TERMINAL")}
          <span className="w-8 sm:w-12 h-[1px] bg-gray-600 block"></span>
        </h2>

        {/* Dashboard Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 w-full">
          
          {/* Maritime Map - Everyone */}
          <button 
            onClick={() => navigate('/map')} 
            className="bg-ocean-mid border border-ocean-light hover:border-blue-400 p-6 sm:p-8 rounded-2xl flex flex-col items-center justify-center gap-4 sm:gap-5 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] group cursor-pointer relative overflow-hidden text-center"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="bg-ocean-dark p-3 sm:p-4 rounded-full group-hover:bg-blue-500/20 transition-colors">
              <Map className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold tracking-wider">{t.maritime_map}</h3>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{t.maritime_map_desc}</p>
          </button>


          {/* GPS Tracking - Fisherman Only */}
          {!isFamily && (
            <button 
              onClick={() => navigate('/tracking')} 
              className="bg-ocean-mid border border-ocean-light hover:border-emerald-400 p-8 rounded-2xl flex flex-col items-center justify-center gap-5 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] group cursor-pointer relative overflow-hidden text-center"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="bg-ocean-dark p-4 rounded-full group-hover:bg-emerald-500/20 transition-colors">
                <Navigation className="w-12 h-12 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold tracking-wider">{t.gps_tracking}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{t.gps_tracking_desc}</p>
            </button>
          )}

          {/* Family Hub - Family Only */}
          {isFamily && (
            <button 
              onClick={() => navigate('/family')} 
              className="bg-ocean-mid border border-ocean-light hover:border-purple-400 p-8 rounded-2xl flex flex-col items-center justify-center gap-5 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] group cursor-pointer relative overflow-hidden text-center"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="bg-ocean-dark p-4 rounded-full group-hover:bg-purple-500/20 transition-colors">
                <Users className="w-12 h-12 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold tracking-wider">{t.family_hub}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{t.family_hub_desc}</p>
            </button>
          )}

          {/* Alert Logs - Everyone */}
          <button 
            onClick={() => navigate('/alerts')} 
            className="bg-ocean-mid border border-ocean-light hover:border-amber-400 p-8 rounded-2xl flex flex-col items-center justify-center gap-5 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] group cursor-pointer relative overflow-hidden text-center"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="bg-ocean-dark p-4 rounded-full group-hover:bg-amber-500/20 transition-colors">
              <AlertTriangle className="w-12 h-12 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-xl font-bold tracking-wider">{t.system_alerts}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{t.alerts_desc}</p>
          </button>

          {/* Emergency SOS - Fisherman Only */}
          {!isFamily && (
            <button 
              onClick={() => navigate('/sos')} 
              className="bg-ocean-mid border border-red-900/50 hover:bg-danger/10 hover:border-danger p-8 rounded-2xl flex flex-col items-center justify-center gap-5 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(239,68,68,0.4)] group cursor-pointer relative overflow-hidden text-center"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-danger"></div>
              <div className="bg-danger/20 p-4 rounded-full group-hover:bg-danger transition-colors">
                <PhoneCall className="w-12 h-12 text-danger animate-pulse group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold tracking-wider text-danger">{t.emergency_center}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{t.emergency_desc}</p>
            </button>
          )}

        </div>
      </main>
    </div>
  );
}
