
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Search as SearchIcon, Dices, Plus, MapPin, Trash2, AlertTriangle } from 'lucide-react';
import { UserFrame, WeatherStatus, WeatherType } from '../types';
import { CITIES_DB } from '../constants';
import Frame from './Frame';
import { fetchRealWeather } from '../utils/weather';
import { generateVibeName } from '../utils/nameGenerator';
import WeatherCanvas from './WeatherCanvas';
import ChristmasDecor from './ChristmasDecor';

interface GalleryProps {
  frames: UserFrame[];
  onAdd: (nickname: string, cityId: string) => void;
  onDelete: (uuid: string) => void;
  maxFrames: number;
  weatherType: WeatherType | 'Starry';
}

const Gallery: React.FC<GalleryProps> = ({ frames, onAdd, onDelete, maxFrames, weatherType }) => {
  const [selectedFrame, setSelectedFrame] = useState<UserFrame | null>(null);
  const [selectedWeather, setSelectedWeather] = useState<WeatherStatus | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<UserFrame | null>(null);
  const [showMaxLimitAlert, setShowMaxLimitAlert] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [newCityId, setNewCityId] = useState(CITIES_DB[0].id);
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  const isAtMaxFrames = frames.length >= maxFrames;

  const filteredCities = CITIES_DB.filter(c => 
    c.name_cn.includes(citySearchTerm) || 
    c.name_en.toLowerCase().includes(citySearchTerm.toLowerCase())
  );

  useEffect(() => {
    // Format date: e.g., "Oct 24, 2023 • Tuesday" or similar appropriate format
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    setCurrentDate(now.toLocaleDateString('en-US', options));
  }, []);

  useEffect(() => {
    if (selectedFrame) {
      const city = CITIES_DB.find(c => c.id === selectedFrame.cityId);
      if (city) {
        // For special locations, use fake weather data
        if (city.isSpecial) {
          setSelectedWeather({
            temp: city.specialTemp ?? 0,
            weatherCode: 'Clear' as WeatherType,
            localTime: new Date()
          });
        } else {
          fetchRealWeather(city.geo, city.id, city.timezoneOffset).then(setSelectedWeather);
        }
      }
    } else {
      setSelectedWeather(null);
    }
  }, [selectedFrame]);

  const handleAdd = () => {
    if (!newNickname.trim()) return;
    if (isAtMaxFrames) {
      setShowMaxLimitAlert(true);
      return;
    }
    onAdd(newNickname, newCityId);
    setNewNickname('');
    setCitySearchTerm('');
    setShowAddModal(false);
  };

  const handleDeleteConfirm = () => {
    if (showDeleteConfirm) {
      onDelete(showDeleteConfirm.uuid);
      setShowDeleteConfirm(null);
      // If we're viewing the deleted frame, close the expanded view
      if (selectedFrame?.uuid === showDeleteConfirm.uuid) {
        setSelectedFrame(null);
      }
    }
  };

  const handleAddClick = () => {
    if (isAtMaxFrames) {
      setShowMaxLimitAlert(true);
    } else {
      setShowAddModal(true);
    }
  };

  const handleRandomize = () => {
    setNewNickname(generateVibeName());
    // 区分中国城市和非中国城市，增加非中国城市的出现概率
    const chinaCities = CITIES_DB.filter(c => /^\d{3}$/.test(c.series_num));
    const internationalCities = CITIES_DB.filter(c => !/^\d{3}$/.test(c.series_num));
    // 60%概率选择非中国城市，40%概率选择中国城市
    const pool = Math.random() < 0.6 ? internationalCities : chinaCities;
    const randomCity = pool[Math.floor(Math.random() * pool.length)];
    setNewCityId(randomCity.id);
    setCitySearchTerm(randomCity.name_cn);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] relative overflow-hidden flex flex-col text-slate-100 selection:bg-indigo-500/30">
      
      {/* Background Weather Effect (Unified) */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <WeatherCanvas type={weatherType} speedMultiplier={weatherType === 'Snow' ? 0.4 : 1.0} />
      </div>

      {/* Christmas Decorations */}
      <ChristmasDecor enabled={true} />

      {/* Subtle Gradient & Noise Texture */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a] opacity-80 -z-10" />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      <div className="relative z-10 flex-grow p-6 sm:p-12 pb-40 max-w-7xl mx-auto w-full">
        <header className="mb-24 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 text-center sm:text-left pt-8">
          <div>
            <h2 className="text-slate-400 text-xs sm:text-sm tracking-[0.3em] mb-4 font-medium pl-1 font-serif-sc">此时此刻，和远方的人看同一扇窗</h2>
            <h1 className="font-serif-sc text-6xl sm:text-7xl text-white tracking-tight drop-shadow-2xl">
              窗中城 <span className="text-slate-500 font-thin mx-2">•</span> <span className="font-light text-slate-200">CityPane</span>
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-slate-400 text-xs tracking-widest font-medium pr-2">yunjiu.ibby</p>
            <div className="flex items-center gap-4 text-slate-400 text-xs tracking-widest uppercase font-medium bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm border border-white/5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse box-shadow-glow"></span>
              <span>Live</span>
              <div className="w-px h-4 bg-slate-600 mx-2" />
              <Sparkles size={14} className="text-amber-200" />
            </div>
            {/* Current Date Display */}
            <p className="text-slate-500 text-xs uppercase tracking-[0.2em] font-medium pr-2 mt-2">{currentDate}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 sm:gap-20">
          {frames.map(frame => (
            <div key={frame.uuid} className="relative flex justify-center w-full aspect-[4/5] perspective-1000 group/card">
              <div className="relative w-full h-full z-0">
                <Frame 
                  frame={frame} 
                  onClick={() => setSelectedFrame(frame)}
                  firstCityName={frames[0] ? CITIES_DB.find(c => c.id === frames[0].cityId)?.name_cn : undefined}
                />
              </div>
              {/* Delete button - appears on hover */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(frame);
                }}
                className="absolute top-3 right-3 z-20 p-2 bg-black/50 hover:bg-red-600 text-white/60 hover:text-white rounded-full opacity-0 group-hover/card:opacity-100 transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-red-500"
                title="删除此窗"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          
          <motion.div 
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddClick}
            className={`aspect-[4/5] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group w-full backdrop-blur-sm ${
              isAtMaxFrames 
                ? 'border-slate-700/50 bg-slate-800/20 opacity-60' 
                : 'border-slate-700 hover:border-slate-500 bg-slate-800/30'
            }`}
          >
            <div className={`w-20 h-20 rounded-full shadow-inner border flex items-center justify-center mb-8 transition-all duration-300 ${
              isAtMaxFrames
                ? 'bg-slate-800/50 border-slate-700/50 text-slate-600'
                : 'bg-slate-800/80 border-slate-700 text-slate-500 group-hover:text-white group-hover:bg-slate-700 group-hover:shadow-lg'
            }`}>
              <Plus size={32} strokeWidth={1} />
            </div>
            <p className={`text-xs tracking-[0.4em] uppercase font-bold transition-colors ${
              isAtMaxFrames ? 'text-slate-600' : 'text-slate-500 group-hover:text-slate-300'
            }`}>
              {isAtMaxFrames ? 'Limit Reached' : 'Add New Pane'}
            </p>
            <p className="text-slate-600 text-[10px] mt-2 font-serif-sc">
              {isAtMaxFrames ? `已达上限 ${maxFrames} 个` : '推开新窗，建立联结'}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Expanded Modal */}
      <AnimatePresence>
        {selectedFrame && (
          <motion.div 
            className="fixed inset-0 z-[110] flex items-center justify-center overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div 
              onClick={() => setSelectedFrame(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-3xl"
            />
            
            <div className="relative w-full h-full z-10 flex flex-col items-center justify-center text-white">
              <button 
                onClick={() => setSelectedFrame(null)}
                className="absolute top-6 right-6 p-4 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all z-[120]"
              >
                <X size={32} strokeWidth={1} />
              </button>

              <div className="w-full h-full flex flex-col md:flex-row gap-8 lg:gap-20 items-center justify-center px-4 md:px-12 py-8">
                {/* Image Area - Portrait aspect ratio with wooden frame */}
                <motion.div 
                  className="relative h-[50vh] md:h-[70vh] aspect-[4/5] max-w-sm md:max-w-md"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                >
                   {/* Outer wooden frame - deep ebony */}
                   <div 
                     className="absolute -inset-4 md:-inset-6 rounded-sm"
                     style={{
                       background: 'linear-gradient(145deg, #2a1a10 0%, #1a0f08 25%, #0d0805 50%, #1a0f08 75%, #241510 100%)',
                       boxShadow: '0 25px 80px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)'
                     }}
                   />
                   {/* Wood grain texture overlay */}
                   <div 
                     className="absolute -inset-4 md:-inset-6 rounded-sm opacity-20 pointer-events-none"
                     style={{
                       backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='wood'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04 0.15' numOctaves='3' seed='5'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23wood)'/%3E%3C/svg%3E")`,
                       mixBlendMode: 'overlay'
                     }}
                   />
                   {/* Inner frame bevel - dark wood */}
                   <div 
                     className="absolute -inset-2 md:-inset-3 rounded-sm"
                     style={{
                       background: 'linear-gradient(145deg, #3a2518 0%, #241510 30%, #180e08 70%, #2a1a10 100%)',
                       boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.06), inset -2px -2px 4px rgba(0,0,0,0.5)'
                     }}
                   />
                   {/* Antique gold inner trim */}
                   <div 
                     className="absolute -inset-1 md:-inset-1.5 rounded-sm"
                     style={{
                       background: 'linear-gradient(145deg, #9a7b3a 0%, #6b5428 30%, #4a3a1c 50%, #6b5428 70%, #7d6330 100%)',
                       boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.2), inset -1px -1px 2px rgba(0,0,0,0.4)'
                     }}
                   />
                   {/* Inner shadow for depth */}
                   <div 
                     className="absolute inset-0 rounded-sm pointer-events-none z-10"
                     style={{
                       boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5), inset 0 0 3px rgba(0,0,0,0.8)'
                     }}
                   />
                   {/* Content container */}
                   <div className="relative w-full h-full rounded-sm overflow-hidden bg-[#1e2330]">
                    <Frame frame={selectedFrame} isExpanded firstCityName={frames[0] ? CITIES_DB.find(c => c.id === frames[0].cityId)?.name_cn : undefined} />
                   </div>
                </motion.div>

                {/* Metadata Column */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                  className="w-full md:w-80 lg:w-[28rem] text-white space-y-10 overflow-y-auto max-h-[30vh] md:max-h-full custom-scrollbar pr-2 md:pt-24"
                >
                  <div className="space-y-8">
                    <header>
                      <div className="w-12 h-[2px] bg-indigo-400/50 mb-8" />
                      <div className="flex items-center gap-2 text-indigo-200/60 mb-4">
                         <MapPin size={12} />
                         <p className="text-xs tracking-[0.4em] uppercase font-medium">Connected Location</p>
                      </div>
                      
                      <h2 className="text-5xl lg:text-7xl font-serif-sc mb-6 tracking-tight text-white leading-tight drop-shadow-lg">
                        {CITIES_DB.find(c => c.id === selectedFrame.cityId)?.name_cn}
                      </h2>
                      <p className="text-lg font-light text-slate-300 font-serif-sc leading-relaxed border-l-2 border-white/10 pl-6 italic">
                        {CITIES_DB.find(c => c.id === selectedFrame.cityId)?.quote || "万里的距离在此刻浓缩为一窗灯火。"}
                      </p>
                    </header>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-800/40 backdrop-blur-md p-6 rounded-2xl flex flex-col justify-center border border-white/5 hover:bg-slate-800/60 transition-colors">
                        <p className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-medium">Temperature</p>
                        {selectedWeather ? (
                          (() => {
                            const city = CITIES_DB.find(c => c.id === selectedFrame.cityId);
                            const isSpecial = city?.isSpecial;
                            const temp = selectedWeather.temp;
                            // Special display for glitch city (404 error code)
                            if (isSpecial && temp === 404) {
                              return <p className="text-4xl font-light tracking-tighter text-red-500 animate-pulse">ERR</p>;
                            }
                            // Special color for extreme temperatures
                            const tempColor = isSpecial 
                              ? (temp <= -100 ? 'text-cyan-400' : temp <= 0 ? 'text-blue-400' : 'text-emerald-400')
                              : 'text-white';
                            return (
                              <p className={`text-4xl font-light tracking-tighter ${tempColor}`}>
                                {temp}°
                              </p>
                            );
                          })()
                        ) : (
                          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        )}
                      </div>
                      <div className="bg-slate-800/40 backdrop-blur-md p-6 rounded-2xl flex flex-col justify-center border border-white/5 hover:bg-slate-800/60 transition-colors">
                        <p className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-medium">Condition</p>
                        {selectedWeather ? (
                          (() => {
                            const city = CITIES_DB.find(c => c.id === selectedFrame.cityId);
                            // For special locations, show special weather description
                            if (city?.isSpecial && city.specialWeather) {
                              const specialWeatherText: Record<string, string> = {
                                'Vacuum': 'Vacuum',
                                'GasGiant': 'Gas Storm',
                                'DeepSea': 'Deep Sea',
                                'Glitch': '??ERROR??'
                              };
                              const textColor = city.specialWeather === 'Glitch' 
                                ? 'text-red-500 animate-pulse' 
                                : 'text-cyan-400';
                              return (
                                <p className={`text-xl font-light tracking-wide ${textColor}`}>
                                  {specialWeatherText[city.specialWeather] || city.specialWeather}
                                </p>
                              );
                            }
                            return (
                              <p className="text-xl font-light tracking-wide text-white">
                                {selectedWeather.weatherCode}
                              </p>
                            );
                          })()
                        ) : (
                          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        )}
                      </div>
                    </div>

                    {/* Pet decoration */}
                    <div className="flex justify-start mt-4">
                      <img
                        src="/pet-gif/pet-2.gif"
                        alt="window pet"
                        className="drop-shadow-lg"
                        style={{ 
                          width: '200px', 
                          height: 'auto',
                          imageRendering: 'pixelated'
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
             <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-[#1e293b] border border-slate-700 w-full max-w-xl p-10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] text-slate-100 flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-8 border-b border-slate-700/50 pb-6">
                <h2 className="font-serif-sc text-3xl tracking-tight text-white">开启新窗 • New Pane</h2>
                <button 
                  onClick={handleRandomize}
                  className="group flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-all border border-slate-700 hover:border-slate-500"
                  title="Randomize"
                >
                  <Dices size={16} className="text-indigo-400 group-hover:rotate-180 duration-500" />
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 group-hover:text-white font-medium">Random</span>
                </button>
              </div>

              <div className="flex flex-col gap-8 flex-grow overflow-hidden">
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-slate-400 mb-3 font-bold">窗口昵称</label>
                  <input 
                    type="text" 
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    placeholder="如，妈妈，远方的Ta"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-4 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 transition-all text-xl font-serif-sc placeholder:text-gray-500 text-white"
                  />
                </div>
                <div className="flex flex-col min-h-0 flex-grow">
                  <label className="block text-xs uppercase tracking-[0.2em] text-slate-400 mb-3 font-bold">定位城市</label>
                  <div className="relative mb-4">
                    <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="搜索城市..." 
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 text-base placeholder:text-gray-500 text-white transition-all"
                      value={citySearchTerm}
                      onChange={(e) => setCitySearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex-grow overflow-y-auto rounded-xl bg-slate-900/30 border border-slate-700/50 p-2 custom-scrollbar space-y-1">
                    {filteredCities.map(city => (
                      <button
                        key={city.id}
                        onClick={() => {
                          setNewCityId(city.id);
                          setCitySearchTerm(city.name_cn);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-all flex justify-between items-center group ${newCityId === city.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                      >
                        <span className="font-serif-sc text-lg">{city.name_cn}</span>
                        <span className={`text-[10px] uppercase font-sans tracking-wider ${newCityId === city.id ? 'opacity-80' : 'opacity-40 group-hover:opacity-60'}`}>{city.name_en}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-8 flex gap-4 mt-2">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all uppercase text-xs tracking-[0.2em] font-medium">Cancel</button>
                <button onClick={handleAdd} className="flex-1 bg-white text-slate-900 py-4 rounded-xl hover:bg-indigo-50 hover:text-indigo-900 transition-all uppercase text-xs tracking-[0.2em] font-bold shadow-lg shadow-white/10">Confirm</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-[#1e293b] border border-slate-700 w-full max-w-md p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] text-slate-100"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                  <Trash2 size={28} className="text-red-400" />
                </div>
                <h3 className="font-serif-sc text-2xl text-white mb-2">不再注视</h3>
                <p className="text-slate-400 text-sm mb-6">
                  是否断开与「<span className="text-white font-medium">{showDeleteConfirm.nickname}</span>」的视野连接？
                </p>
                <div className="flex gap-4 w-full">
                  <button 
                    onClick={() => setShowDeleteConfirm(null)} 
                    className="flex-1 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all text-sm font-medium"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleDeleteConfirm} 
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl transition-all text-sm font-medium"
                  >
                    确认断开
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Max Limit Alert Modal */}
      <AnimatePresence>
        {showMaxLimitAlert && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMaxLimitAlert(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-[#1e293b] border border-slate-700 w-full max-w-md p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] text-slate-100"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
                  <AlertTriangle size={28} className="text-amber-400" />
                </div>
                <h3 className="font-serif-sc text-2xl text-white mb-2">已达上限</h3>
                <p className="text-slate-400 text-sm mb-6">
                  最多只能同时拥有 <span className="text-amber-400 font-bold">{maxFrames}</span> 个画框<br />
                  <span className="text-slate-500">请删除一些旧窗口后再添加新的</span>
                </p>
                <button 
                  onClick={() => setShowMaxLimitAlert(false)} 
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl transition-all text-sm font-medium"
                >
                  我知道了
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;
