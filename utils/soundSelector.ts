import { CityData, WeatherType } from '../types';

// Sound file paths
const SOUNDS = {
  special: '/bgm-sound/special-sound.mp3',
  windSnow: '/bgm-sound/wind-snow-sound.mp3',
  rain: '/bgm-sound/rain-sound.mp3',
  city: '/bgm-sound/city-sound.mp3',
  country: '/bgm-sound/country.mp3',
  night: '/bgm-sound/night-sound.mp3',
} as const;

// Large cities list (population > 5 million or major metropolitan areas)
const LARGE_CITIES = new Set([
  'beijing', 'shanghai', 'chongqing', 'guangzhou', 'shenzhen', 'tianjin',
  'hong-kong', 'tokyo', 'osaka', 'seoul', 'bangkok', 'singapore',
  'kuala-lumpur', 'london', 'paris', 'berlin', 'rome', 'new-york',
  'los-angeles', 'chicago', 'mexico-city', 'buenos-aires', 'rio',
  'sydney', 'melbourne', 'cairo', 'istanbul', 'moscow', 'dubai',
  'mumbai', 'delhi', 'jakarta', 'manila', 'hanoi', 'ho-chi-minh',
  'taipei', 'nanjing', 'wuhan', 'chengdu', 'hangzhou', 'xian',
]);

// Polar regions (latitude > 60 or < -60)
const isPolarRegion = (lat: number): boolean => Math.abs(lat) >= 60;

// Check if it's night time (20:00 - 06:00)
const isNightTime = (hour: number): boolean => hour >= 20 || hour < 6;

// Check if weather is wind/snow related
const isWindSnowWeather = (weatherCode: WeatherType): boolean => {
  return weatherCode === 'Snow' || weatherCode === 'Windy';
};

// Check if weather is rain related
const isRainWeather = (weatherCode: WeatherType): boolean => {
  return weatherCode === 'LightRain' || weatherCode === 'HeavyRain';
};

export interface SoundContext {
  city: CityData;
  weatherCode: WeatherType;
  hour: number; // 0-23
}

/**
 * Get the appropriate ambient sound based on scene context
 * Priority (high to low):
 * 1. Special locations -> special-sound.mp3
 * 2. Wind/Snow weather OR Polar regions -> wind-snow-sound.mp3
 * 3. Rain weather -> rain-sound.mp3
 * 4. Large city daytime -> city-sound.mp3
 * 5. Small city daytime -> country.mp3
 * 6. Night fallback -> night-sound.mp3
 */
export const getSoundByScene = (context: SoundContext): string => {
  const { city, weatherCode, hour } = context;

  // 1. Special locations (moon_base, saturn_ring, deep_sea, glitch_city)
  if (city.isSpecial) {
    return SOUNDS.special;
  }

  // 2. Wind/Snow weather OR Polar regions (Arctic/Antarctic)
  if (isWindSnowWeather(weatherCode) || isPolarRegion(city.geo.lat)) {
    return SOUNDS.windSnow;
  }

  // 3. Rain weather
  if (isRainWeather(weatherCode)) {
    return SOUNDS.rain;
  }

  // 4 & 5. Daytime city sounds (06:00 - 20:00)
  if (!isNightTime(hour)) {
    if (LARGE_CITIES.has(city.id)) {
      return SOUNDS.city;
    }
    return SOUNDS.country;
  }

  // 6. Night fallback
  return SOUNDS.night;
};

export default getSoundByScene;
