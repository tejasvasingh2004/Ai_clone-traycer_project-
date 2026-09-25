"use client";

import React, { useEffect, useRef } from "react";

interface StarData {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  isHero: boolean;
  toggled: boolean;
  lastToggleTime: number;
}

export default function GeminiStars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<StarData[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const reqRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const generateStars = () => {
      const numStars = Math.floor((window.innerWidth * window.innerHeight) / 12000); 
      const stars: StarData[] = [];
      for (let i = 0; i < numStars; i++) {
        const isHero = Math.random() > 0.98;
        stars.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          size: isHero ? Math.random() * 1.5 + 1.5 : Math.random() * 1.2 + 0.3, 
          baseOpacity: isHero ? Math.random() * 0.2 + 0.8 : Math.random() * 0.7 + 0.1,
          isHero,
          toggled: false,
          lastToggleTime: 0,
        });
      }
      starsRef.current = stars;
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      const now = Date.now();

      starsRef.current.forEach((star) => {
        // Check distance to mouse
        const dx = star.x - mouseX;
        const dy = star.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Toggle state if mouse is very close, with a 500ms debounce
        if (dist < 30 && (now - star.lastToggleTime > 500)) {
          star.toggled = !star.toggled;
          star.lastToggleTime = now;
        }

        // If toggled (off), don't draw this star
        if (star.toggled) return;

        const { x, y, size, baseOpacity, isHero } = star;

        // Draw the star core
        ctx.fillStyle = `rgba(255, 255, 255, ${baseOpacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        // Draw the diffraction spikes (crosses) for hero stars
        if (isHero) {
          const spikeLength = size * 6; 
          
          const drawSpike = (x0: number, y0: number, x1: number, y1: number) => {
            const grad = ctx.createLinearGradient(x0, y0, x1, y1);
            grad.addColorStop(0, `rgba(255, 255, 255, 0)`);
            grad.addColorStop(0.5, `rgba(255, 255, 255, ${baseOpacity * 0.8})`);
            grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
            
            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
          };

          drawSpike(x - spikeLength, y, x + spikeLength, y);
          drawSpike(x, y - spikeLength, x, y + spikeLength);
          
          ctx.fillStyle = `rgba(255, 255, 255, 1)`;
          ctx.beginPath();
          ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      reqRef.current = requestAnimationFrame(render);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      generateStars();
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // generates initial stars
    reqRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(reqRef.current);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const handleMouseLeave = () => {
    mouseRef.current = { x: -1000, y: -1000 };
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-auto"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  );
}
