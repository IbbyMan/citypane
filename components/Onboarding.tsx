
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CITIES_DB } from '../constants';
import { Search, Sparkles, MapPin, ChevronRight, ArrowRight } from 'lucide-react';
import WeatherCanvas from './WeatherCanvas';
import { WeatherType } from '../types';

interface OnboardingProps {
  onComplete: (name: string, cityId: string) => void;
  weatherType: WeatherType | 'Starry';
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, weatherType }) => {
  const [step, setStep] = useState<'profile' | 'loading'>('profile');
  const [name, setName] = useState('');
  const [selectedCityId, setSelectedCityId] = useState(CITIES_DB[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const city = CITIES_DB.find(c => c.id === selectedCityId);

  const filteredCities = useMemo(() => {
    if (!searchTerm) return CITIES_DB;
    const lower = searchTerm.toLowerCase();
    return CITIES_DB.filter(c => 
      c.name_cn.includes(lower) || 
      c.name_en.toLowerCase().includes(lower)
    );
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCitySelect = (cityId: string, cityName: string) => {
    setSelectedCityId(cityId);
    setSearchTerm(cityName);
    setIsDropdownOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStep('loading');
    setTimeout(() => {
      onComplete(name, selectedCityId);
    }, 3000);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0f172a] overflow-hidden`}>
      
      {/* 1. Deep Radial Background Gradient for Depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1e293b] via-[#0f172a] to-[#020617] opacity-100" />

      {/* 2. Weather Effects - clear visibility */}
      <div className="absolute inset-0 opacity-100 pointer-events-none mix-blend-screen">
        <WeatherCanvas type={weatherType} />
      </div>

      {/* 3. Atmospheric Noise Texture */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      
      {/* 4. Vignette Overlay to focus center */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)] pointer-events-none" />

      <AnimatePresence mode="wait">
        {step === 'profile' ? (
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
            transition={{ duration: 0.8, ease: "circOut" }}
            className="w-full max-w-lg relative z-10"
          >
             {/* Glass Card Container - Dark Theme Style */}
            <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 p-12 sm:p-14 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                
                {/* Decorative Top Line */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/20 rounded-b-full" />

                <div className="text-slate-200 text-center mb-16">
                    <h1 className="font-serif-sc text-7xl mb-4 tracking-tighter text-white drop-shadow-lg">CityPane</h1>
                    <div className="flex items-center justify-center gap-4 opacity-60 mb-8">
                        <div className="h-px w-8 bg-white/30" />
                        <h2 className="text-sm font-light tracking-[0.5em] uppercase">窗中城</h2>
                        <div className="h-px w-8 bg-white/30" />
                    </div>
                    <p className="font-serif-sc text-lg text-slate-400 font-light leading-relaxed tracking-widest">
                        此刻穿越距离，<br/>和远方的人看同一扇窗。
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-12">
                    <div className="relative group">
                        <label className="absolute -top-6 left-0 text-[10px] uppercase tracking-[0.2em] text-indigo-200/70 font-medium transition-all group-focus-within:text-indigo-300">
                            Your Name / 你的名字
                        </label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-transparent border-b border-white/20 py-2 focus:outline-none focus:border-white/60 transition-colors font-serif-sc text-2xl text-white placeholder-transparent"
                            placeholder="Enter Name"
                            required
                        />
                    </div>

                    <div ref={dropdownRef} className="relative group">
                        <label className="absolute -top-6 left-0 text-[10px] uppercase tracking-[0.2em] text-indigo-200/70 font-medium transition-all group-focus-within:text-indigo-300">
                            Anchor City / 你的城市
                        </label>
                        <div className="relative">
                            <input 
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setIsDropdownOpen(true);
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                                placeholder={city ? `${city.name_cn}` : "搜索..."}
                                className="w-full bg-transparent border-b border-white/20 py-2 pr-8 focus:outline-none focus:border-white/60 transition-colors font-serif-sc text-2xl text-white placeholder:text-slate-600"
                            />
                            <Search className="absolute right-0 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                        </div>

                        <AnimatePresence>
                            {isDropdownOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute left-0 right-0 top-full mt-4 bg-[#1e293b]/90 backdrop-blur-xl border border-white/10 shadow-2xl max-h-60 overflow-y-auto rounded-xl z-50 custom-scrollbar p-2"
                            >
                                {filteredCities.length > 0 ? (
                                filteredCities.map(c => (
                                    <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => handleCitySelect(c.id, c.name_cn)}
                                    className={`w-full text-left px-4 py-4 rounded-lg hover:bg-white/5 transition-all flex justify-between items-center group ${selectedCityId === c.id ? 'bg-white/5' : ''}`}
                                    >
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-base font-serif-sc text-slate-200">{c.name_cn}</span>
                                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{c.name_en}</span>
                                    </div>
                                    {selectedCityId === c.id && <MapPin size={14} className="text-indigo-400" />}
                                    </button>
                                ))
                                ) : (
                                <div className="p-4 text-center text-slate-500 text-xs tracking-wider uppercase">
                                    No City Found
                                </div>
                                )}
                            </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="pt-8">
                        <button 
                            type="submit"
                            className="group relative w-full overflow-hidden rounded-full bg-white/10 p-px transition-all duration-300 hover:bg-white/20 hover:shadow-[0_0_2rem_-0.5rem_#ffffff40]"
                        >
                            <div className="relative flex items-center justify-center gap-3 rounded-full bg-[#0f172a]/50 px-8 py-4 transition-all duration-300 group-hover:bg-transparent">
                                <span className="font-serif-sc text-sm tracking-[0.2em] font-medium text-white">
                                    设定我的锚点
                                </span>
                                <ArrowRight className="h-4 w-4 text-white transition-transform duration-300 group-hover:translate-x-1" />
                            </div>
                        </button>
                    </div>
                </form>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center relative z-10"
          >
            <motion.div 
              animate={{ rotate: 360, scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="mb-12 text-indigo-300 mix-blend-screen"
            >
              <Sparkles size={64} strokeWidth={0.5} />
            </motion.div>
            <p className="font-serif-sc text-4xl tracking-widest text-white mb-4 drop-shadow-xl">
              正在连接 <span className="font-bold border-b border-white/30 pb-1">{city?.name_cn}</span>
            </p>
            <p className="text-indigo-200/50 font-light text-xs tracking-[0.4em] uppercase">CityPane Initializing...</p>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default Onboarding;
