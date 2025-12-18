import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { CityData, WeatherType } from '../types';
import { getSoundByScene } from './soundSelector';

// Default volume - keep it subtle as ambient background
const DEFAULT_VOLUME = 0.15;
// Fade duration in milliseconds
const FADE_DURATION = 800;

interface UseAmbientSoundProps {
  isExpanded: boolean;
  city: CityData | undefined;
  weatherCode: WeatherType;
  hour: number;
}

interface UseAmbientSoundReturn {
  isMuted: boolean;
  toggleMute: () => void;
}

/**
 * Hook to manage ambient sound playback based on scene context
 * Plays automatically when isExpanded is true, stops when false
 */
export const useAmbientSound = ({
  isExpanded,
  city,
  weatherCode,
  hour,
}: UseAmbientSoundProps): UseAmbientSoundReturn => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const isPlayingRef = useRef(false);
  const currentSoundSrcRef = useRef<string | null>(null);

  // Memoize the sound source to prevent unnecessary recalculations
  const soundSrc = useMemo(() => {
    if (!city) return null;
    return getSoundByScene({ city, weatherCode, hour });
  }, [city, weatherCode, hour]);

  // Cleanup fade interval
  const clearFadeInterval = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  // Stop audio immediately (without triggering re-renders)
  const stopAudioImmediate = useCallback(() => {
    clearFadeInterval();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    isPlayingRef.current = false;
    currentSoundSrcRef.current = null;
  }, [clearFadeInterval]);

  // Fade in audio
  const fadeIn = useCallback((audio: HTMLAudioElement, targetVolume: number) => {
    clearFadeInterval();
    audio.volume = 0;
    audio.play().catch(console.warn);
    isPlayingRef.current = true;

    const step = targetVolume / (FADE_DURATION / 50);
    fadeIntervalRef.current = window.setInterval(() => {
      if (audio.volume + step >= targetVolume) {
        audio.volume = targetVolume;
        clearFadeInterval();
      } else {
        audio.volume = Math.min(audio.volume + step, targetVolume);
      }
    }, 50);
  }, [clearFadeInterval]);

  // Fade out and stop audio
  const fadeOutAndStop = useCallback(() => {
    clearFadeInterval();
    const audio = audioRef.current;
    if (!audio) return;

    const startVolume = audio.volume;
    if (startVolume <= 0) {
      stopAudioImmediate();
      return;
    }

    const step = startVolume / (FADE_DURATION / 50);
    fadeIntervalRef.current = window.setInterval(() => {
      if (!audioRef.current) {
        clearFadeInterval();
        return;
      }
      if (audioRef.current.volume - step <= 0) {
        stopAudioImmediate();
      } else {
        audioRef.current.volume = Math.max(audioRef.current.volume - step, 0);
      }
    }, 50);
  }, [clearFadeInterval, stopAudioImmediate]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (audioRef.current) {
        audioRef.current.muted = newMuted;
      }
      return newMuted;
    });
  }, []);

  // Effect to handle isExpanded changes - start/stop playback
  useEffect(() => {
    if (!isExpanded || !soundSrc) {
      // Not expanded or no sound - stop playback
      if (isPlayingRef.current) {
        fadeOutAndStop();
      }
      return;
    }

    // Check if we need to change the sound
    const expectedSrc = new URL(soundSrc, window.location.origin).href;
    
    // If same sound is already playing, do nothing
    if (currentSoundSrcRef.current === expectedSrc && isPlayingRef.current && audioRef.current) {
      return;
    }

    // If different sound is playing, stop it first
    if (audioRef.current && currentSoundSrcRef.current !== expectedSrc) {
      stopAudioImmediate();
    }

    // Create and play new audio
    if (!audioRef.current) {
      const audio = new Audio(soundSrc);
      audio.loop = true;
      audio.muted = isMuted;
      audioRef.current = audio;
      currentSoundSrcRef.current = expectedSrc;
      fadeIn(audio, DEFAULT_VOLUME);
    }
  }, [isExpanded, soundSrc, fadeIn, fadeOutAndStop, stopAudioImmediate, isMuted]);

  // Cleanup on unmount - ensure audio is fully stopped
  useEffect(() => {
    return () => {
      clearFadeInterval();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, [clearFadeInterval]);

  return { isMuted, toggleMute };
};

export default useAmbientSound;
