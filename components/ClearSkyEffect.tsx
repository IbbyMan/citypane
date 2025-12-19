import React, { useEffect, useRef } from 'react';

interface ClearSkyEffectProps {
  hour: number;
  weatherCode: string;
}

/**
 * 晴天视觉效果滤镜
 * - 夜晚晴天：星星闪烁 + 偶尔流星
 * - 白天晴天：阳光闪烁 + 光斑移动
 */
const ClearSkyEffect: React.FC<ClearSkyEffectProps> = ({ hour, weatherCode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 只在晴天时显示效果
  const isClear = weatherCode === 'Clear';
  const isNight = hour < 5 || hour >= 20; // 20:00-5:00
  const isDaytime = hour >= 8 && hour < 17; // 8:00-17:00

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
      // 夜晚星星闪烁效果 - 增强版
      const stars: Array<{
        x: number;
        y: number;
        size: number;
        opacity: number;
        twinkleSpeed: number;
        twinklePhase: number;
        color: string;
      }> = [];

      // 流星
      let meteor: {
        x: number;
        y: number;
        speed: number;
        length: number;
        opacity: number;
        active: boolean;
      } | null = null;

      // 只在画面上半部分生成星星（天空区域）- 增加数量
      for (let i = 0; i < 30; i++) {
        const colors = ['#FFFFFF', '#FFE4B5', '#ADD8E6', '#FFF8DC'];
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.6, // 上60%区域
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.5 + 0.3,
          twinkleSpeed: Math.random() * 0.05 + 0.02,
          twinklePhase: Math.random() * Math.PI * 2,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }

      const spawnMeteor = () => {
        meteor = {
          x: Math.random() * canvas.width * 0.8 + canvas.width * 0.1,
          y: Math.random() * canvas.height * 0.2,
          speed: Math.random() * 8 + 6,
          length: Math.random() * 60 + 40,
          opacity: 1,
          active: true
        };
      };

      // 随机生成流星
      const meteorInterval = setInterval(() => {
        if (!meteor || !meteor.active) {
          if (Math.random() < 0.3) spawnMeteor();
        }
      }, 3000);

      const animateStars = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        stars.forEach(star => {
          star.twinklePhase += star.twinkleSpeed;
          const currentOpacity = star.opacity * (0.4 + 0.6 * Math.sin(star.twinklePhase));

          // 绘制星星光芒
          ctx.save();
          ctx.globalAlpha = currentOpacity;
          
          // 星星核心
          ctx.beginPath();
          ctx.fillStyle = star.color;
          ctx.shadowColor = star.color;
          ctx.shadowBlur = star.size * 3;
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();

          // 十字光芒 - 更明显
          if (star.size > 1) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${currentOpacity * 0.6})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            const rayLength = star.size * 4;
            ctx.moveTo(star.x - rayLength, star.y);
            ctx.lineTo(star.x + rayLength, star.y);
            ctx.moveTo(star.x, star.y - rayLength);
            ctx.lineTo(star.x, star.y + rayLength);
            ctx.stroke();
          }

          ctx.restore();
        });

        // 绘制流星
        if (meteor && meteor.active) {
          ctx.save();
          const gradient = ctx.createLinearGradient(
            meteor.x, meteor.y,
            meteor.x + meteor.length, meteor.y + meteor.length * 0.5
          );
          gradient.addColorStop(0, `rgba(255, 255, 255, ${meteor.opacity})`);
          gradient.addColorStop(0.3, `rgba(255, 250, 220, ${meteor.opacity * 0.8})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(meteor.x, meteor.y);
          ctx.lineTo(meteor.x + meteor.length, meteor.y + meteor.length * 0.5);
          ctx.stroke();

          // 流星头部光点
          ctx.fillStyle = `rgba(255, 255, 255, ${meteor.opacity})`;
          ctx.shadowColor = '#FFFFFF';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(meteor.x, meteor.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // 更新流星位置
          meteor.x -= meteor.speed;
          meteor.y += meteor.speed * 0.5;
          meteor.opacity -= 0.015;
          
          if (meteor.opacity <= 0 || meteor.x < -50 || meteor.y > canvas.height) {
            meteor.active = false;
          }
        }

        animationId = requestAnimationFrame(animateStars);
      };

      animateStars();

      return () => {
        clearInterval(meteorInterval);
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', resize);
      };
    } else if (isDaytime) {
      // 白天阳光闪烁效果 - 增强版
      const sunbeams: Array<{
        x: number;
        y: number;
        size: number;
        opacity: number;
        flickerSpeed: number;
        flickerPhase: number;
        driftX: number;
        driftY: number;
      }> = [];

      // 光斑粒子
      const sparkles: Array<{
        x: number;
        y: number;
        size: number;
        opacity: number;
        life: number;
        maxLife: number;
      }> = [];

      // 在画面上部和边缘生成光斑 - 增加数量和强度
      for (let i = 0; i < 12; i++) {
        sunbeams.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.5,
          size: Math.random() * 50 + 30,
          opacity: Math.random() * 0.12 + 0.05,
          flickerSpeed: Math.random() * 0.03 + 0.01,
          flickerPhase: Math.random() * Math.PI * 2,
          driftX: (Math.random() - 0.5) * 0.3,
          driftY: (Math.random() - 0.5) * 0.2
        });
      }

      // 生成闪烁光点
      const spawnSparkle = () => {
        if (sparkles.length < 15) {
          sparkles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.7,
            size: Math.random() * 3 + 1,
            opacity: 0,
            life: 0,
            maxLife: Math.random() * 60 + 30
          });
        }
      };

      const animateSunbeams = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 随机生成新的闪烁点
        if (Math.random() < 0.1) spawnSparkle();

        // 绘制大光斑
        sunbeams.forEach(beam => {
          beam.flickerPhase += beam.flickerSpeed;
          beam.x += beam.driftX;
          beam.y += beam.driftY;
          
          // 边界反弹
          if (beam.x < 0 || beam.x > canvas.width) beam.driftX *= -1;
          if (beam.y < 0 || beam.y > canvas.height * 0.6) beam.driftY *= -1;

          const currentOpacity = beam.opacity * (0.5 + 0.5 * Math.sin(beam.flickerPhase));

          // 绘制柔和的光斑
          const gradient = ctx.createRadialGradient(
            beam.x, beam.y, 0,
            beam.x, beam.y, beam.size
          );
          gradient.addColorStop(0, `rgba(255, 250, 230, ${currentOpacity})`);
          gradient.addColorStop(0.4, `rgba(255, 248, 220, ${currentOpacity * 0.6})`);
          gradient.addColorStop(1, 'rgba(255, 245, 200, 0)');

          ctx.beginPath();
          ctx.fillStyle = gradient;
          ctx.arc(beam.x, beam.y, beam.size, 0, Math.PI * 2);
          ctx.fill();
        });

        // 绘制闪烁光点
        for (let i = sparkles.length - 1; i >= 0; i--) {
          const sparkle = sparkles[i];
          sparkle.life++;
          
          // 淡入淡出
          if (sparkle.life < sparkle.maxLife * 0.3) {
            sparkle.opacity = sparkle.life / (sparkle.maxLife * 0.3);
          } else if (sparkle.life > sparkle.maxLife * 0.7) {
            sparkle.opacity = (sparkle.maxLife - sparkle.life) / (sparkle.maxLife * 0.3);
          }

          if (sparkle.life >= sparkle.maxLife) {
            sparkles.splice(i, 1);
            continue;
          }

          // 绘制闪烁点
          ctx.save();
          ctx.globalAlpha = sparkle.opacity * 0.8;
          ctx.fillStyle = '#FFFEF0';
          ctx.shadowColor = '#FFF8DC';
          ctx.shadowBlur = sparkle.size * 4;
          ctx.beginPath();
          ctx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2);
          ctx.fill();

          // 十字闪光
          ctx.strokeStyle = `rgba(255, 255, 240, ${sparkle.opacity * 0.5})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          const rayLen = sparkle.size * 3;
          ctx.moveTo(sparkle.x - rayLen, sparkle.y);
          ctx.lineTo(sparkle.x + rayLen, sparkle.y);
          ctx.moveTo(sparkle.x, sparkle.y - rayLen);
          ctx.lineTo(sparkle.x, sparkle.y + rayLen);
          ctx.stroke();
          ctx.restore();
        }

        animationId = requestAnimationFrame(animateSunbeams);
      };

      animateSunbeams();

      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', resize);
      };
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
