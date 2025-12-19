
import React, { useEffect, useRef } from 'react';
import { WeatherType } from '../types';

interface WeatherCanvasProps {
  type: WeatherType | 'Starry';
  isExpanded?: boolean; // Enhanced mode for large view
  speedMultiplier?: number; // Speed multiplier for particles (default 1.0)
}

const WeatherCanvas: React.FC<WeatherCanvasProps> = ({ type, isExpanded = false, speedMultiplier = 1.0 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    let foregroundParticles: ForegroundParticle[] = []; // Large close particles for expanded mode
    let splashes: Splash[] = []; // Rain splash effects
    
    // Base particle counts - INCREASED for more visible effect
    let particleCount = 0;
    let foregroundCount = 0;
    
    if (type === 'LightRain') {
      particleCount = isExpanded ? 200 : 80;
      foregroundCount = isExpanded ? 15 : 5;
    }
    if (type === 'HeavyRain') {
      particleCount = isExpanded ? 500 : 250;
      foregroundCount = isExpanded ? 25 : 10;
    }
    if (type === 'Snow') {
      particleCount = isExpanded ? 200 : 100;
      foregroundCount = isExpanded ? 15 : 5;
    }
    if (type === 'Windy') particleCount = isExpanded ? 50 : 25;
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

    // Rain splash effect class
    class Splash {
      x: number = 0;
      y: number = 0;
      radius: number = 0;
      maxRadius: number = 0;
      opacity: number = 0;
      speed: number = 0;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = Math.random() * 8 + 4;
        this.opacity = 0.6;
        this.speed = Math.random() * 2 + 1;
      }

      update(): boolean {
        this.radius += this.speed;
        this.opacity -= 0.03;
        return this.opacity > 0 && this.radius < this.maxRadius;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(200, 220, 255, ${this.opacity})`;
        ctx.lineWidth = 1;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

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
      wobble: number = 0;
      wobbleSpeed: number = 0;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * -canvas.height * 0.5;
        this.blur = Math.random() * 2 + 1;
        this.wobble = 0;
        this.wobbleSpeed = Math.random() * 0.1 + 0.05;

        if (type === 'LightRain' || type === 'HeavyRain') {
          this.size = Math.random() * 3 + 2;
          this.length = Math.random() * 80 + 50;
          this.speed = Math.random() * 30 + 35;
          this.wind = type === 'HeavyRain' ? 6 : 2;
          this.opacity = Math.random() * 0.5 + 0.4;
        } else if (type === 'Snow') {
          this.size = Math.random() * 8 + 5;
          this.speed = (Math.random() * 4 + 2) * speedMultiplier;
          this.wind = (Math.random() - 0.5) * 3 * speedMultiplier;
          this.opacity = Math.random() * 0.6 + 0.4;
        }
      }

      update(): boolean {
        this.y += this.speed;
        this.wobble += this.wobbleSpeed;
        
        if (type === 'Snow') {
          this.x += this.wind + Math.sin(this.wobble) * 2;
        } else {
          this.x += this.wind;
        }
        
        const hitGround = this.y > canvas.height - 20;
        if (this.y > canvas.height + 50) this.reset();
        return hitGround;
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.filter = `blur(${this.blur}px)`;
        ctx.beginPath();
        
        if (type === 'LightRain' || type === 'HeavyRain') {
          ctx.strokeStyle = `rgba(180, 210, 255, ${this.opacity})`;
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
      wobble: number = 0;
      wobbleSpeed: number = 0;

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
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.1 + 0.02;
        
        // Assign layer for depth effect in expanded mode
        this.layer = isExpanded ? Math.floor(Math.random() * 3) : 1;
        const layerMultiplier = isExpanded ? (0.5 + this.layer * 0.4) : 1;

        if (type === 'LightRain') {
          this.size = 0.8 + this.layer * 0.4;
          this.length = (Math.random() * 15 + 8) * layerMultiplier;
          this.speed = (Math.random() * 12 + 10) * layerMultiplier;
          this.wind = 1 + this.layer * 0.5;
          this.opacity = (0.15 + this.layer * 0.15) * (Math.random() * 0.5 + 0.5);
        } else if (type === 'HeavyRain') {
          this.size = 1 + this.layer * 0.5;
          this.length = (Math.random() * 35 + 20) * layerMultiplier;
          this.speed = (Math.random() * 20 + 25) * layerMultiplier;
          this.wind = 3 + this.layer * 1.5;
          this.opacity = (0.2 + this.layer * 0.15) * (Math.random() * 0.5 + 0.5);
        } else if (type === 'Snow') {
          this.size = (Math.random() * 3 + 1) * layerMultiplier;
          this.speed = (Math.random() * 1.5 + 0.5) * layerMultiplier * speedMultiplier;
          this.wind = (Math.random() - 0.5) * (1.5 + this.layer * 0.5) * speedMultiplier;
          this.opacity = (0.3 + this.layer * 0.2) * (Math.random() * 0.5 + 0.5);
        } else if (type === 'Windy') {
          this.x = -50;
          this.y = Math.random() * canvas.height;
          this.length = Math.random() * 150 + 80;
          this.speed = Math.random() * 15 + 20;
          this.size = 0.8;
          this.opacity = Math.random() * 0.15 + 0.08;
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

      update(): boolean {
        if (type === 'Windy') {
          this.x += this.speed;
          this.y += (Math.random() - 0.5) * 3;
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
        } else if (type === 'Snow') {
          this.wobble += this.wobbleSpeed;
          this.y += this.speed;
          this.x += this.wind + Math.sin(this.wobble) * 0.8;
          if (this.y > canvas.height) this.reset();
        } else {
          this.y += this.speed;
          this.x += this.wind;
          const hitGround = this.y > canvas.height - 10;
          if (this.y > canvas.height) this.reset();
          return hitGround;
        }
        return false;
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
             // Draw rain with slight glow effect
             ctx.shadowColor = 'rgba(200, 220, 255, 0.5)';
             ctx.shadowBlur = 2;
             ctx.lineWidth = this.size;
             ctx.lineCap = 'round';
             ctx.moveTo(this.x, this.y);
             ctx.lineTo(this.x + this.wind, this.y + this.length);
             ctx.stroke();
             ctx.shadowBlur = 0;
           } else if (type === 'Snow') {
             ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
             ctx.fill();
           } else if (type === 'Windy') {
             ctx.lineWidth = this.size;
             ctx.lineCap = 'round';
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
      if (foregroundCount > 0) {
        foregroundParticles = Array.from({ length: foregroundCount }, () => new ForegroundParticle());
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (type === 'Fog') {
        // Animated fog with moving layers
        const time = Date.now() * 0.0005;
        ctx.fillStyle = `rgba(255, 255, 255, ${isExpanded ? 0.12 : 0.08})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Moving fog wisps
        for (let i = 0; i < 3; i++) {
          const x = (Math.sin(time + i * 2) * 0.5 + 0.5) * canvas.width;
          const y = canvas.height * (0.3 + i * 0.2);
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, 150);
          gradient.addColorStop(0, `rgba(255, 255, 255, ${0.08 + Math.sin(time * 2 + i) * 0.03})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      } else {
        // Draw background particles first (sorted by layer for depth)
        particles
          .sort((a, b) => a.layer - b.layer)
          .forEach(p => {
            const hitGround = p.update();
            p.draw();
            // Create splash effect when rain hits ground
            if (hitGround && (type === 'LightRain' || type === 'HeavyRain')) {
              if (Math.random() < 0.3) {
                splashes.push(new Splash(p.x, canvas.height - 5));
              }
            }
          });
        
        // Draw foreground particles last (on top, with blur)
        foregroundParticles.forEach(p => {
          const hitGround = p.update();
          p.draw();
          // Create bigger splash for foreground rain
          if (hitGround && (type === 'LightRain' || type === 'HeavyRain')) {
            if (Math.random() < 0.5) {
              splashes.push(new Splash(p.x, canvas.height - 10));
            }
          }
        });

        // Draw and update splashes
        splashes = splashes.filter(splash => {
          splash.draw();
          return splash.update();
        });
      }
      
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [type, isExpanded, speedMultiplier]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-20" />;
};

export default WeatherCanvas;
