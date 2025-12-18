
import React from 'react';
import { motion } from 'framer-motion';
import { AvatarConfig } from '../types';

interface AvatarProps {
  config: AvatarConfig;
  size?: 'sm' | 'lg';
}

const Avatar: React.FC<AvatarProps> = ({ config, size = 'sm' }) => {
  // Base assets URL - local assets
  const BASE_PATH = '/avatars';
  
  // Since we don't have actual external assets in this demo environment,
  // we use a stylized approach where each part is a specific layered PNG logic.
  // Note: imageRendering: 'pixelated' is key for the sharp Lo-Fi look.
  
  const scale = size === 'lg' ? 2 : 1.2;

  // Layer list in Z-order
  const layers = [
    `body_${config.gender}`,
    `bottom_${config.bottom}`,
    `top_${config.top}`,
    `hair_${config.hair}`,
    `acc_${config.accessory}`,
    `prop_${config.prop}`,
  ].filter(l => !l.includes('none'));

  return (
    <motion.div
      animate={{ y: [0, -2, 0] }}
      transition={{ 
        duration: 3, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
      className="relative pointer-events-none select-none"
      style={{ 
        width: 128 * scale, 
        height: 128 * scale,
        imageRendering: 'pixelated'
      }}
    >
      {/* 
        In a production environment, we would render multiple <img> tags or a 
        canvas with layers. For this prompt, we simulate the visual result.
      */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Simplified visual representation of the pixel character (Back-view) */}
        <div className="relative w-full h-full">
           {/* Body/Clothes Mockup using CSS for visual feedback without external assets */}
           <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[70%] rounded-t-xl bg-neutral-800 border-2 border-black/40`} style={{ backgroundColor: config.top === 'sweater' ? '#4a3728' : '#2d3436' }}>
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-12 h-12 bg-[#e0ac69] rounded-full border-2 border-black/40">
                 {/* Hair */}
                 <div className="absolute -top-2 -inset-x-2 h-8 bg-[#2d3436] rounded-t-full" />
              </div>
           </div>
           
           {/* If Coffee prop */}
           {config.prop === 'coffee' && (
             <div className="absolute bottom-4 right-4 w-4 h-6 bg-white/80 rounded-sm border border-black/20" />
           )}
        </div>
      </div>
      
      {/* Shadow on the sill */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-2 bg-black/40 blur-md rounded-full -z-10" />
    </motion.div>
  );
};

export default Avatar;
