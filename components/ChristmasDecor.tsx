import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChristmasDecorProps {
  enabled?: boolean;
}

const ChristmasDecor: React.FC<ChristmasDecorProps> = ({ enabled = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showSanta, setShowSanta] = useState(false);

  // 雪花效果
  useEffect(() => {
    if (!enabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    window.addEventListener('resize', resize);
    resize();

    // 雪花粒子
    class Snowflake {
      x: number = 0;
      y: number = 0;
      size: number = 0;
      speed: number = 0;
      wind: number = 0;
      opacity: number = 0;
      wobble: number = 0;
      wobbleSpeed: number = 0;

      constructor() {
        this.reset();
        this.y = Math.random() * canvas.height; // 初始随机分布
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = -10;
        this.size = Math.random() * 3 + 1;
        this.speed = Math.random() * 0.6 + 0.2;
        this.wind = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.6 + 0.3;
        this.wobble = 0;
        this.wobbleSpeed = Math.random() * 0.01 + 0.005;
      }

      update() {
        this.y += this.speed;
        this.wobble += this.wobbleSpeed;
        this.x += this.wind + Math.sin(this.wobble) * 0.5;
        
        if (this.y > canvas.height + 10) {
          this.reset();
        }
        if (this.x < -10) this.x = canvas.width + 10;
        if (this.x > canvas.width + 10) this.x = -10;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const snowflakes = Array.from({ length: 100 }, () => new Snowflake());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      snowflakes.forEach(flake => {
        flake.update();
        flake.draw();
      });
      
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [enabled]);

  // 圣诞老人定时穿越
  useEffect(() => {
    if (!enabled) return;
    
    // 初次延迟 3-5 秒后出现
    const initialDelay = Math.random() * 2000 + 3000;
    
    const triggerSanta = () => {
      setShowSanta(true);
      
      // 15秒后隐藏（与动画时长匹配）
      setTimeout(() => {
        setShowSanta(false);
      }, 15000);
    };

    let interval: ReturnType<typeof setInterval>;
    
    const initialTimer = setTimeout(() => {
      triggerSanta();
      
      // 之后每 45-60 秒出现一次
      interval = setInterval(() => {
        triggerSanta();
      }, Math.random() * 15000 + 45000);
    }, initialDelay);

    return () => {
      clearTimeout(initialTimer);
      if (interval) clearInterval(interval);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 雪花 Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-10" />

      {/* 圣诞老人穿越动画 */}
      <AnimatePresence>
        {showSanta && (
          <motion.div
            initial={{ 
              x: '-300px',
              y: '15vh'
            }}
            animate={{ 
              x: 'calc(100vw + 300px)',
              y: ['15vh', '12vh', '18vh', '14vh', '16vh']
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              x: { duration: 15, ease: 'linear' },
              y: { duration: 15, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 1] }
            }}
            className="absolute z-30"
          >
            <img 
              src="/extra-docu/chrismas1.webp" 
              alt="Santa" 
              className="h-24 w-auto object-contain"
              style={{ imageRendering: 'auto', opacity: 0.6 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部雪地 */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-8 z-5"
        style={{
          background: 'linear-gradient(to top, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 50%, transparent 100%)'
        }}
      />
    </div>
  );
};

export default ChristmasDecor;
