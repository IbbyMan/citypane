
import React, { useState, useEffect } from 'react';
import { UserFrame } from './types';
import { STORAGE_KEYS, CITIES_DB } from './constants';
import Onboarding from './components/Onboarding';
import Gallery from './components/Gallery';

const MAX_FRAMES = 12; // Maximum number of frames allowed

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<{ name: string; homeCityId: string } | null>(null);
  const [frames, setFrames] = useState<UserFrame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    const savedFrames = localStorage.getItem(STORAGE_KEYS.USER_FRAMES);

    if (savedProfile) setUserProfile(JSON.parse(savedProfile));
    
    if (savedFrames) {
      try {
        const parsedFrames = JSON.parse(savedFrames) as UserFrame[];
        // Filter out frames where the city ID no longer exists in the DB (prevents crashes on updates)
        const validFrames = parsedFrames.filter(f => CITIES_DB.some(c => c.id === f.cityId));
        setFrames(validFrames);
      } catch (e) {
        console.error("Failed to parse frames", e);
      }
    }
    setLoading(false);
  }, []);

  const handleOnboardingComplete = (name: string, cityId: string) => {
    const profile = { name, homeCityId: cityId };
    const initialFrame: UserFrame = {
      uuid: Math.random().toString(36).substr(2, 9),
      type: 'self',
      nickname: name,
      cityId,
      createdAt: Date.now()
    };
    
    setUserProfile(profile);
    setFrames([initialFrame]);
    
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    localStorage.setItem(STORAGE_KEYS.USER_FRAMES, JSON.stringify([initialFrame]));
  };

  const handleAddFrame = (nickname: string, cityId: string) => {
    setFrames(prev => {
      if (prev.length >= MAX_FRAMES) {
        return prev; // Prevent adding if at max
      }
      const newFrame: UserFrame = {
        uuid: Math.random().toString(36).substr(2, 9),
        type: 'connection',
        nickname,
        cityId,
        createdAt: Date.now()
      };
      const updatedFrames = [...prev, newFrame];
      localStorage.setItem(STORAGE_KEYS.USER_FRAMES, JSON.stringify(updatedFrames));
      return updatedFrames;
    });
  };

  const handleDeleteFrame = (uuid: string) => {
    setFrames(prev => {
      const updatedFrames = prev.filter(f => f.uuid !== uuid);
      localStorage.setItem(STORAGE_KEYS.USER_FRAMES, JSON.stringify(updatedFrames));
      return updatedFrames;
    });
  };

  if (loading) return null;

  return (
    <div className="min-h-screen">
      {!userProfile ? (
        <Onboarding 
          onComplete={handleOnboardingComplete} 
        />
      ) : (
        <Gallery 
          frames={frames} 
          onAdd={handleAddFrame}
          onDelete={handleDeleteFrame}
          maxFrames={MAX_FRAMES}
        />
      )}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[999] bg-[url('/textures/60-lines.png')]" />
    </div>
  );
};

export default App;
