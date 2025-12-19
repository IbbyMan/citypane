import React, { useEffect, useRef } from 'react';

interface ClearSkyEffectProps {
  hour: number;
  weatherCode: string;
}

/**
 * 晴天视觉效果滤镜
 * - 夜晚晴天：轻微星星闪烁
 * - 白天晴天：轻微阳光闪烁
 */
const ClearSkyEffect: React.FC<ClearSkyEffectProps> = ({ hour, weatherCode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 只在晴天时显示效果
  const isClear = weatherCode === 'Clear';
  const isNight = hour < 4 || hour >= 21; // 21:00-4:00
  const isDaytime = hour >= 10 && hour < 15; // 10:00-15:00

  useEffect(() => {
    if (!isClear) return;
    
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

    if (isNight) {
      // 夜晚星星闪烁效果
      const stars: Array<{
        x: number;
        y: number;
        size: number;
        opacity: number;
        twinkleSpeed: number;
        twinklePhase: number;
      }> = [];

      // 只在画面上半部分生成星星（天空区域）
      for (let i = 0; i < 15; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.5, // 只在上半部分
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.4 + 0.2,
          twinkleSpeed: Math.random() * 0.03 + 0.01,
          twinklePhase: Math.random() * Math.PI * 2
        });
      }

      const animateStars = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        stars.forEach(star => {
          star.twinklePhase += star.twinkleSpeed;
          const currentOpacity = star.opacity * (0.5 + 0.5 * Math.sin(star.twinklePhase));

          // 绘制星星光芒
          ctx.save();
          ctx.globalAlpha = currentOpacity;
          
          // 星星核心
          ctx.beginPath();
          ctx.fillStyle = '#FFFFFF';
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();

          // 十字光芒
          ctx.strokeStyle = `rgba(255, 255, 255, ${currentOpacity * 0.5})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(star.x - star.size * 2, star.y);
          ctx.lineTo(star.x + star.size * 2, star.y);
          ctx.moveTo(star.x, star.y - star.size * 2);
          ctx.lineTo(star.x, star.y + star.size * 2);
          ctx.stroke();

          ctx.restore();
        });

        animationId = requestAnimationFrame(animateStars);
      };

      animateStars();
    } else if (isDaytime) {
      // 白天阳光闪烁效果
      const sunbeams: Array<{
        x: number;
        y: number;
        size: number;
        opacity: number;
        flickerSpeed: number;
        flickerPhase: number;
      }> = [];

      // 在画面上部和边缘生成光斑
      for (let i = 0; i < 8; i++) {
        sunbeams.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.4,
          size: Math.random() * 30 + 20,
          opacity: Math.random() * 0.08 + 0.03,
          flickerSpeed: Math.random() * 0.02 + 0.005,
          flickerPhase: Math.random() * Math.PI * 2
        });
      }

      const animateSunbeams = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        sunbeams.forEach(beam => {
          beam.flickerPhase += beam.flickerSpeed;
          const currentOpacity = beam.opacity * (0.6 + 0.4 * Math.sin(beam.flickerPhase));

          // 绘制柔和的光斑
          const gradient = ctx.createRadialGradient(
            beam.x, beam.y, 0,
            beam.x, beam.y, beam.size
          );
          gradient.addColorStop(0, `rgba(255, 250, 220, ${currentOpacity})`);
          gradient.addColorStop(0.5, `rgba(255, 245, 200, ${currentOpacity * 0.5})`);
          gradient.addColorStop(1, 'rgba(255, 240, 180, 0)');

          ctx.beginPath();
          ctx.fillStyle = gradient;
          ctx.arc(beam.x, beam.y, beam.size, 0, Math.PI * 2);
          ctx.fill();
        });

        animationId = requestAnimationFrame(animateSunbeams);
      };

      animateSunbeams();
    }

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [isClear, isNight, isDaytime]);

  if (!isClear) return null;

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-25" 
      style={{ mixBlendMode: isNight ? 'screen' : 'overlay' }}
    />
  );
};

export default ClearSkyEffect;
