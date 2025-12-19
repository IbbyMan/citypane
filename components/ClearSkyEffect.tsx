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
      // 夜晚星星闪烁效果 - 精简版，减少数量
      const stars: Array<{
        x: number;
        y: number;
        size: number;
        opacity: number;
        twinkleSpeed: number;
        twinklePhase: number;
        color: string;
      }> = [];

      // 流星 - 修正物理轨迹
      let meteor: {
        x: number;
        y: number;
        vx: number;  // 水平速度
        vy: number;  // 垂直速度
        length: number;
        opacity: number;
        active: boolean;
        angle: number; // 运动角度
      } | null = null;

      // 大幅减少星星数量：从30个减少到8-12个
      const starCount = Math.floor(Math.random() * 5) + 8;
      for (let i = 0; i < starCount; i++) {
        const colors = ['#FFFFFF', '#FFE4B5', '#ADD8E6', '#FFF8DC'];
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.5, // 上50%区域
          size: Math.random() * 1.5 + 0.5, // 更小的星星
          opacity: Math.random() * 0.4 + 0.2, // 更暗
          twinkleSpeed: Math.random() * 0.02 + 0.01, // 更慢的闪烁
          twinklePhase: Math.random() * Math.PI * 2,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }

      // 流星生成 - 修正物理轨迹（从左上往右下，或从右上往左下）
      const spawnMeteor = () => {
        // 随机决定流星方向：从左上到右下，或从右上到左下
        const goingRight = Math.random() > 0.5;
        // 流星角度：30-60度之间（相对于水平线）
        const angle = (Math.random() * 30 + 30) * (Math.PI / 180);
        const speed = Math.random() * 6 + 8;
        
        meteor = {
          x: goingRight 
            ? Math.random() * canvas.width * 0.3  // 从左侧1/3区域开始
            : canvas.width * 0.7 + Math.random() * canvas.width * 0.3, // 从右侧1/3区域开始
          y: Math.random() * canvas.height * 0.15, // 从顶部15%区域开始
          vx: goingRight ? speed * Math.cos(angle) : -speed * Math.cos(angle),
          vy: speed * Math.sin(angle), // 始终向下
          length: Math.random() * 50 + 30,
          opacity: 1,
          active: true,
          angle: goingRight ? angle : Math.PI - angle
        };
      };

      // 大幅降低流星出现频率：每15秒检查一次，10%概率
      const meteorInterval = setInterval(() => {
        if (!meteor || !meteor.active) {
          if (Math.random() < 0.1) spawnMeteor();
        }
      }, 15000);

      const animateStars = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        stars.forEach(star => {
          star.twinklePhase += star.twinkleSpeed;
          const currentOpacity = star.opacity * (0.3 + 0.7 * Math.sin(star.twinklePhase));

          // 只有当透明度足够高时才绘制（减少闪烁频率）
          if (currentOpacity < 0.15) return;

          ctx.save();
          ctx.globalAlpha = currentOpacity;
          
          // 星星核心
          ctx.beginPath();
          ctx.fillStyle = star.color;
          ctx.shadowColor = star.color;
          ctx.shadowBlur = star.size * 2;
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();

          // 只有较大的星星才有十字光芒
          if (star.size > 1.2 && currentOpacity > 0.4) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${currentOpacity * 0.4})`;
            ctx.lineWidth = 0.3;
            ctx.beginPath();
            const rayLength = star.size * 3;
            ctx.moveTo(star.x - rayLength, star.y);
            ctx.lineTo(star.x + rayLength, star.y);
            ctx.moveTo(star.x, star.y - rayLength);
            ctx.lineTo(star.x, star.y + rayLength);
            ctx.stroke();
          }

          ctx.restore();
        });

        // 绘制流星 - 修正物理轨迹
        if (meteor && meteor.active) {
          ctx.save();
          
          // 流星尾巴的终点（根据角度计算）
          const tailX = meteor.x - Math.cos(meteor.angle) * meteor.length;
          const tailY = meteor.y - Math.sin(meteor.angle) * meteor.length;
          
          const gradient = ctx.createLinearGradient(
            meteor.x, meteor.y,
            tailX, tailY
          );
          gradient.addColorStop(0, `rgba(255, 255, 255, ${meteor.opacity})`);
          gradient.addColorStop(0.2, `rgba(255, 250, 220, ${meteor.opacity * 0.7})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(meteor.x, meteor.y);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();

          // 流星头部光点
          ctx.fillStyle = `rgba(255, 255, 255, ${meteor.opacity})`;
          ctx.shadowColor = '#FFFFFF';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(meteor.x, meteor.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // 更新流星位置 - 使用正确的速度分量
          meteor.x += meteor.vx;
          meteor.y += meteor.vy;
          meteor.opacity -= 0.012;
          
          // 流星消失条件
          if (meteor.opacity <= 0 || 
              meteor.x < -50 || meteor.x > canvas.width + 50 || 
              meteor.y > canvas.height) {
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
