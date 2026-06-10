import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Shield, Navigation, AlertTriangle, PhoneCall, Radio, Power, Mail, Send, WifiOff, Map as MapIcon, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Home, LocateFixed, Volume2, User as UserIcon, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../translations';
import { SOCKET_URL, API_URL } from '../config';

const socket = io(SOCKET_URL);

// Custom Boat Icon
const boatIcon = new L.Icon({
  iconUrl: '/boat.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  className: 'marker-boat'
});

// Demo Data
const START_POS = [9.15, 79.15];
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
  [9.60, 79.50] // Closed polygon
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
  [9.10, 79.12],
  [9.15, 79.05] // closed
];
// Map Updater Component
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(center, { animate: true });
  }, [center, map]);
  return null;
}

export default function FishermanDashboard() {
  const navigate = useNavigate();
  const [position, setPosition] = useState(START_POS);
  const userData = JSON.parse(localStorage.getItem('user')) || {};
  const lang = localStorage.getItem('preferredLanguage') || userData.language || 'en';
  const t = translations[lang] || translations.en;
  
  useEffect(() => {
    // Role check
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role === 'family') {
      toast.error('Access Denied: Restricted to Boat Captains.');
      navigate('/home');
      return;
    }
  }, []);
  const [isTracking, setIsTracking] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [showRiskZones, setShowRiskZones] = useState(true);
  const [status, setStatus] = useState('SAFE'); // SAFE, WARNING, DANGER
  const [distanceToBorder, setDistanceToBorder] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [speed, setSpeed] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [useRealGPS, setUseRealGPS] = useState(false);
  const [messages, setMessages] = useState([]);
  const [guidance, setGuidance] = useState("");
  const [showMessages, setShowMessages] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editedPhone, setEditedPhone] = useState(userData.familyPhone || "");
  const [replyText, setReplyText] = useState("");
  const [showCoastGuardPopup, setShowCoastGuardPopup] = useState(false);

  const callCoastGuard = () => {
    // Immediate dialer trigger
    window.location.href = "tel:7904146844";
    setShowCoastGuardPopup(false);
  };

  const handleSendMessage = () => {
    if (!replyText.trim()) return;
    
    const msgData = {
      senderId: userData.boatId || 'BOAT_DEMO',
      receiverId: 'FAMILY_' + (userData.boatId || 'DEMO'),
      content: replyText,
      timestamp: new Date()
    };

    socket.emit('new_message', msgData);

    fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msgData)
    }).then(() => {
      toast.success("Message sent to Family");
      setReplyText("");
      // Add to local messages list for visual feedback
      setMessages(prev => [msgData, ...prev]);
    }).catch(err => toast.error("Failed to send message"));
  };

  const playBuzzer = (type = 'warning') => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'danger') {
        oscillator.type = 'square'; // Extremely loud/aggressive wave
        oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); 
        oscillator.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 1.0);
      } else {
        oscillator.type = 'sawtooth'; // Clearer warning wave
        oscillator.frequency.setValueAtTime(660, audioCtx.currentTime);
      }

      gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime); // Loudness increased to 80%
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
      console.error("Audio buzzer failed:", e);
    }
  };

  const speak = (text) => {
    if (!window.speechSynthesis || !text) return;
    
    // 1. Cancel ongoing speech to clear queue
    window.speechSynthesis.cancel();

    // 2. Wrap in a slight delay to ensure 'cancel' process is complete
    // Many mobile browsers (Android Chrome/Safari) get "stuck" without this.
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      const langMap = { 
        'ta': 'ta-IN', 
        'ml': 'ml-IN', 
        'te': 'te-IN', 
        'kn': 'kn-IN', 
        'si': 'si-LK', 
        'hi': 'hi-IN',
        'mr': 'mr-IN',
        'gu': 'gu-IN',
        'bn': 'bn-IN',
        'or': 'or-IN',
        'en': 'en-US' 
      };
      const baseCode = langMap[lang] || 'en-US';
      
      const voices = window.speechSynthesis.getVoices();
      
      // Attempt to find a voice matching the specific locale or just the language prefix
      // Some browsers use ml_IN (underscore), some use ml-IN (dash)
      let voice = voices.find(v => v.lang.replace('_', '-') === baseCode) ||
                  voices.find(v => v.lang.startsWith(lang)) ||
                  voices.find(v => v.name.toLowerCase().includes('google') && v.lang.startsWith(lang));

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = baseCode;
      }

      utterance.rate = 0.92; // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onerror = (e) => {
        console.error("[Voice System Error]", e);
        if (e.error === 'not-allowed') {
          toast("Voice blocked. Tap map to enable.", { icon: '🔊' });
        }
      };

      console.log(`[Voice Test] Attempting to speak in ${lang} (${utterance.lang})`);
      window.speechSynthesis.speak(utterance);
    }, 150);
  };

  const testVoice = () => {
    console.log("[Voice Debug] testVoice triggered. Current lang:", lang);
    const availableVoices = window.speechSynthesis.getVoices();
    
    // Help user identify missing voice packs
    console.log("--- VOICE DIAGNOSTICS ---");
    console.log("Total voices found:", availableVoices.length);
    const regional = availableVoices.filter(v => ['ta','ml','te','kn','si','hi'].some(code => v.lang.includes(code)));
    if (regional.length > 0) {
      console.log("Regional voices detected:");
      regional.forEach(v => console.log(` >> ${v.name} (${v.lang})`));
    } else {
      console.warn("NO REGIONAL VOICE PACKS DETECTED. Using system default.");
    }
    console.log("--------------------------");

    if (availableVoices.length === 0) {
      toast.error("Voice engine still initializing. Please wait a second.");
      return;
    }
    const welcomeMap = {
      en: "SeaShield Voice Alert system is active.",
      ta: "கடல் கவசம் குரல் எச்சரிக்கை முறை சுறுசுறுப்பாக உள்ளது",
      si: "මුහුදු කவசம் හඬ අනතුරු ඇඟවීමේ ಪද්ධතිය දැන් ಸක්‍ರೀಯයි",
      ml: "സീ ഷീൽഡ് വോയിസ് അലേർട്ട് സിസ്റ്റം ഇപ്പോൾ സജീവമാണ്",
      te: "సీ షీల్డ్ వాయిస్ అలర్ట్ సిస్టమ్ ఇప్పుడు యాక్టివ్‌గా ఉంది",
      kn: "ಸೀ ಶೀಲ್ಡ್ ವಾಯ್ಸ್ ಅಲರ್ಟ್ ಸಿಸ್ಟಮ್ ಈಗ ಸಕ್ರಿಯವಾಗಿದೆ",
      hi: "सी शील्ड वॉयस अलर्ट सिस्टम अब सक्रिय है",
      mr: "सी शील्ड व्हॉइस अलर्ट सिस्टम आता सक्रिय आहे",
      gu: "સી સીલ્ડ વોઇસ એલર્ટ સિસ્ટમ હવે સક્રિય છે",
      bn: "সি শিল্ড ভয়েস অ্যালার্ট সিস্টেম এখন সক্রিয়",
      or: "ସି ଶିଲ୍ଡ ଭଏସ୍ ଆଲର୍ଟ ସିଷ୍ଟମ୍ ବର୍ତ୍ତମାନ ସକ୍ରିୟ ଅଛି"
    };
    const welcome = welcomeMap[lang] || welcomeMap.en;
    speak(welcome);
    toast.success('Voice alerts synchronized!', { icon: '📢' });
  };

  useEffect(() => {
    // Pre-load voices
    window.speechSynthesis.getVoices();
    const handleVoicesChanged = () => {
      window.speechSynthesis.getVoices();
      console.log("Voice systems initialized");
    };
    window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
    
    // Unlock speech synthesis on first user interaction
    const unlockSpeech = () => {
      const silent = new SpeechSynthesisUtterance("");
      silent.volume = 0;
      window.speechSynthesis.speak(silent);
      window.removeEventListener('click', unlockSpeech);
      console.log("Voice synth unlocked.");
    };
    window.addEventListener('click', unlockSpeech);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Continuous Safety Buzzer Loop (for regional languages)
  useEffect(() => {
    let interval;
    if (status !== 'SAFE' && lang !== 'en') {
      const isDanger = status === 'DANGER';
      console.log(`[SeaShield AI] Continuous alarm active for ${status} mode.`);
      
      // Immediate first beep
      playBuzzer(isDanger ? 'danger' : 'warning');
      
      // Repeat every 2 seconds until status changes back to SAFE
      interval = setInterval(() => {
        playBuzzer(isDanger ? 'danger' : 'warning');
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [status, lang]);

  useEffect(() => {
    const boatId = userData.boatId || 'BOAT_DEMO';
    if (true) { 
      fetch(`${API_URL}/api/messages/${boatId}`)
        .then(res => res.json())
        .then(data => { if (data.success) setMessages(data.data); });
    }

    socket.on('new_message', (msg) => {
      console.log("New Message Received via Socket:", msg);
      if (msg.receiverId === boatId) {
        setMessages(prev => [msg, ...prev]);
        const isControl = msg.senderId === 'ADMIN-COMMAND';
        toast.success(isControl ? "URGENT: Message from Control Center!" : "New message from Family!", {
          icon: isControl ? '🛰️' : '💬',
          duration: 6000
        });
      }
    });
    return () => socket.off('new_message');
  }, []);

  useEffect(() => {
    let watchId;
    if (useRealGPS && navigator.geolocation) {
      setIsTracking(false);
      setManualMode(false);
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPos);
          setSpeed(pos.coords.speed * 3.6 || 0);
          localStorage.setItem('lastKnownPosition', JSON.stringify(newPos));
        },
        () => {
          toast.error("Real GPS failed. Ensure location permissions are enabled and try again.");
          setUseRealGPS(false);
        },
        { enableHighAccuracy: true }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [useRealGPS]);

  const trackingRef = useRef(null);
  const lastAlertedStatusRef = useRef('SAFE');

  // Load last position if offline
  useEffect(() => {
    const saved = localStorage.getItem('lastKnownPosition');
    if (saved) setPosition(JSON.parse(saved));
  }, []);

  // Tracking loop
  useEffect(() => {
    if (isTracking) {
      console.log("Auto-Tracking STARTED");
      trackingRef.current = setInterval(() => {
        setPosition(prev => {
          // Move North-East towards boundary
          const newPos = [prev[0] + 0.008, prev[1] + 0.003];
          setSpeed(15 + Math.random() * 5); 
          localStorage.setItem('lastKnownPosition', JSON.stringify(newPos));
          return newPos;
        });
      }, 2000); // Faster updates
    } else {
      console.log("Auto-Tracking STOPPED");
      clearInterval(trackingRef.current);
      setSpeed(0);
    }
    return () => clearInterval(trackingRef.current);
  }, [isTracking]);

  // Geofencing and Border Detection
  useEffect(() => {
    if (!position) return;
    
    const pt = turf.point([position[1], position[0]]); // Turf uses [lng, lat]
    
    // Polygons
    const safeZone = turf.polygon([[...SAFE_ZONE_POLYGON.map(b => [b[1], b[0]])]]);
    const reefZone = turf.polygon([[...CORAL_REEF_ZONE.map(b => [b[1], b[0]])]]);
    const sriLankaZone = turf.polygon([[...SRI_LANKA_WATERS.map(b => [b[1], b[0]])]]);
    
    const line = turf.polygonToLine(safeZone);
    const isInsideSafe = turf.booleanPointInPolygon(pt, safeZone);
    const isInsideReef = turf.booleanPointInPolygon(pt, reefZone);
    const isInsideSriLanka = turf.booleanPointInPolygon(pt, sriLankaZone);
    
    const distanceKm = turf.pointToLineDistance(pt, line, { units: 'kilometers' });
    const distanceMeters = Math.round(distanceKm * 1000);
    
    setDistanceToBorder(distanceMeters);

    if (!isInsideSafe) {
      const nearest = turf.nearestPointOnLine(line, pt);
      const bearing = turf.bearing(pt, nearest);
      let dir = "North";
      if (bearing > 45 && bearing <= 135) dir = "East";
      else if (bearing > 135 || bearing <= -135) dir = "South";
      else if (bearing > -135 && bearing <= -45) dir = "West";
      setGuidance(`Head ${dir} to return to Safe Zone`);
    } else {
      setGuidance("");
    }

    let newStatus = 'SAFE';
    if (isInsideSriLanka) {
      newStatus = 'DANGER_SRI_LANKA';
    } else if (isInsideReef) {
      newStatus = 'WARNING_REEF';
    } else if (!isInsideSafe) {
      newStatus = 'DANGER';
    } else if (distanceMeters < 1500) {
      newStatus = 'WARNING';
    }
    
    setStatus(newStatus.split('_')[0]); // UI display base status
    
    // Voice Warning & Event Logic
    if (newStatus !== lastAlertedStatusRef.current) {
      if (newStatus === 'WARNING') {
        speak(t.voice_warning_approaching_boundary);
        addAlert(t.alert_approaching_boundary.replace('{distance}', distanceMeters));
        socket.emit('system_alert', { boatId: userData.boatId, type: 'BORDER_WARNING', message: `Boat is ${distanceMeters}m from border.`, lat: position[0], lng: position[1] });
      } else if (newStatus === 'WARNING_REEF') {
        speak(t.voice_warning_coral_reef);
        addAlert(t.alert_coral_reef);
        socket.emit('system_alert', { boatId: userData.boatId, type: 'BORDER_WARNING', message: `Boat entered protected Coral Reef.`, lat: position[0], lng: position[1] });
      } else if (newStatus === 'DANGER_SRI_LANKA') {
        speak(t.voice_danger_sri_lanka);
        addAlert(t.alert_danger_sri_lanka);
        socket.emit('system_alert', { boatId: userData.boatId, type: 'SOS', message: `CRITICAL: Boat crossed into Sri Lankan Waters!`, lat: position[0], lng: position[1] });
      } else if (newStatus === 'DANGER') {
        speak(t.voice_danger_left_zone);
        addAlert(t.alert_danger_left_zone);
        socket.emit('system_alert', { boatId: userData.boatId, type: 'BORDER_WARNING', message: `Boat has left authorized zone.`, lat: position[0], lng: position[1] });
      } else if (newStatus === 'SAFE') {
        addAlert(t.alert_returned_safe_zone);
        socket.emit('system_alert', { boatId: userData.boatId, type: 'INFO', message: `Boat returned to safe zone.`, lat: position[0], lng: position[1] });
      }
      lastAlertedStatusRef.current = newStatus;
    }

    // Send location update
    socket.emit('location_update', {
      boatId: userData.boatId || 'BOAT_DEMO',
      lat: position[0],
      lng: position[1],
      speed,
      status: newStatus
    });
    
    // Post to backend API
    fetch(`${API_URL}/api/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boatId: userData.boatId || 'BOAT_DEMO', lat: position[0], lng: position[1], speed, status: newStatus })
    }).catch(err => console.error("Offline or Error saving location", err));

  }, [position, speed, lang, t]);

  const addAlert = (msg) => {
    setAlerts(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 10));
    toast.error(msg, {
      style: { background: '#ef4444', color: '#fff' }
    });
  };

  const triggerSOS = () => {
    // 1. VIBRATE as physical feedback
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    // 2. Broadcast SOS to Family & Admin via Socket and API
    toast.success(t.sos_sent_success, { 
      style: { background: '#10b981', color: '#fff' },
      duration: 4000
    });
    
    addAlert(t.alert_sos_broadcasted);
    
    socket.emit('emergency_sos', {
      boatId: userData.boatId,
      type: 'SOS',
      message: 'Emergency signal received from fisherman boat.',
      location: { lat: position[0], lng: position[1] },
      familyPhone: userData.familyPhone
    });

    fetch(`${API_URL}/api/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        boatId: userData.boatId, 
        lat: position[0], 
        lng: position[1], 
        message: "Emergency signal received from fisherman boat." 
      })
    }).catch(err => console.error("SOS API failure", err));

    // 3. TRIGGER PHONE CALL to registered Family/Emergency number
    if (userData.familyPhone) {
      const cleanNumber = userData.familyPhone.replace(/[^0-9+]/g, '');
      setTimeout(() => {
        window.location.href = `tel:${cleanNumber}`;
      }, 1500);
    }
  };

  const handleUpdateProfile = () => {
    setIsUpdating(true);
    fetch(`${API_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: userData.id,
        familyPhone: editedPhone
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const updatedUser = { ...userData, familyPhone: editedPhone };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast.success("Profile updated successfully!");
        setIsEditing(false);
      } else {
        toast.error("Failed to update profile");
      }
    })
    .catch(err => toast.error("Update failed: " + err.message))
    .finally(() => setIsUpdating(false));
  };


  const moveManual = (direction) => {
    if (!manualMode) return;
    setPosition(prev => {
      let newPos = [...prev];
      const step = 0.005; // Step size approx 500m
      if (direction === 'UP') newPos[0] += step;
      if (direction === 'DOWN') newPos[0] -= step;
      if (direction === 'LEFT') newPos[1] -= step;
      if (direction === 'RIGHT') newPos[1] += step;
      
      setSpeed(8 + Math.random() * 2); // Simulated manual speed
      localStorage.setItem('lastKnownPosition', JSON.stringify(newPos));
      return newPos;
    });
  };

  const getStatusColor = () => {
    if (status === 'SAFE') return 'text-safe';
    if (status === 'WARNING') return 'text-warn';
    return 'text-danger pulse-animation';
  };

  return (
    <div className="flex flex-col h-screen w-full bg-ocean-dark text-white relative overflow-hidden">
      
      {/* Top Navigation */}
      <header className="min-h-[4rem] lg:h-16 bg-ocean-mid border-b border-ocean-light flex flex-wrap lg:flex-nowrap items-center justify-between px-4 lg:px-6 shadow-md z-30 glass-panel gap-2 py-2 lg:py-0">
        <button onClick={() => navigate('/home')} className="flex items-center gap-2 lg:gap-3 hover:opacity-80 transition-opacity cursor-pointer">
          <Shield className="w-6 h-6 lg:w-8 lg:h-8 text-blue-400" />
          <h1 className="text-base lg:text-xl font-bold tracking-wider">SeaShield</h1>
        </button>

        <div className="flex items-center gap-2 lg:gap-6 text-[10px] lg:text-sm font-semibold flex-wrap justify-end">
          {isOffline && (
            <div className="flex items-center gap-1 lg:gap-2 text-danger animate-pulse border border-danger/30 px-2 lg:px-3 py-0.5 lg:py-1 rounded bg-danger/10">
              <WifiOff className="w-3 h-3 lg:w-4 lg:h-4" />
              <span className="uppercase font-black hidden sm:inline">{t.offline_mode}</span>
            </div>
          )}

          <div className="flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-0.5 lg:py-1 rounded bg-ocean-dark border border-ocean-light">
            <AlertTriangle className={`w-4 h-4 lg:w-5 lg:h-5 ${getStatusColor()}`} />
            <span className={getStatusColor()}>{status === 'SAFE' ? t.status_safe : status === 'WARNING' ? t.status_warning : t.status_danger}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded bg-ocean-dark border border-ocean-light relative">
            <Navigation className="w-4 h-4 lg:w-5 lg:h-5 text-gray-300" />
            <span>{speed.toFixed(1)} km/h</span>
            <button 
              onClick={testVoice}
              className="ml-2 p-1 bg-blue-500/20 hover:bg-blue-500/40 rounded border border-blue-500/30 text-blue-400 transition-all flex items-center justify-center"
              title="Sync Voice"
            >
              <Volume2 className="w-3 h-3" />
            </button>
          </div>

          <div className="hidden lg:flex flex-col items-center px-4 py-1 border-x border-ocean-light">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">{userData.name || 'Captain'}</span>
            <span className="text-xs text-blue-400 font-black font-mono">{userData.boatId || 'BOAT_DEMO'}</span>
          </div>

          <button 
            onClick={() => {
              setEditedPhone(userData.familyPhone || "");
              setIsEditing(false);
              setShowProfile(true);
            }}
            className="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-0.5 lg:py-1 rounded bg-ocean-dark border border-ocean-light hover:bg-gray-700 transition-colors"
          >
            <UserIcon className="w-4 h-4 text-blue-400" />
            <span className="uppercase font-black hidden lg:inline">{t.profile}</span>
          </button>

          <button 
            onClick={() => setShowMessages(true)}
            className="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-0.5 lg:py-1 rounded bg-ocean-dark border border-ocean-light hover:bg-gray-700 transition-colors relative"
          >
            <Mail className="w-4 h-4 text-gray-300" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 lg:w-4 lg:h-4 bg-blue-500 text-[8px] lg:text-[10px] rounded-full flex items-center justify-center border border-ocean-mid">
                {messages.length}
              </span>
            )}
            <span className="uppercase font-black hidden lg:inline">{t.inbox}</span>
          </button>

          <button 
            onClick={() => { localStorage.removeItem('user'); navigate('/'); }}
            className="text-gray-400 hover:text-white font-bold transition-colors px-2 py-1 text-[10px] lg:text-xs tracking-tighter"
          >
            {t.logout}
          </button>
        </div>
      </header>


      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Full Screen Map */}
        <div className="w-full lg:w-3/4 flex-1 h-full relative z-0">
          {/* Guidance Overlay */}
          {guidance && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-danger/90 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-full text-xs lg:text-base font-black tracking-widest flex items-center gap-2 lg:gap-3 animate-bounce shadow-2xl border-2 border-white/20 text-center">
              <Navigation className="w-5 h-5 lg:w-6 lg:h-6 rotate-180" />
              {guidance.toUpperCase()}
            </div>
          )}


          <MapContainer center={START_POS} zoom={12} className="w-full h-full" zoomControl={false}>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            />
            
            {/* Safe Zone Region */}
            <Polygon 
              positions={SAFE_ZONE_POLYGON} 
              pathOptions={{
                color: '#10b981', 
                fillColor: '#10b981',
                fillOpacity: 0.1,
                weight: 3,
                dashArray: "10, 10"
              }} 
            />
            
            {/* Real World Boundaries via Show Risk Zones Toggle */}
            {showRiskZones && (
              <>
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
              </>
            )}
            {/* Boat Marker */}
            <Marker position={position} icon={boatIcon} />
            
            <MapUpdater center={position} />
          </MapContainer>

          {/* Manual Control Overlay (D-Pad) */}
          {manualMode && (
            <div className="absolute bottom-8 left-8 z-[500] flex flex-col items-center justify-center p-4 glass-panel rounded-full shadow-2xl">
              <button 
                className="w-12 h-12 bg-ocean-light hover:bg-gray-500 rounded-lg flex items-center justify-center mb-1 transition-all active:scale-95 text-white shadow"
                onClick={() => moveManual('UP')} title={t.north}>
                ▲
              </button>
              <div className="flex gap-1 mb-1">
                <button 
                  className="w-12 h-12 bg-ocean-light hover:bg-gray-500 rounded-lg flex items-center justify-center transition-all active:scale-95 text-white shadow"
                  onClick={() => moveManual('LEFT')} title={t.west}>
                  ◀
                </button>
                <div className="w-12 h-12 flex items-center justify-center font-bold text-gray-400 text-xs">
                  {t.drive.toUpperCase()}
                </div>
                <button 
                  className="w-12 h-12 bg-ocean-light hover:bg-gray-500 rounded-lg flex items-center justify-center transition-all active:scale-95 text-white shadow"
                  onClick={() => moveManual('RIGHT')} title={t.east}>
                  ▶
                </button>
              </div>
              <button 
                className="w-12 h-12 bg-ocean-light hover:bg-gray-500 rounded-lg flex items-center justify-center transition-all active:scale-95 text-white shadow"
                onClick={() => moveManual('DOWN')} title={t.south}>
                ▼
              </button>
            </div>
          )}
          
          {/* Overlay Stats */}
          <div className="absolute top-4 left-4 z-[400] glass-panel p-2 lg:p-4 rounded-lg shadow-lg">
            <h3 className="text-gray-400 text-[8px] lg:text-xs mb-1 uppercase tracking-wider">{t.distance_to_border}</h3>
            <p className={`text-xl lg:text-3xl font-bold ${distanceToBorder < 500 ? 'text-danger' : distanceToBorder < 1500 ? 'text-warn' : 'text-safe'}`}>
              {distanceToBorder ? `${(distanceToBorder / 1000).toFixed(2)} km` : '--'}
            </p>
            <p className="text-[8px] lg:text-xs text-gray-400 mt-1 lg:mt-2">
              {t.latitude}: {position[0].toFixed(4)} <br/>
              {t.longitude}: {position[1].toFixed(4)}
            </p>
          </div>
        </div>

        {/* Right Side Alert Panel - Hidden on mobile by default or moved to a side drawer */}
        <div className="hidden lg:flex w-1/4 h-full bg-ocean-mid border-l border-ocean-light flex-col p-4 shadow-2xl glass-panel z-10">

          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-ocean-light pb-2">
            <AlertTriangle className={status !== 'SAFE' ? 'text-warn animate-pulse' : 'text-gray-400'} />
            {t.system_alerts}
          </h2>
          <div className={`px-4 py-2 rounded border-l-4 shadow-lg ${status === 'SAFE' ? 'bg-safe/20 border-safe text-safe' : status === 'WARNING' ? 'bg-warn/20 border-warn text-warn' : 'bg-danger/20 border-danger text-danger anim-vibrate'}`}>
            <p className="text-2xl font-black tracking-[0.2em]">{status === 'SAFE' ? t.status_safe : status === 'WARNING' ? t.status_warning : t.status_danger}</p>
          </div>

          <div className="flex gap-4 mt-4">
            <div className="bg-ocean-dark/80 px-4 py-2 rounded border border-ocean-light min-w-[100px]">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t.speed}</p>
              <p className="font-mono text-xl">{speed.toFixed(1)} <span className="text-xs text-gray-500">km/h</span></p>
            </div>
            <div className="bg-ocean-dark/80 px-4 py-2 rounded border border-ocean-light min-w-[100px]">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t.depth}</p>
              <p className="font-mono text-xl">25 <span className="text-xs text-gray-500">m</span></p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar mt-4">
            {alerts.length === 0 ? (
              <div className="text-gray-500 text-sm text-center mt-10">{t.no_recent_alerts}</div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="bg-ocean-dark p-3 rounded-lg border border-red-900/50 shadow">
                  <span className="text-xs text-red-400 font-mono mb-1 block">{alert.time}</span>
                  <p className="text-sm text-gray-200">{alert.msg}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Control Panel */}
      <div className="min-h-[5rem] lg:h-20 bg-ocean-mid border-t border-ocean-light flex flex-col lg:flex-row items-center justify-between px-4 lg:px-8 py-2 lg:py-0 z-20 glass-panel gap-3">
        <div className="flex gap-2 lg:gap-4 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 custom-scrollbar justify-center">
          <button 
            onClick={() => {
              setIsTracking(!isTracking);
              if (!isTracking) setManualMode(false);
            }}
            className={`whitespace-nowrap px-3 lg:px-6 py-2 rounded-lg text-xs lg:text-base font-semibold flex items-center gap-2 transition-all ${isTracking ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-green-500/20 text-green-500 border border-green-500/30 hover:bg-green-500/30'}`}
          >
            <Power className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">{isTracking ? t.stop_auto_tracking : t.start_auto_tracking}</span>
            <span className="sm:hidden">{isTracking ? "STOP" : "START"}</span>
          </button>
          <button 
            onClick={() => {
              setManualMode(!manualMode);
              if (!manualMode) setIsTracking(false);
            }}
            className={`whitespace-nowrap px-3 lg:px-6 py-2 rounded-lg text-xs lg:text-base font-semibold flex items-center gap-2 transition-all ${manualMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-ocean-light hover:bg-gray-600'}`}
          >
            <Navigation className="w-4 h-4 lg:w-5 lg:h-5" />
            <span>{manualMode ? (window.innerWidth < 640 ? "MANUAL" : t.manual_control_active) : (window.innerWidth < 640 ? "DRIVE" : t.enable_manual_control)}</span>
          </button>

          <button 
            onClick={() => setShowRiskZones(!showRiskZones)}
            className={`whitespace-nowrap px-3 lg:px-6 py-2 rounded-lg text-xs lg:text-base font-semibold border border-ocean-light flex items-center gap-2 transition-all bg-ocean-light hover:bg-gray-600`}
          >
            <MapIcon className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">{t.toggle_risk_zones}</span>
            <span className="sm:hidden">ZONES</span>
          </button>

          <button 
            onClick={() => setShowCoastGuardPopup(true)}
            className="whitespace-nowrap px-3 lg:px-6 py-2 rounded-lg text-xs lg:text-base font-bold bg-red-600 hover:bg-red-700 text-white border-2 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)] flex items-center gap-2 transition-all animate-pulse"
          >
            <PhoneCall className="w-4 h-4 lg:w-5 lg:h-5" />
            <span>COAST GUARD</span>
          </button>
        </div>

        <div className="flex gap-2 lg:gap-4 w-full lg:w-auto justify-center">
          <button 
            onClick={() => navigate('/home')}
            className="px-3 lg:px-6 py-2 rounded-lg text-xs lg:text-base font-semibold bg-gray-500/20 text-gray-300 hover:bg-gray-500/30 transition-all border border-gray-500/50 flex items-center gap-2"
          >
            <Home className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">{t.back_to_dashboard}</span>
            <span className="sm:hidden">HOME</span>
          </button>
          <button 
            onClick={triggerSOS}
            className="flex-1 lg:flex-none px-6 lg:px-8 py-2 rounded-lg text-xs lg:text-base font-bold bg-danger hover:bg-red-600 text-white shadow-lg shadow-red-500/50 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <PhoneCall className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
            <span>{t.sos_button}</span>
          </button>
        </div>
      </div>


      {/* Coast Guard Confirmation Popup */}
      {showCoastGuardPopup && (
        <div className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-ocean-mid w-full max-w-sm rounded-3xl border-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)] overflow-hidden scale-in-center">
            <div className="p-8 text-center text-white">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30 animate-pulse">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">Emergency Call</h2>
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

      {/* Inbox Modal */}
      {showMessages && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ocean-mid w-full max-w-lg rounded-2xl border border-ocean-light shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-ocean-light flex justify-between items-center bg-ocean-dark/50">
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold uppercase tracking-tighter">{t.family_messages}</h2>
              </div>
              <button onClick={() => setShowMessages(false)} className="text-gray-500 hover:text-white transition-colors">
                <Power className="w-6 h-6 rotate-90" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="text-center py-10 text-gray-500 italic">{t.no_messages}</div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${m.senderId === (userData.boatId || 'BOAT_DEMO') ? 'bg-blue-600/10 border-blue-500/40 ml-8' : m.senderId === 'ADMIN-COMMAND' ? 'bg-rose-600/20 border-rose-500/40 mr-8' : 'bg-ocean-dark/50 border-blue-500/20 mr-8'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${m.senderId === (userData.boatId || 'BOAT_DEMO') ? 'text-blue-300' : 'text-blue-400'}`}>
                        {m.senderId === (userData.boatId || 'BOAT_DEMO') ? t.you_captain : m.senderId === 'ADMIN-COMMAND' ? 'CONTROL CENTER' : t.family_label}
                      </span>
                      <span className="text-[10px] text-gray-500">{new Date(m.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-200 leading-relaxed font-medium">{m.content}</p>
                  </div>
                ))
              )}
            </div>
            <div className="p-6 bg-ocean-dark/50 border-t border-ocean-light space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={t.message_to_family}
                  className="flex-1 bg-ocean-dark border border-ocean-light rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <button 
                  onClick={handleSendMessage}
                  className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <button onClick={() => setShowMessages(false)} className="w-full py-2 bg-ocean-light hover:bg-gray-600 rounded-lg font-bold text-xs transition-colors uppercase tracking-widest">
                {t.dashboard}
              </button>
            </div>
        </div>
      </div>
      )}
      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ocean-mid w-full max-w-md rounded-2xl border border-ocean-light shadow-2xl overflow-hidden flex flex-col scale-in-center">
            <div className="p-6 border-b border-ocean-light flex justify-between items-center bg-ocean-dark/50">
              <div className="flex items-center gap-3">
                <UserIcon className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold uppercase tracking-tighter">{t.profile}</h2>
              </div>
              <button onClick={() => setShowProfile(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border-2 border-blue-500/20 shadow-inner">
                  <UserIcon className="w-12 h-12 text-blue-400" />
                </div>
                <h3 className="text-2xl font-black text-white">{userData.name || 'Captain'}</h3>
                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-black rounded-full border border-blue-500/30 uppercase tracking-widest mt-1">
                  {t.fisherman}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-ocean-dark/50 p-4 rounded-xl border border-ocean-light/50">
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">{t.boat_id}</p>
                  <p className="text-lg font-mono font-bold text-blue-300">{userData.boatId || 'BOAT_DEMO'}</p>
                </div>
                
                <div className="bg-ocean-dark/50 p-4 rounded-xl border border-ocean-light/50">
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">{t.email_address}</p>
                  <p className="text-sm font-medium text-gray-200">{userData.email || 'N/A'}</p>
                </div>

                <div className="bg-ocean-dark/50 p-4 rounded-xl border border-ocean-light/50 relative group">
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">{t.emergency_contact}</p>
                  {isEditing ? (
                    <input 
                      type="text"
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      className="w-full bg-ocean-dark border border-blue-500/50 rounded-lg px-3 py-1 text-red-400 font-mono font-bold focus:outline-none focus:border-red-500"
                    />
                  ) : (
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-mono font-bold text-red-400">{userData.familyPhone || 'N/A'}</p>
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="text-[10px] text-blue-400 font-bold hover:underline"
                      >
                        {t.edit}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-ocean-dark/50 border-t border-ocean-light flex gap-3">
              {isEditing ? (
                <>
                  <button 
                    onClick={() => setIsEditing(false)} 
                    className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-xl font-black transition-all uppercase tracking-widest text-xs"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={handleUpdateProfile}
                    disabled={isUpdating}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black transition-all shadow-lg active:scale-95 uppercase tracking-widest text-xs disabled:opacity-50"
                  >
                    {isUpdating ? t.updating : t.save}
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setShowProfile(false)} 
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black transition-all shadow-lg active:scale-95 uppercase tracking-widest"
                >
                  {t.back_to_dashboard}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
