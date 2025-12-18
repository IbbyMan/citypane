
import React from 'react';
import { getTimeOfDay } from '../utils/weather';

interface TimeFilterProps {
  hour: number;
}

const TimeFilter: React.FC<TimeFilterProps> = ({ hour }) => {
  const timeOfDay = getTimeOfDay(hour);

  const getStyle = () => {
    switch (timeOfDay) {
      case 'Morning':
        // Soft, cool, slightly hazy, morning dew feel
        return {
          filter: 'brightness(105%) contrast(90%) sepia(10%) hue-rotate(-10deg)',
          background: 'linear-gradient(to bottom, rgba(160, 210, 255, 0.2), rgba(255, 200, 180, 0.1))'
        };
      case 'Noon':
        // Bright, sharp, high saturation, clear
        return {
          filter: 'brightness(110%) contrast(105%) saturate(110%)',
          background: 'rgba(255, 255, 240, 0.02)'
        };
      case 'Sunset':
        // Warm, golden, nostalgic, dramatic shadows
        return {
          filter: 'brightness(95%) contrast(110%) sepia(35%) saturate(120%)',
          background: 'linear-gradient(to bottom, rgba(60, 30, 80, 0.1), rgba(255, 140, 0, 0.25))'
        };
      case 'Night':
        // Dark, cool blue tint, low saturation for colors but high contrast for lights
        return {
          filter: 'brightness(60%) contrast(125%) grayscale(40%) hue-rotate(15deg)',
          background: 'rgba(5, 10, 30, 0.6)'
        };
      default:
        return {};
    }
  };

  const style = getStyle();

  return (
    <div 
      className="absolute inset-0 z-10 transition-all duration-1000 pointer-events-none"
      style={{ 
        backdropFilter: style.filter,
        background: style.background
      }} 
    />
  );
};

export default TimeFilter;
