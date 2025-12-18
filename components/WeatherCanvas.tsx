
import React, { useEffect, useRef } from 'react';
import { WeatherType } from '../types';

interface WeatherCanvasProps {
  type: WeatherType | 'Starry';
  isExpanded?: boolean; // Enhanced mode for large view
}

const WeatherCanvas: React.FC<WeatherCanvasProps> = ({ type, isExpanded = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    let foregroundParticles: Particle[] = []; // Large close particles for expanded mode
    
    // Base particle counts
    let particleCount = 0;
    let foregroundCount = 0;
    
    if (type === 'LightRain') {
      particleCount = isExpanded ? 120 : 40;
      foregroundCount = isExpanded ? 8 : 0;
    }
    if (type === 'HeavyRain') {
      particleCount = isExpanded ? 300 : 150;
      foregroundCount = isExpanded ? 15 : 0;
    }
    if (type === 'Snow') {
      particleCount = isExpanded ? 150 : 60;
      foregroundCount = isExpanded ? 10 : 0;
    }
    if (type === 'Windy') particleCount = isExpanded ? 30 : 15;
    if (type === 'Starry') particleCount = isExpanded ? 200 : 100;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    window.addEventListener('resize', resize);
    resize();

    // Foreground particle class - large, fast, occasional
    class ForegroundParticle {
      x: number = 0;
      y: number = 0;
      speed: number = 0;
      size: number = 0;
      opacity: number = 0;
      wind: number = 0;
      length: number = 0;
      blur: number = 0;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * -canvas.height * 0.5;
        this.blur = Math.random() * 2 + 1;

        if (type === 'LightRain' || type === 'HeavyRain') {
          this.size = Math.random() * 2 + 2;
          this.length = Math.random() * 60 + 40;
          this.speed = Math.random() * 25 + 30;
          this.wind = type === 'HeavyRain' ? 4 : 1;
          this.opacity = Math.random() * 0.4 + 0.3;
        } else if (type === 'Snow') {
          this.size = Math.random() * 6 + 4;
          this.speed = Math.random() * 3 + 2;
          this.wind = (Math.random() - 0.5) * 2;
          this.opacity = Math.random() * 0.5 + 0.3;
        }
      }

      update() {
        this.y += this.speed;
        this.x += this.wind;
        if (this.y > canvas.height + 50) this.reset();
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.filter = `blur(${this.blur}px)`;
        ctx.beginPath();
        
        if (type === 'LightRain' || type === 'HeavyRain') {
          ctx.strokeStyle = `rgba(200, 220, 255, ${this.opacity})`;
          ctx.lineWidth = this.size;
          ctx.lineCap = 'round';
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(this.x + this.wind * 2, this.y + this.length);
          ctx.stroke();
        } else if (type === 'Snow') {
          ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
      }
    }

    class Particle {
      x: number = 0;
      y: number = 0;
      speed: number = 0;
      size: number = 0;
      opacity: number = 0;
      wind: number = 0;
      length: number = 0;
      twinkleSpeed: number = 0;
      isMeteor: boolean = false;
      layer: number = 0; // 0 = far background, 1 = mid, 2 = near

      constructor() {
        this.reset();
        // For stars, randomize position initially to fill screen properly
        if (type === 'Starry') {
           this.y = Math.random() * canvas.height;
           this.opacity = Math.random();
        }
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * -canvas.height;
        this.wind = 0;
        this.isMeteor = false;
        
        // Assign layer for depth effect in expanded mode
        this.layer = isExpanded ? Math.floor(Math.random() * 3) : 1;
        const layerMultiplier = isExpanded ? (0.5 + this.layer * 0.4) : 1;

        if (type === 'LightRain') {
          this.size = 0.5 + this.layer * 0.3;
          this.length = (Math.random() * 10 + 5) * layerMultiplier;
          this.speed = (Math.random() * 8 + 8) * layerMultiplier;
          this.opacity = (0.1 + this.layer * 0.1) * (Math.random() * 0.5 + 0.5);
        } else if (type === 'HeavyRain') {
          this.size = 0.8 + this.layer * 0.3;
          this.length = (Math.random() * 25 + 15) * layerMultiplier;
          this.speed = (Math.random() * 15 + 20) * layerMultiplier;
          this.wind = 2 + this.layer;
          this.opacity = (0.15 + this.layer * 0.1) * (Math.random() * 0.5 + 0.5);
        } else if (type === 'Snow') {
          this.size = (Math.random() * 2 + 0.5) * layerMultiplier;
          this.speed = (Math.random() * 1 + 0.3) * layerMultiplier;
          this.wind = (Math.random() - 0.5) * (1 + this.layer * 0.5);
          this.opacity = (0.2 + this.layer * 0.15) * (Math.random() * 0.5 + 0.5);
        } else if (type === 'Windy') {
          this.x = -50;
          this.y = Math.random() * canvas.height;
          this.length = Math.random() * 100 + 50;
          this.speed = Math.random() * 10 + 15;
          this.size = 0.5;
          this.opacity = Math.random() * 0.1 + 0.05;
        } else if (type === 'Starry') {
          // Shooting star logic: small chance to spawn as a meteor
          if (Math.random() < (isExpanded ? 0.02 : 0.01)) {
             this.isMeteor = true;
             this.x = Math.random() * canvas.width;
             this.y = Math.random() * (canvas.height / 3);
             this.size = Math.random() * 2 + 1;
             this.speed = Math.random() * 15 + 10;
             this.length = Math.random() * 80 + 40;
             this.opacity = 1;
          } else {
             this.x = Math.random() * canvas.width;
             this.y = Math.random() * canvas.height;
             this.size = Math.random() * (isExpanded ? 2 : 1.5);
             this.speed = 0;
             this.opacity = Math.random();
             this.twinkleSpeed = Math.random() * 0.02 + 0.005;
          }
        }
      }

      update() {
        if (type === 'Windy') {
          this.x += this.speed;
          this.y += (Math.random() - 0.5) * 2;
          if (this.x > canvas.width) this.reset();
        } else if (type === 'Starry') {
          if (this.isMeteor) {
             this.x -= this.speed;
             this.y += this.speed * 0.7;
             this.opacity -= 0.02;
             if (this.x < 0 || this.y > canvas.height || this.opacity <= 0) {
                 this.reset();
             }
          } else {
             this.opacity += this.twinkleSpeed;
             if (this.opacity > 1 || this.opacity < 0.2) {
                this.twinkleSpeed = -this.twinkleSpeed;
             }
          }
        } else {
          this.y += this.speed;
          this.x += this.wind;
          if (this.y > canvas.height) this.reset();
        }
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        
        if (type === 'Starry' && this.isMeteor) {
           const gradient = ctx.createLinearGradient(this.x, this.y, this.x + this.length, this.y - this.length * 0.7);
           gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
           gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
           ctx.strokeStyle = gradient;
           ctx.lineWidth = this.size;
           ctx.moveTo(this.x, this.y);
           ctx.lineTo(this.x + this.length, this.y - this.length * 0.7);
           ctx.stroke();
           
           ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
           ctx.beginPath();
           ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
           ctx.fill();
        } else {
           ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity})`;
           ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
           
           if (type === 'LightRain' || type === 'HeavyRain') {
             ctx.lineWidth = this.size;
             ctx.moveTo(this.x, this.y);
             ctx.lineTo(this.x + this.wind, this.y + this.length);
             ctx.stroke();
           } else if (type === 'Snow') {
             ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
             ctx.fill();
           } else if (type === 'Windy') {
             ctx.lineWidth = this.size;
             ctx.moveTo(this.x, this.y);
             ctx.lineTo(this.x + this.length, this.y);
             ctx.stroke();
           } else if (type === 'Starry') {
             ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
             ctx.fill();
           }
        }
      }
    }

    if (type !== 'Fog' && type !== 'Clear') {
      particles = Array.from({ length: particleCount }, () => new Particle());
      if (isExpanded && foregroundCount > 0) {
        foregroundParticles = Array.from({ length: foregroundCount }, () => new ForegroundParticle());
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (type === 'Fog') {
        ctx.fillStyle = `rgba(255, 255, 255, ${isExpanded ? 0.1 : 0.06})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        // Draw background particles first (sorted by layer for depth)
        particles
          .sort((a, b) => a.layer - b.layer)
          .forEach(p => {
            p.update();
            p.draw();
          });
        
        // Draw foreground particles last (on top, with blur)
        foregroundParticles.forEach(p => {
          p.update();
          p.draw();
        });
      }
      
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [type, isExpanded]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-20" />;
};

export default WeatherCanvas;
