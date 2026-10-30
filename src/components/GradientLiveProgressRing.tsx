import { useState, useEffect, useRef } from 'react';

interface GradientLiveProgressRingProps {
  progress: number; // 0 to 100
  size?: number; // width/height in px
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export function GradientLiveProgressRing({
  progress,
  size = 180,
  strokeWidth = 12,
  label,
  sublabel,
}: GradientLiveProgressRingProps) {
  const [dispVal, setDispVal] = useState(progress);
  const prevVal = useRef(progress);
  const radius = 68;
  const circumference = 2 * Math.PI * radius; // ~427.25

  useEffect(() => {
    let animationFrameId: number;
    const startVal = prevVal.current;
    const targetVal = progress;
    const duration = 400; // 400ms smooth lerp per step
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(elapsed / duration, 1);
      // Smooth cubic ease-out
      const easeOut = 1 - Math.pow(1 - pct, 3);
      const current = startVal + (targetVal - startVal) * easeOut;
      
      setDispVal(current);

      if (pct < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        prevVal.current = targetVal;
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [progress]);

  // Dash offset: 0% progress = full circumference (hidden), 100% progress = 0 (full)
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <defs>
            {/* Base gradient matching theme */}
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00d2ff" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>

          {/* Background track circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />

          {/* Smooth hardware-accelerated animated gradient progress stroke */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="url(#ringGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="text-4xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #00d2ff 0%, #3b82f6 50%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {Math.round(dispVal)}%
          </span>
          {sublabel && (
            <span className="text-[10px] text-gray-500 font-mono font-medium mt-1 uppercase tracking-wider">
              {sublabel}
            </span>
          )}
        </div>
      </div>

      {label && (
        <p className="text-xs font-semibold text-gray-400 mt-3">{label}</p>
      )}
    </div>
  );
}
