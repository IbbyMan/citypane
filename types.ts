
export type WeatherType = 'Clear' | 'LightRain' | 'HeavyRain' | 'Snow' | 'Fog' | 'Windy';

// Special weather types for fictional locations
export type SpecialWeatherType = 'Vacuum' | 'DeepSea' | 'GasGiant' | 'Glitch';

export interface GeoLocation {
  lat: number;
  lon: number;
}

export interface CityData {
  id: string;
  name_en: string;
  name_cn: string;
  series_num: string;
  visual_prompt: string;
  quote: string; // New field for unique city description
  geo: GeoLocation;
  timezoneOffset: number;
  isSpecial?: boolean; // For fictional/special locations
  specialWeather?: SpecialWeatherType; // Special weather type
  specialTemp?: number; // Fixed temperature for special locations
}

export interface UserFrame {
  uuid: string;
  type: 'self' | 'connection';
  nickname: string;
  cityId: string;
  createdAt: number;
}

export interface WeatherStatus {
  temp: number;
  weatherCode: WeatherType;
  localTime: Date;
}

export interface AvatarConfig {
  gender: 'male' | 'female';
  bottom: string;
  top: string;
  hair: string;
  accessory: string;
  prop: string;
}
