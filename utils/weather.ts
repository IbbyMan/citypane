
import { WeatherType, WeatherStatus, GeoLocation } from '../types';

/**
 * Maps Open-Meteo WMO Weather Interpretation Codes and wind speed to our internal WeatherType.
 * Reference: https://open-meteo.com/en/docs
 */
const mapWmoToWeatherType = (code: number, windSpeed: number): WeatherType => {
  // Priority 1: Extreme weather (Heavy Rain / Snow)
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 85 && code <= 86) return 'Snow';
  if (code === 63 || code === 65 || code === 81 || code === 82 || (code >= 95 && code <= 99)) return 'HeavyRain';
  
  // Priority 2: Light Rain
  if (code >= 51 && code <= 61 || code === 66 || code === 67 || code === 80) return 'LightRain';

  // Priority 3: Wind (if speed > 25km/h and no heavy precipitation)
  if (windSpeed > 25) return 'Windy';

  // Priority 4: Fog and Clear
  if (code === 45 || code === 48) return 'Fog';
  return 'Clear';
};

export const fetchRealWeather = async (geo: GeoLocation, cityId: string, offset: number): Promise<WeatherStatus> => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather fetch failed');
    
    const data = await response.json();
    const current = data.current;

    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const localTime = new Date(utc + (3600000 * offset));

    return {
      temp: Math.round(current.temperature_2m),
      weatherCode: mapWmoToWeatherType(current.weather_code, current.wind_speed_10m),
      localTime
    };
  } catch (error) {
    console.error('Failed to fetch real weather, falling back to simulation', error);
    return getSimulatedWeather(cityId, geo, offset);
  }
};

export const getSimulatedWeather = (cityId: string, geo: GeoLocation, offset: number): WeatherStatus => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const localTime = new Date(utc + (3600000 * offset));
  const dayOfYear = Math.floor((localTime.getTime() - new Date(localTime.getFullYear(), 0, 0).getTime()) / 86400000);
  const seedString = `${cityId}-${dayOfYear}`;
  const seed = seedString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const weatherOptions: WeatherType[] = ['Clear', 'Clear', 'LightRain', 'HeavyRain', 'Windy', 'Fog', 'Snow'];
  let weatherCode = weatherOptions[seed % weatherOptions.length];
  
  const lat = Math.abs(geo.lat);
  if (weatherCode === 'Snow' && lat < 30) weatherCode = 'HeavyRain';

  const hour = localTime.getHours();
  const timeVariation = Math.sin((hour - 9) / 24 * 2 * Math.PI) * 5;
  const baseTempByLat = 30 - (lat * 0.8);
  const seasonVariation = Math.cos((dayOfYear - 172) / 365 * 2 * Math.PI) * 10;
  const temp = Math.floor(baseTempByLat + seasonVariation + timeVariation);

  return {
    temp,
    weatherCode,
    localTime
  };
};

export const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit', 
    hour12: false 
  });
};

export const getTimeOfDay = (hour: number) => {
  if (hour >= 5 && hour < 7) return 'Dawn';      // 5:00-6:59 黎明
  if (hour >= 7 && hour < 10) return 'Morning';  // 7:00-9:59 早晨
  if (hour >= 10 && hour < 14) return 'Noon';    // 10:00-13:59 正午
  if (hour >= 14 && hour < 17) return 'Afternoon'; // 14:00-16:59 下午
  if (hour >= 17 && hour < 19) return 'Dusk';    // 17:00-18:59 黄昏
  if (hour >= 19 && hour < 21) return 'Evening'; // 19:00-20:59 傍晚
  return 'Night'; // 21:00-4:59 夜晚
};
