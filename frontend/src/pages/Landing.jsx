import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Anchor, Lock, Mail, User, ChevronRight, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { translations } from '../translations';
import { API_URL } from '../config';

export default function Landing() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    role: 'fisherman', 
    language: localStorage.getItem('preferredLanguage') || 'en',
    boatId: '',
    familyPhone: ''
  });


  const t = translations[formData.language] || translations.en;

  // Sync language choice to localStorage immediately so it's "sticky"
  const handleLanguageChange = (newLang) => {
    setFormData({...formData, language: newLang});
    localStorage.setItem('preferredLanguage', newLang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? 'login' : 'signup';
    
    try {
      const res = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Welcome back, ${data.user.name || 'Captain'}!`, { style: { background: '#10b981', color: '#fff' }});
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('preferredLanguage', data.user.language || formData.language);
        
        if (data.user.role === 'admin') {
          navigate('/admin');
        } else {
          // Both family and fisherman go to the role-based main menu
          navigate('/home');
        }
      } else {
        toast.error(data.message || 'Authentication failed');
      }
    } catch {
      toast.error('Server offline. Using demo login.');
      // Fallback Demo Login
      const fallbackRole = (formData.email === 'admin@seashield.com' && formData.password === 'admin') ? 'admin' : formData.role;
      const demoPhone = (formData.familyPhone || (fallbackRole === 'admin' ? '+919999999999' : ''));
      
      if (!demoPhone && fallbackRole === 'fisherman') {
        toast('Demo Mode: Join as "Signup" to test your real family phone!', { icon: 'ℹ️', duration: 6000 });
      }

      localStorage.setItem('user', JSON.stringify({ 
        name: formData.name || 'Demo User', 
        role: fallbackRole, 
        language: formData.language || 'en',
        boatId: formData.boatId || 'BOAT_DEMO',
        familyPhone: demoPhone
      }));

      
      if (fallbackRole === 'admin') navigate('/admin');
      else navigate('/home'); // Both family and fisherman use unified dashboard menu
    }
  };

  return (
    <div className="min-h-screen bg-ocean-dark text-white flex custom-scrollbar relative">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Left Panel: Presentation */}
      <div className="hidden lg:flex flex-col justify-center w-1/2 p-16 relative z-10 border-r border-ocean-light bg-ocean-mid/50 backdrop-blur">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-blue-500/20 p-4 rounded-xl border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
            <Shield className="w-12 h-12 text-blue-400" />
          </div>
          <h1 className="text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            SEASHIELD AI
          </h1>
        </div>

        <h2 className="text-3xl font-bold mb-6 text-gray-100 leading-snug">
          Advanced Maritime Safety & Boundary Navigation System
        </h2>
        
        <p className="text-gray-400 text-lg leading-relaxed mb-8">
          Protecting our fishermen and securing our international maritime boundaries. SeaShield provides real-time AI-based geofencing, dynamic boundary proximity warnings, and instant remote family distress (SOS) notifications.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-ocean-dark/50 p-4 rounded-lg border border-ocean-light">
            <Anchor className="text-emerald-400 w-8 h-8" />
            <div>
              <h4 className="font-bold text-gray-200">Real-Time Border Detection</h4>
              <p className="text-sm text-gray-500">Sub-meter accuracy boundary calculations using Turf.js</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-ocean-dark/50 p-4 rounded-lg border border-ocean-light">
            <Lock className="text-blue-400 w-8 h-8" />
            <div>
              <h4 className="font-bold text-gray-200">Secure Remote Monitoring</h4>
              <p className="text-sm text-gray-500">AES-level active socket streaming to the Family Hub</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Login / Signup */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="bg-ocean-mid p-6 sm:p-10 rounded-2xl border border-ocean-light shadow-2xl w-full max-w-md glass-panel">

          
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black mb-2 tracking-tight">
              {isLogin ? t.welcome : t.signup_title}
            </h2>
            <p className="text-gray-400 font-medium">
              {isLogin ? t.login_title : t.signup_desc}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{t.full_name}</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input 
                    type="text" required
                    className="w-full bg-ocean-dark border border-ocean-light rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder={t.full_name_placeholder}
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{t.email_address}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input 
                  type="email" required
                  className="w-full bg-ocean-dark border border-ocean-light rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder={t.email_placeholder}
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{t.password_label}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input 
                  type="password" required
                  className="w-full bg-ocean-dark border border-ocean-light rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder={t.password_placeholder}
                  value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{t.fisherman.split(' ')[0]} Type</label>
              <select 
                className="w-full bg-ocean-dark border border-ocean-light rounded-lg py-3 px-4 text-gray-300 focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="fisherman">{t.fisherman}</option>
                <option value="family">{t.family}</option>
                <option value="admin">{t.admin}</option>
              </select>
            </div>


            {!isLogin && (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{t.vessel_id}</label>
                  <div className="relative">
                    <Anchor className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                    <input 
                      type="text" required
                      className="w-full bg-ocean-dark border border-ocean-light rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder={t.vessel_placeholder}
                      value={formData.boatId} onChange={e => setFormData({...formData, boatId: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 italic">{t.family_vessel_desc}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{t.family_phone}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                    <input 
                      type="tel" required
                      className="w-full bg-ocean-dark border border-ocean-light rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder={t.phone_placeholder}
                      value={formData.familyPhone} onChange={e => setFormData({...formData, familyPhone: e.target.value})}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 italic">{t.phone_desc}</p>

                </div>
              </>
            )}


            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{t.language}</label>
              <select 
                className="w-full bg-ocean-dark border border-ocean-light rounded-lg py-3 px-4 text-gray-300 focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                value={formData.language} onChange={e => handleLanguageChange(e.target.value)}
              >
                <option value="en">English (US)</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="si">Sinhalese (සිංහල)</option>
                <option value="ml">Malayalam (മലയാളം)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="kn">Kannada (ಕನ್ನಡ)</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="mr">Marathi (मराठी)</option>
                <option value="gu">Gujarati (ગુજરાતી)</option>
                <option value="bn">Bengali (বাংলা)</option>
                <option value="or">Odia (ଓଡ଼ିଆ)</option>
              </select>
            </div>

            <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
              {isLogin ? t.welcome : t.signup_title}
              <ChevronRight className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              {isLogin ? t.no_account : t.already_registered}
              <button 
                onClick={() => setIsLogin(!isLogin)} 
                className="ml-2 text-blue-400 font-bold hover:text-blue-300 transition-colors"
                type="button"
              >
                {isLogin ? t.signup_prompt : t.login_prompt}
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
