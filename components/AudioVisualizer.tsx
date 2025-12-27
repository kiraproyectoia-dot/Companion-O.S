
import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  isConnected: boolean;
  isSpeaking: boolean;
  getAudioVolume: () => number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isConnected, isSpeaking, getAudioVolume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // FIX: Added initial value 0 to satisfy useRef type requirements for animation frame IDs
  const requestRef = useRef<number>(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!isConnected) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const volume = getAudioVolume();
      // Amplify volume for visual effect, cap at 1.0
      const intensity = Math.min(volume * 4, 1.0);
      
      // Update phase for animation
      phaseRef.current += 0.05 + (intensity * 0.1);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxRadius = Math.min(centerX, centerY) * 0.8;
      const baseRadius = maxRadius * 0.4;

      // Determine color based on state (Speaking vs Listening)
      // Speaking: Purple/Pink (Lily's colors)
      // Listening: Teal/Cyan (Waiting/Active input)
      const r = isSpeaking ? 168 : 45;   // Purple (168) vs Teal (45)
      const g = isSpeaking ? 85 : 212;   // Purple (85) vs Teal (212)
      const b = isSpeaking ? 247 : 191;  // Purple (247) vs Teal (191)

      ctx.save();
      ctx.translate(centerX, centerY);

      // Draw 3 overlapping harmonic circles
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const offset = (Math.PI * 2 / 3) * i;
        
        // Create harmonic wave shape
        for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
          // Wave calculation based on volume and time
          const wave = Math.sin(angle * 3 + phaseRef.current + offset) * (20 + intensity * 60);
          const r = baseRadius + wave + (intensity * 30);
          
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          
          if (angle === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        
        ctx.closePath();
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.3 + (intensity * 0.4)})`;
        ctx.lineWidth = 2 + (intensity * 4);
        ctx.stroke();
        
        // Fill with very low opacity for glow effect
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.05)`;
        ctx.fill();
      }

      // Core circle
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 0.5 + (intensity * 20), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.5 + intensity * 0.5})`;
      ctx.shadowBlur = 20 + (intensity * 40);
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
      ctx.fill();

      ctx.restore();

      requestRef.current = requestAnimationFrame(draw);
    };

    // Set canvas size to match display size
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    
    window.addEventListener('resize', resize);
    resize();
    requestRef.current = requestAnimationFrame(draw);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isConnected, isSpeaking, getAudioVolume]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }} // Behind avatar, in front of background
    />
  );
};
