import React from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, useMap } from 'react-leaflet';
import { Shield, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../translations';

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
  [9.60, 80.50]
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

export default function MaritimeMap() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const backPath = user.role === 'admin' ? '/admin' : '/home';
  const lang = localStorage.getItem('preferredLanguage') || user.language || 'en';
  const t = translations[lang] || translations.en;

  return (
    <div className="flex flex-col h-screen w-full bg-ocean-dark text-white relative overflow-hidden">
      <header className="min-h-[4rem] sm:h-16 bg-ocean-mid border-b border-ocean-light flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-2 sm:py-0 shadow-md z-30 gap-2">
        <button onClick={() => navigate(backPath)} className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
          <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
          <h1 className="text-base sm:text-xl font-bold tracking-wider">SeaShield {t.maritime_map}</h1>
        </button>
        <button 
          onClick={() => navigate(backPath)}
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-ocean-light hover:bg-gray-600 rounded text-[10px] sm:text-sm font-semibold transition flex items-center gap-2 border border-ocean-light"
        >
          <Home className="w-4 h-4" /> {t.back_to_dashboard}
        </button>
      </header>


      <div className="flex-1 w-full h-full relative z-0">
        <div className="absolute top-4 right-4 z-[400] glass-panel p-2 sm:p-4 rounded-lg shadow-lg max-w-[200px] sm:max-w-sm">
          <h2 className="text-[10px] sm:text-sm font-bold tracking-wider uppercase mb-2 sm:mb-3 border-b border-ocean-light pb-1 sm:pb-2">{t.map_legend}</h2>
          <ul className="space-y-2 sm:space-y-3">
            <li className="flex items-center gap-2 sm:gap-3">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#10b981] opacity-50 border border-[#10b981]"></div>
              <span className="text-[10px] sm:text-sm text-gray-300">{t.auth_fishing_zone}</span>
            </li>
            <li className="flex items-center gap-2 sm:gap-3">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#f59e0b] opacity-50 rounded-full border border-[#f59e0b]"></div>
              <span className="text-[10px] sm:text-sm text-gray-300">{t.caution_buffer_area}</span>
            </li>
            <li className="flex items-center gap-2 sm:gap-3">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#ef4444] opacity-50 rounded-full border border-[#ef4444]"></div>
              <span className="text-[10px] sm:text-sm text-gray-300">{t.high_risk_boundary}</span>
            </li>
          </ul>
        </div>


        <MapContainer center={[9.15, 79.15]} zoom={12} className="w-full h-full" zoomControl={true}>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
          
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
        </MapContainer>
      </div>
    </div>
  );
}
