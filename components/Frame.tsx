
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserFrame, WeatherStatus, WeatherType, SpecialWeatherType } from '../types';
import { CITIES_DB } from '../constants';
import { fetchRealWeather, formatTime, getTimeOfDay } from '../utils/weather';
import { useAmbientSound } from '../utils/useAmbientSound';
import TimeFilter from './TimeFilter';
import WeatherCanvas from './WeatherCanvas';
import ClearSkyEffect from './ClearSkyEffect';
import { Moon, Sun, Sparkles, RefreshCw, WifiOff, Volume2, VolumeX } from 'lucide-react';

// Pixelate image using Canvas - downsample then upscale with nearest-neighbor
const pixelateImage = (
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  pixelSize: number = 2 // How many pixels to merge into one (smaller = subtler effect)
): string => {
  // Step 1: Create small canvas for downsampling
  const smallWidth = Math.floor(targetWidth / pixelSize);
  const smallHeight = Math.floor(targetHeight / pixelSize);
  
  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = smallWidth;
  smallCanvas.height = smallHeight;
  const smallCtx = smallCanvas.getContext('2d')!;
  
  // Disable smoothing for crisp pixels
  smallCtx.imageSmoothingEnabled = false;
  smallCtx.drawImage(img, 0, 0, smallWidth, smallHeight);
  
  // Step 2: Subtle color quantization - more colors for natural look
  const imageData = smallCtx.getImageData(0, 0, smallWidth, smallHeight);
  const data = imageData.data;
  
  // 12 levels per channel = 1728 colors (much more natural)
  const levels = 12;
  const step = 255 / (levels - 1);
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / step) * step;     // R
    data[i + 1] = Math.round(data[i + 1] / step) * step; // G
    data[i + 2] = Math.round(data[i + 2] / step) * step; // B
    // Alpha stays unchanged
  }
  
  smallCtx.putImageData(imageData, 0, 0);
  
  // Step 3: Scale up to target size with nearest-neighbor (no smoothing)
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const finalCtx = finalCanvas.getContext('2d')!;
  
  // Critical: disable image smoothing for pixelated upscale
  finalCtx.imageSmoothingEnabled = false;
  finalCtx.drawImage(smallCanvas, 0, 0, targetWidth, targetHeight);
  
  return finalCanvas.toDataURL('image/png');
};

// Pollinations API Key (从环境变量读取)
const POLLINATIONS_API_KEY = import.meta.env.VITE_POLLINATIONS_API_KEY || '';

// localStorage 缓存配置
const CACHE_KEY_PREFIX = 'citypane_img_';
const CACHE_DURATION_MS = 20 * 60 * 1000; // 20分钟

// 检查 localStorage 缓存是否有效
const getCachedImage = (cacheKey: string): string | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + cacheKey);
    if (!cached) return null;
    
    const { imageUrl, timestamp } = JSON.parse(cached);
    const now = Date.now();
    
    // 检查是否在20分钟内
    if (now - timestamp < CACHE_DURATION_MS) {
      return imageUrl;
    }
    
    // 过期了，删除缓存
    localStorage.removeItem(CACHE_KEY_PREFIX + cacheKey);
    return null;
  } catch (e) {
    return null;
  }
};

// 保存图片到 localStorage 缓存
const setCachedImage = (cacheKey: string, imageUrl: string): void => {
  try {
    const data = {
      imageUrl,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY_PREFIX + cacheKey, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage 存储失败，可能已满', e);
  }
};

// Helper: 直接调用 Pollinations API (前端化)
const generateImageDirect = async (
  prompt: string,
  width: number = 512,
  height: number = 768,
  model: string = 'flux',
  negativePrompt: string = ''
): Promise<string> => {
  const seed = Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(prompt);
  const encodedNegative = negativePrompt ? encodeURIComponent(negativePrompt) : '';
  
  // 调用 Pollinations API
  const callAPI = async (modelName: string): Promise<Response> => {
    let url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${modelName}&width=${width}&height=${height}&seed=${seed}&nologo=true&private=true`;
    if (encodedNegative) {
      url += `&negative_prompt=${encodedNegative}`;
    }
    return fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${POLLINATIONS_API_KEY}` },
    });
  };

  // 先尝试 flux 模型
  let response = await callAPI(model);
  
  // 如果 flux 失败，尝试 turbo
  if (!response.ok && model === 'flux') {
    const errorText = await response.text();
    const lowerError = errorText.toLowerCase();
    
    if (lowerError.includes('no active') && lowerError.includes('servers')) {
      console.log('Flux 服务器不可用，切换到 turbo...');
      response = await callAPI('turbo');
    }
  }

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status}`);
  }

  // 获取图片并转为 base64
  const imageBlob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(imageBlob);
  });
};

interface FrameProps {
  frame: UserFrame;
  onClick?: () => void;
  isExpanded?: boolean;
  firstCityName?: string;
}

// Helper: Generate random loading message (with special version for fictional locations)
const getLoadingMessage = (
  cityName: string, 
  nickname: string, 
  firstCityName?: string,
  time?: string,
  weather?: string,
  isSpecial?: boolean
): string => {
  if (isSpecial) {
    return '正在校准坐标，准备跃迁...';
  }
  const messages = [
    `正在折叠 ${firstCityName || '这里'} 与 ${cityName} 之间的地图...`,
    `正在捕获 ${cityName} 的季风...`,
    `我想看看 ${nickname} 的窗外...`,
    `正在将 ${cityName} 的 ${time || '此刻'} 凝固进画框...`,
    `正在聆听此时此刻的 ${cityName} ...`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};

// Helper: Get special weather description for fictional locations
const getSpecialWeatherDescription = (specialWeather: SpecialWeatherType): string => {
  switch (specialWeather) {
    case 'Vacuum':
      return 'absolute vacuum of space, no atmosphere, harsh shadows, stark contrast between light and dark, cosmic radiation';
    case 'GasGiant':
      return 'swirling gas storms, ammonia clouds, extreme pressure atmosphere, cosmic winds, diamond rain';
    case 'DeepSea':
      return 'crushing water pressure, bioluminescent creatures, eternal darkness, underwater currents, ancient mystery';
    case 'Glitch':
      return 'digital corruption, data fragments, broken reality, static noise, system malfunction';
    default:
      return '';
  }
};

// Helper: Get temperature display color for special locations
const getSpecialTempColor = (temp: number, isSpecial?: boolean): string => {
  if (!isSpecial) return 'text-white/95';
  if (temp === 404) return 'text-red-500 animate-pulse'; // Glitch city error code
  if (temp <= -100) return 'text-cyan-400'; // Extreme cold - neon cyan
  if (temp <= 0) return 'text-blue-400'; // Cold - blue
  return 'text-emerald-400'; // Deep sea - green
};

// Helper: Get time display for special locations
const getSpecialTimeDisplay = (cityId: string, time: Date): { text: string; className: string } => {
  if (cityId === 'glitch_city') {
    // Glitch city shows question marks with red pulse
    return { text: '??:??', className: 'text-red-500 animate-pulse' };
  }
  if (cityId === 'moon_base' || cityId === 'saturn_ring') {
    // Space locations show question marks with cyan color
    return { text: '??:??', className: 'text-cyan-400' };
  }
  return { text: '', className: '' };
};

// Helper: Calculate season based on month and hemisphere (lat)
// Returns detailed season info for accurate prompt generation
const getSeason = (lat: number, date: Date): { name: string; month: number; hemisphere: string } => {
  const month = date.getMonth(); // 0-11
  const isNorth = lat >= 0;
  const hemisphere = isNorth ? 'Northern' : 'Southern';
  
  if (isNorth) {
    if (month === 11 || month === 0 || month === 1) return { name: 'Winter', month, hemisphere };
    if (month >= 2 && month <= 4) return { name: 'Spring', month, hemisphere };
    if (month >= 5 && month <= 7) return { name: 'Summer', month, hemisphere };
    return { name: 'Autumn', month, hemisphere };
  } else {
    if (month === 11 || month === 0 || month === 1) return { name: 'Summer', month, hemisphere };
    if (month >= 2 && month <= 4) return { name: 'Autumn', month, hemisphere };
    if (month >= 5 && month <= 7) return { name: 'Winter', month, hemisphere };
    return { name: 'Spring', month, hemisphere };
  }
};

// Helper: Get detailed season description based on month and hemisphere
const getDetailedSeasonPrompt = (season: { name: string; month: number; hemisphere: string }): string => {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[season.month];
  
  switch (season.name) {
    case 'Spring':
      if (season.month === 2 || season.month === 8) { // March or September (early spring)
        return `early spring in ${monthName}, ${season.hemisphere} hemisphere, fresh new leaves budding on trees, cherry blossoms and magnolia flowers blooming, soft pastel colors, gentle spring breeze, clear fresh air after winter`;
      } else if (season.month === 4 || season.month === 10) { // May or November (late spring)
        return `late spring in ${monthName}, ${season.hemisphere} hemisphere, lush green foliage, colorful flowers in full bloom, warm pleasant weather, vibrant nature, birds singing`;
      }
      return `mid-spring in ${monthName}, ${season.hemisphere} hemisphere, beautiful cherry blossoms sakura, fresh green leaves, spring flowers blooming everywhere, mild warm weather, renewal of nature`;
    
    case 'Summer':
      if (season.month === 5 || season.month === 11) { // June or December (early summer)
        return `early summer in ${monthName}, ${season.hemisphere} hemisphere, bright sunny days, deep green lush trees, warm golden sunlight, clear blue skies, summer beginning`;
      } else if (season.month === 7 || season.month === 1) { // August or February (late summer)
        return `late summer in ${monthName}, ${season.hemisphere} hemisphere, intense heat, cicadas singing, deep shadows, some leaves starting to dry, end of summer atmosphere`;
      }
      return `mid-summer in ${monthName}, ${season.hemisphere} hemisphere, hot sunny weather, vibrant green vegetation, intense sunlight, deep blue sky, peak of summer`;
    
    case 'Autumn':
      if (season.month === 8 || season.month === 2) { // September or March (early autumn)
        return `early autumn in ${monthName}, ${season.hemisphere} hemisphere, leaves beginning to change color, first hints of golden and orange, cool crisp air, harvest season beginning`;
      } else if (season.month === 10 || season.month === 4) { // November or May (late autumn)
        return `late autumn in ${monthName}, ${season.hemisphere} hemisphere, most leaves fallen, bare branches visible, cold wind, grey overcast skies, approaching winter`;
      }
      return `mid-autumn in ${monthName}, ${season.hemisphere} hemisphere, beautiful golden red orange maple leaves, peak fall foliage, warm amber tones, cool pleasant weather, romantic autumn atmosphere`;
    
    case 'Winter':
      if (season.month === 11 || season.month === 5) { // December or June (early winter)
        return `early winter in ${monthName}, ${season.hemisphere} hemisphere, first snow possible, bare trees, cold crisp air, holiday season atmosphere, cozy warm lights`;
      } else if (season.month === 1 || season.month === 7) { // February or August (late winter)
        return `late winter in ${monthName}, ${season.hemisphere} hemisphere, deep cold, snow on ground, bare branches, hints of spring approaching, end of winter`;
      }
      return `mid-winter in ${monthName}, ${season.hemisphere} hemisphere, cold snowy weather, bare trees covered in frost, white snow blanket, cozy warm interior lights, winter wonderland`;
    
    default:
      return '';
  }
};

// Helper: Check if aurora borealis/australis should appear
// Conditions: high latitude (>60° or <-60°), winter season, night time (21:00-05:00)
const shouldShowAurora = (lat: number, date: Date): boolean => {
  const absLat = Math.abs(lat);
  
  // Only show aurora at high latitudes (60° and above)
  if (absLat < 60) return false;
  
  const month = date.getMonth(); // 0-11
  const hour = date.getHours();
  const isNorth = lat >= 0;
  
  // Check if it's winter season (aurora season)
  // Northern hemisphere: September(8) to March(2)
  // Southern hemisphere: March(2) to September(8)
  let isAuroraSeason = false;
  if (isNorth) {
    // Northern aurora season: Sep-Mar (months 8,9,10,11,0,1,2)
    isAuroraSeason = month >= 8 || month <= 2;
  } else {
    // Southern aurora season: Mar-Sep (months 2,3,4,5,6,7,8)
    isAuroraSeason = month >= 2 && month <= 8;
  }
  
  if (!isAuroraSeason) return false;
  
  // Check if it's night time (21:00 - 05:00)
  const isNightTime = hour >= 21 || hour <= 5;
  
  return isNightTime;
};

// Helper: Get aurora prompt based on hemisphere
const getAuroraPrompt = (lat: number): string => {
  if (lat >= 0) {
    return 'spectacular aurora borealis dancing in the night sky, green and purple northern lights, magical polar lights';
  } else {
    return 'spectacular aurora australis dancing in the night sky, green and purple southern lights, magical polar lights';
  }
};

// Helper: Get descriptive weather prompt with richer visual details
const getWeatherDescription = (code: WeatherType): string => {
  switch (code) {
    case 'Clear': return "crystal clear sky, brilliant sunshine, warm golden light casting long shadows, vibrant saturated colors, beautiful weather";
    case 'LightRain': return "gentle rain drizzle, wet glistening streets with beautiful reflections, soft grey overcast sky, romantic rainy atmosphere, umbrellas dotting the scene";
    case 'HeavyRain': return "dramatic heavy rainfall, stormy weather, deep puddles reflecting city lights, dark moody clouds, cinematic rain atmosphere, water streaming down";
    case 'Snow': return "magical snowfall, pristine white snow covering rooftops and streets, soft diffused winter light, peaceful snowy atmosphere, frost on windows";
    case 'Fog': return "mysterious fog rolling through, ethereal misty atmosphere, soft diffused lighting, dreamlike visibility, romantic hazy scene";
    case 'Windy': return "dynamic windy weather, trees swaying gracefully, leaves dancing in the air, movement and energy in the scene";
    default: return "pleasant weather";
  }
};

// Fixed background for loading/empty state (The "Blank Window" Map)
// Using a deep dark slate with a subtle inner shadow/gradient to resemble an unlit window at night
const FIXED_LOADING_BG = "bg-[#1e2330]";

const Frame: React.FC<FrameProps> = ({ frame, onClick, isExpanded, firstCityName }) => {
  const city = useMemo(() => CITIES_DB.find(c => c.id === frame.cityId), [frame.cityId]);
  const [weather, setWeather] = useState<WeatherStatus | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pixelatedUrl, setPixelatedUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  // Ambient sound effect - plays when expanded
  const { isMuted, toggleMute } = useAmbientSound({
    isExpanded: isExpanded ?? false,
    city,
    weatherCode: weather?.weatherCode ?? 'Clear',
    hour: weather?.localTime.getHours() ?? 12,
  });
  
  // Post-process image to add pixel effect
  const processPixelArt = useCallback((srcUrl: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Target size for display - use larger size for expanded view
      const targetWidth = isExpanded ? 1024 : 512;
      const targetHeight = isExpanded ? 1536 : 768;
      const pixelSize = isExpanded ? 3 : 2; // Subtler pixel effect
      
      try {
        const result = pixelateImage(img, targetWidth, targetHeight, pixelSize);
        setPixelatedUrl(result);
      } catch (e) {
        console.warn("Pixelation failed, using original", e);
        setPixelatedUrl(srcUrl);
      }
    };
    img.onerror = () => {
      setPixelatedUrl(srcUrl);
    };
    img.src = srcUrl;
  }, [isExpanded]);

  // Helper: Generate fake weather for special locations
  const getSpecialWeather = useCallback((): WeatherStatus => {
    const now = new Date();
    // Use a fictional "universal time" for special locations
    return {
      temp: city?.specialTemp ?? 0,
      weatherCode: 'Clear' as WeatherType, // Will be overridden by special rendering
      localTime: now
    };
  }, [city?.specialTemp]);

  // Sync real-time clock and weather
  useEffect(() => {
    if (!city) return;

    let isMounted = true;

    const updateWeather = async () => {
      // For special locations, use fake weather
      if (city.isSpecial) {
        if (isMounted) {
          setWeather(getSpecialWeather());
        }
        return;
      }
      
      const data = await fetchRealWeather(city.geo, city.id, city.timezoneOffset);
      if (isMounted) {
        setWeather(data);
      }
    };

    updateWeather();
    const weatherTimer = setInterval(updateWeather, 15 * 60 * 1000);
    const clockTimer = setInterval(() => {
      setWeather(prev => {
        if (!prev) return null;
        const now = new Date();
        // For special locations, just use current time
        if (city.isSpecial) {
          return { ...prev, localTime: now };
        }
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        return {
          ...prev,
          localTime: new Date(utc + (3600000 * city.timezoneOffset))
        };
      });
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(weatherTimer);
      clearInterval(clockTimer);
    };
  }, [city, getSpecialWeather]);

  // Derived state for generation stability
  const generationKeys = useMemo(() => {
    if (!city || !weather) return null;
    const timeOfDay = getTimeOfDay(weather.localTime.getHours());
    const season = getSeason(city.geo.lat, weather.localTime);
    const weatherCode = weather.weatherCode;
    return { timeOfDay, season, weatherCode };
  }, [city, weather?.weatherCode, weather ? getTimeOfDay(weather.localTime.getHours()) : null]);

  // Function to trigger generation (exposed for manual retry)
  const generateArt = useCallback(async (forceRefresh: boolean = false) => {
    if (!city || !generationKeys) return;
    
    // 如果是强制刷新（Retry 或自动刷新），清除缓存
    if (forceRefresh) {
      const { timeOfDay, season, weatherCode } = generationKeys;
      const hasAuroraForCache = !city.isSpecial && weather ? shouldShowAurora(city.geo.lat, weather.localTime) : false;
      const cacheKey = `v15_${city.id}_${timeOfDay}_${weatherCode}_${season.name}_${season.month}_aurora${hasAuroraForCache ? '1' : '0'}_special${city.isSpecial ? '1' : '0'}`;
      localStorage.removeItem(CACHE_KEY_PREFIX + cacheKey);
    }
    
    setHasError(false);
    setIsGenerating(true);
    setImageUrl(null);
    setPixelatedUrl(null);

    const { timeOfDay, season, weatherCode } = generationKeys;
    const weatherDesc = getWeatherDescription(weatherCode);
    
    // Set random loading message (special version for fictional locations)
    setLoadingMessage(getLoadingMessage(
      city.name_cn, 
      frame.nickname, 
      firstCityName,
      timeOfDay,
      weatherCode,
      city.isSpecial
    ));
    
    // Check aurora condition for cache key (not applicable for special locations)
    const hasAuroraForCache = !city.isSpecial && weather ? shouldShowAurora(city.geo.lat, weather.localTime) : false;
    const cacheKey = `v15_${city.id}_${timeOfDay}_${weatherCode}_${season.name}_${season.month}_aurora${hasAuroraForCache ? '1' : '0'}_special${city.isSpecial ? '1' : '0'}`;

    // 检查 localStorage 缓存（20分钟防抖）
    const cachedImage = getCachedImage(cacheKey);
    if (cachedImage) {
      console.log('使用 localStorage 缓存的图片');
      setImageUrl(cachedImage);
      processPixelArt(cachedImage);
      setIsGenerating(false);
      return;
    }

    try {
      // For special locations, use a completely different prompt structure
      if (city.isSpecial && city.specialWeather) {
        const specialWeatherDesc = getSpecialWeatherDescription(city.specialWeather);
        const specialPrompt = `beautiful digital painting, ${city.visual_prompt}, ${specialWeatherDesc}, atmospheric perspective, cinematic composition, rich details, sci-fi aesthetic, mysterious otherworldly atmosphere, dramatic lighting`.trim();
        
        // 直接调用 Pollinations API (前端化)
        const generatedImageUrl = await generateImageDirect(specialPrompt, 512, 768, 'flux');

        setImageUrl(generatedImageUrl);
        processPixelArt(generatedImageUrl);
        
        // 保存到 localStorage 缓存
        setCachedImage(cacheKey, generatedImageUrl);
        
        setIsGenerating(false);
        return;
      }

      // Build time-specific lighting (for normal locations)
      // Rich atmospheric descriptions for beautiful imagery
      const timeLighting = timeOfDay === 'Dawn' 
        ? 'magical golden hour dawn, soft pink and orange sunrise painting the sky, first rays of sunlight, warm golden glow on buildings, peaceful morning awakening'
        : timeOfDay === 'Morning'
        ? 'bright cheerful morning, crystal clear blue sky, fresh morning sunlight streaming through, long soft shadows, energetic start of day'
        : timeOfDay === 'Noon'
        ? 'brilliant midday sun, vibrant colors under direct sunlight, strong contrast and deep shadows, clear visibility, peak daylight'
        : timeOfDay === 'Afternoon'
        ? 'warm golden afternoon light, rich amber tones, beautiful long shadows stretching across the scene, relaxed afternoon atmosphere'
        : timeOfDay === 'Dusk'
        ? 'breathtaking sunset, dramatic orange purple pink sky, sun setting on horizon painting everything in warm colors, city lights beginning to twinkle, magical twilight moment'
        : timeOfDay === 'Evening'
        ? 'romantic blue hour, deep indigo sky after sunset, city lights glowing warmly, first stars appearing, peaceful evening atmosphere'
        : 'enchanting night scene, starry sky, warm glowing windows and neon signs, city lights twinkling, cozy nighttime atmosphere';

      // Get detailed season description
      const seasonPrompt = getDetailedSeasonPrompt(season);

      // Build weather effect for window
      const weatherWindow = weatherCode === 'LightRain' || weatherCode === 'HeavyRain' 
        ? 'raindrops on window glass creating beautiful patterns, wet reflections on streets' 
        : weatherCode === 'Snow' 
        ? 'delicate frost crystals on window edges, gentle snowflakes falling'
        : '';

      // Check for aurora conditions (high latitude + winter + night)
      const hasAurora = shouldShowAurora(city.geo.lat, weather!.localTime);
      const auroraPrompt = hasAurora ? `, ${getAuroraPrompt(city.geo.lat)}` : '';

      // Build the prompt - focus on beautiful imagery, let post-processing handle pixel effect
      // Emphasize scenic beauty, atmospheric details, and accurate seasonal representation
      const prompt = `beautiful digital painting, ${city.name_en} cityscape viewed through a window, ${city.visual_prompt}, ${timeLighting}, ${seasonPrompt}, ${weatherDesc}, ${weatherWindow}${auroraPrompt}, atmospheric perspective, rich environmental details, cinematic composition, masterful lighting, high quality artwork`.trim();

      // 负相提示词：避免多个月亮、质量问题等
      const negativePrompt = 'multiple moons, two moons, double moon, worst quality, blurry, deformed, distorted';

      // 直接调用 Pollinations API (前端化)
      const generatedUrl = await generateImageDirect(prompt, 512, 768, 'flux', negativePrompt);

      setImageUrl(generatedUrl);
      
      // Apply pixel post-processing - this handles the retro aesthetic
      processPixelArt(generatedUrl);
      
      // 保存到 localStorage 缓存
      setCachedImage(cacheKey, generatedUrl);

    } catch (e) {
      console.error("Art generation failed", e);
      setHasError(true);
    } finally {
      setIsGenerating(false);
    }
  }, [city, generationKeys, weather, frame.nickname, firstCityName]);

  // Initial Auto-Generation
  useEffect(() => {
    if (!city || !generationKeys || imageUrl || hasError || isGenerating) return;
    generateArt(false);
  }, [city, generationKeys, imageUrl, hasError, isGenerating]);

  // 30分钟自动刷新机制（同步刷新天气和图片）
  useEffect(() => {
    if (!city || !generationKeys) return;
    
    const AUTO_REFRESH_INTERVAL = 30 * 60 * 1000; // 30分钟
    
    const refreshTimer = setInterval(async () => {
      console.log('30分钟自动刷新触发：刷新天气和图片');
      
      // 先刷新天气数据
      if (!city.isSpecial) {
        try {
          const newWeather = await fetchRealWeather(city.geo, city.id, city.timezoneOffset);
          setWeather(newWeather);
          console.log('天气数据已刷新:', newWeather);
        } catch (e) {
          console.warn('天气刷新失败，继续使用旧数据', e);
        }
      }
      
      // 然后刷新图片
      generateArt(true);
    }, AUTO_REFRESH_INTERVAL);
    
    return () => clearInterval(refreshTimer);
  }, [city, generationKeys]);

  if (!city || !weather) {
    // Skeleton Loading State
    return (
        <div className="h-full w-full rounded-2xl bg-slate-800 animate-pulse border-8 border-white/10" />
    );
  }

  const hour = weather.localTime.getHours();
  const Icon = hour >= 6 && hour < 18 ? Sun : Moon;

  return (
    <motion.div
      layoutId={frame.uuid}
      onClick={(e) => {
        // Prevent click if we are clicking buttons
        if ((e.target as HTMLElement).closest('button')) return;
        if (!isExpanded && onClick) onClick();
      }}
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={isExpanded ? {} : { scale: 1.02, zIndex: 10 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      // Added isolation-isolate to create a new stacking context
      className={`relative cursor-pointer h-full w-full group isolation-isolate`}
    >
      <div 
        className={`relative h-full w-full overflow-hidden transition-all duration-700
          ${isExpanded ? 'rounded-none shadow-none' : 'rounded-2xl shadow-xl'}
          ${FIXED_LOADING_BG}
        `}
        style={!isExpanded ? {
          border: '8px solid white',
          boxSizing: 'border-box',
          boxShadow: `
            0 20px 40px -10px rgba(0,0,0,0.3),
            0 0 0 1px rgba(0,0,0,0.1)
          `
        } : {}}
      >
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-50 bg-black/20 backdrop-blur-sm px-4"
              >
                <Sparkles className="text-white/60 animate-pulse" size={isExpanded ? 48 : 32} strokeWidth={1} />
                <span className={`tracking-wide text-white/80 font-medium text-center font-serif-sc ${isExpanded ? 'text-base' : 'text-xs'}`}>{loadingMessage}</span>
              </motion.div>
            ) : hasError ? (
               <motion.div 
                key="error"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-40 bg-black/20 backdrop-blur-sm p-4 text-center"
              >
                <WifiOff className="text-white/50" size={32} />
                <p className="text-white/60 text-xs uppercase tracking-widest">Signal Lost</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    generateArt(true);
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full text-white text-xs flex items-center gap-2 transition-all"
                >
                  <RefreshCw size={12} /> Retry
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="art" 
                initial={isExpanded ? { opacity: 1 } : { opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="absolute inset-0 w-full h-full"
              >
                {(pixelatedUrl || imageUrl) && (
                  <img 
                    src={pixelatedUrl || imageUrl} 
                    alt={city.name_en}
                    className="absolute inset-0 w-full h-full object-cover block"
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}
                
                <TimeFilter hour={hour} />
                <WeatherCanvas type={weather.weatherCode} isExpanded={isExpanded} />
                <ClearSkyEffect hour={hour} weatherCode={weather.weatherCode} />
                
                {/* Overlay gradients for text readability - 夜晚减少黑色蒙层 */}
                <div className={`absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50 pointer-events-none z-30 ${hour >= 6 && hour < 18 ? 'opacity-80' : 'opacity-50'}`} />
                
                {/* Glass reflection effect - only in expanded mode */}
                {isExpanded && (
                  <>
                    {/* Main glass blur overlay */}
                    <div 
                      className="absolute inset-0 pointer-events-none z-40"
                      style={{
                        backdropFilter: 'blur(0.5px) saturate(1.1)',
                        WebkitBackdropFilter: 'blur(0.5px) saturate(1.1)'
                      }}
                    />
                    {/* Diagonal light reflection */}
                    <div 
                      className="absolute inset-0 pointer-events-none z-40 opacity-[0.12]"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 25%, transparent 75%, rgba(255,255,255,0.15) 100%)'
                      }}
                    />
                    {/* Horizontal light band - simulates glass refraction */}
                    <div 
                      className="absolute inset-0 pointer-events-none z-40 opacity-[0.06]"
                      style={{
                        background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.3) 15%, transparent 30%, transparent 70%, rgba(255,255,255,0.2) 85%, transparent 100%)'
                      }}
                    />
                    {/* Subtle window frame inner shadow */}
                    <div 
                      className="absolute inset-0 pointer-events-none z-40"
                      style={{
                        boxShadow: 'inset 0 0 150px rgba(0,0,0,0.4), inset 0 0 50px rgba(0,0,0,0.25), inset 0 2px 4px rgba(255,255,255,0.1)'
                      }}
                    />
                    {/* Glass edge highlight - top */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none z-40 opacity-20"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 20%, rgba(255,255,255,0.8) 80%, transparent 100%)'
                      }}
                    />
                    {/* Glass edge highlight - left */}
                    <div 
                      className="absolute top-0 left-0 bottom-0 w-[2px] pointer-events-none z-40 opacity-15"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 50%, transparent 100%)'
                      }}
                    />
                    {/* Glass texture overlay */}
                    <div 
                      className="absolute inset-0 pointer-events-none z-40 opacity-[0.025]"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
                      }}
                    />
                    {/* Top-left corner highlight - enhanced */}
                    <div 
                      className="absolute top-0 left-0 w-2/5 h-1/3 pointer-events-none z-40 opacity-[0.1]"
                      style={{
                        background: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 30%, transparent 70%)'
                      }}
                    />
                    {/* Bottom-right subtle reflection */}
                    <div 
                      className="absolute bottom-0 right-0 w-1/4 h-1/5 pointer-events-none z-40 opacity-[0.04]"
                      style={{
                        background: 'radial-gradient(ellipse at bottom right, rgba(255,255,255,0.6) 0%, transparent 70%)'
                      }}
                    />
                  </>
                )}
                
                {/* Glitch effect overlay for special locations */}
                {city.isSpecial && city.specialWeather === 'Glitch' && (
                  <div className="absolute inset-0 pointer-events-none z-45 glitch-overlay" />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Signal interference effect for special locations */}
          {city.isSpecial && (
            <div 
              className="absolute inset-0 pointer-events-none z-35 opacity-30"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(0, 255, 255, 0.03) 2px,
                  rgba(0, 255, 255, 0.03) 4px
                )`,
                animation: 'scanlines 8s linear infinite'
              }}
            />
          )}

          {/* UI Overlay - Enlarged elements for better readability */}
          <div className={`absolute inset-x-0 flex justify-between items-start z-50 pointer-events-none ${isExpanded ? 'top-4 px-4 sm:top-10 sm:px-12' : 'top-5 px-5'}`}>
            <div className="flex flex-col">
              {/* Time Display - Significantly Larger */}
              {(() => {
                const specialTime = city.isSpecial ? getSpecialTimeDisplay(city.id, weather.localTime) : null;
                if (specialTime && specialTime.text) {
                  return (
                    <span className={`font-mono tabular-nums tracking-tighter drop-shadow-md ${specialTime.className} ${isExpanded ? 'text-xl sm:text-4xl' : 'text-xl font-medium'}`}>
                      {specialTime.text}
                    </span>
                  );
                }
                return (
                  <span className={`font-mono tabular-nums tracking-tighter drop-shadow-md ${city.isSpecial ? 'text-cyan-400' : 'text-white/95'} ${isExpanded ? 'text-xl sm:text-4xl' : 'text-xl font-medium'}`}>
                    {formatTime(weather.localTime)}
                  </span>
                );
              })()}
            </div>
            <div className="flex flex-col items-end">
               <div className="flex items-center gap-1 sm:gap-2">
                  {/* Temperature Display - with special neon colors */}
                  <span className={`font-mono drop-shadow-md ${getSpecialTempColor(weather.temp, city.isSpecial)} ${isExpanded ? 'text-xl sm:text-4xl' : 'text-2xl font-light'}`}>
                    {city.isSpecial && weather.temp === 404 ? 'ERR' : weather.temp}°
                  </span>
                  {/* Weather Icon - Larger (hide for special locations) */}
                  {!city.isSpecial && <Icon size={isExpanded ? 16 : 20} className="text-white/90 drop-shadow-md sm:w-6 sm:h-6" />}
               </div>
               {/* Sound Mute Button - only show in expanded mode */}
               {isExpanded && (
                 <button
                   onClick={(e) => {
                     e.stopPropagation();
                     toggleMute();
                   }}
                   className="mt-2 sm:mt-3 p-1.5 sm:p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all pointer-events-auto"
                   title={isMuted ? '开启声音' : '静音'}
                 >
                   {isMuted ? (
                     <VolumeX size={16} className="text-white/60 sm:w-5 sm:h-5" />
                   ) : (
                     <Volume2 size={16} className="text-white/80 sm:w-5 sm:h-5" />
                   )}
                 </button>
               )}
            </div>
          </div>

          <div className={`absolute inset-x-0 bottom-0 z-50 pointer-events-none
            ${isExpanded ? 'p-4 sm:p-20' : 'p-6 pb-7'}
          `}>
            <div className="flex flex-col items-center text-center">
              {/* Nickname - Larger */}
              <span className={`tracking-[0.3em] uppercase mb-1 font-medium drop-shadow-md ${city.isSpecial ? 'text-cyan-400/80' : 'text-white/70'} ${isExpanded ? 'text-[10px] sm:text-sm' : 'text-[10px]'}`}>
                {frame.nickname}
              </span>
              
              {!isExpanded && (
                <>
                  <h2 className={`font-serif-sc tracking-widest shadow-black drop-shadow-lg text-3xl ${city.isSpecial ? 'text-cyan-300' : 'text-white'}`}>
                    {city.name_cn}
                  </h2>
                  {/* English Name Added */}
                  <h3 className={`text-[10px] tracking-[0.2em] font-sans uppercase mt-1 drop-shadow-md ${city.isSpecial ? 'text-cyan-400/60' : 'text-white/50'}`}>
                    {city.name_en}
                  </h3>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* CSS for glitch animation */}
      <style>{`
        @keyframes scanlines {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }
        
        .glitch-overlay {
          background: linear-gradient(
            transparent 0%,
            rgba(255, 0, 255, 0.05) 50%,
            transparent 100%
          );
          animation: glitch 0.3s infinite;
        }
        
        @keyframes glitch {
          0% { transform: translateX(0); opacity: 0.3; }
          20% { transform: translateX(-2px); opacity: 0.5; }
          40% { transform: translateX(2px); opacity: 0.3; }
          60% { transform: translateX(-1px); opacity: 0.4; }
          80% { transform: translateX(1px); opacity: 0.3; }
          100% { transform: translateX(0); opacity: 0.3; }
        }
      `}</style>
    </motion.div>
  );
};

export default Frame;
