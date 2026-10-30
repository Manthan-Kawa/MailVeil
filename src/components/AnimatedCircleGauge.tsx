import { useState, useEffect, useId } from 'react';

interface AnimatedCircleGaugeProps {
  score: number;
  max?: number;
  size?: number; // width/height in px
  strokeWidth?: number;
  label?: string;
  gradientColors?: [string, string, string];
  align?: 'center' | 'left';
}

export function AnimatedCircleGauge({
  score,
  max = 100,
  size = 135,
  strokeWidth = 9,
  label = 'CRITICAL RISK',
  gradientColors,
  align = 'center',
}: AnimatedCircleGaugeProps) {
  const [currentScore, setCurrentScore] = useState(0);
  const idPrefix = useId().replace(/:/g, '_');

  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  // Clamp progress percentage between 0.02 and 1
  const progressRatio = Math.min(Math.max(score / max, 0.02), 1);
  const activeLength = progressRatio * circumference;
  const targetOffset = circumference - activeLength;

  const [fillOffset, setFillOffset] = useState(circumference);

  useEffect(() => {
    // Smooth SVG stroke fill-up animation
    const timer = setTimeout(() => {
      setFillOffset(targetOffset);
    }, 50);

    // Count up the center number in sync
    let animationFrameId: number;
    const duration = 1200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setCurrentScore(score * easeOut);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationFrameId);
    };
  }, [score, max, targetOffset]);

  // Color scheme matching Sentinel-X based on risk level
  const getThemeColors = () => {
    if (gradientColors && gradientColors.length >= 3) {
      return {
        base: gradientColors,
        rayStop: gradientColors[0],
        textColor: score >= 80 ? 'text-red-500' : score >= 50 ? 'text-amber-500' : 'text-blue-500',
      };
    }

    if (score >= 80) {
      return {
        base: ['#ef4444', '#dc2626', '#b91c1c'] as [string, string, string],
        rayStop: '#fca5a5',
        textColor: 'text-red-500',
      };
    } else if (score >= 60) {
      return {
        base: ['#f97316', '#ea580c', '#c2410c'] as [string, string, string],
        rayStop: '#fed7aa',
        textColor: 'text-orange-500',
      };
    } else if (score >= 40) {
      return {
        base: ['#f59e0b', '#d97706', '#b45309'] as [string, string, string],
        rayStop: '#fde68a',
        textColor: 'text-amber-500',
      };
    } else {
      return {
        base: ['#3b82f6', '#2563eb', '#1d4ed8'] as [string, string, string],
        rayStop: '#93c5fd',
        textColor: 'text-sky-400',
      };
    }
  };

  const colors = getThemeColors();
  const rayLength = Math.max(Math.min(activeLength * 0.45, 42), 16);

  return (
    <div className={`flex flex-col ${align === 'left' ? 'items-start' : 'items-center'} justify-center`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          style={{ transform: 'rotate(-90deg)' }}
          shapeRendering="geometricPrecision"
        >
          <defs>
            {/* Primary active stroke gradient */}
            <linearGradient id={`${idPrefix}_baseGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.base[0]} />
              <stop offset="50%" stopColor={colors.base[1]} />
              <stop offset="100%" stopColor={colors.base[2]} />
            </linearGradient>

            {/* Specular Ray of Light gradient */}
            <linearGradient id={`${idPrefix}_rayGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.base[0]} stopOpacity="0" />
              <stop offset="30%" stopColor={colors.rayStop} stopOpacity="0.6" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="70%" stopColor={colors.rayStop} stopOpacity="0.6" />
              <stop offset="100%" stopColor={colors.base[0]} stopOpacity="0" />
            </linearGradient>

            {/* Strict SVG luminance mask ensuring wave shine is ONLY rendered INSIDE the active filled bar and never outside */}
            <mask id={`${idPrefix}_activeMask`}>
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#ffffff"
                strokeWidth={strokeWidth + 1}
                strokeDasharray={circumference}
                strokeDashoffset={fillOffset}
                strokeLinecap="round"
              />
            </mask>
          </defs>

          {/* Base active arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={`url(#${idPrefix}_baseGrad)`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={fillOffset}
            strokeLinecap="round"
            shapeRendering="geometricPrecision"
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.25, 0.64, 1)',
            }}
          />

          {/* Sentinel-X Specular Ray of Light moving strictly from UP to DOWN inside the active filled arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={`url(#${idPrefix}_rayGrad)`}
            strokeWidth={strokeWidth}
            strokeDasharray={`${rayLength} ${circumference}`}
            strokeLinecap="round"
            mask={`url(#${idPrefix}_activeMask)`}
            shapeRendering="geometricPrecision"
            style={{
              '--ray-start': '0px',
              '--ray-end': `${Math.max(activeLength - rayLength, 0)}px`,
              animation: 'sentinelXWaveDown 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            } as React.CSSProperties}
          />
        </svg>

        {/* Center score counter matching Sentinel-X: big bold clean text without glow */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-4xl font-extrabold tracking-tight text-white dark:text-white leading-none">
            {Math.round(currentScore)}
          </span>
          <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 mt-1">
            / {max}
          </span>
        </div>
      </div>

      {/* Clean unboxed colored text below gauge matching Sentinel-X */}
      {label && (
        <span
          className={`mt-4 text-xs font-black uppercase tracking-wider ${colors.textColor}`}
        >
          {label}
        </span>
      )}

      {/* Hardware-accelerated CSS keyframe for wave flowing ONLY from UP to DOWN inside the filled bar */}
      <style>{`
        @keyframes sentinelXWaveDown {
          0% {
            stroke-dashoffset: 0px;
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          75% {
            opacity: 1;
          }
          95%, 100% {
            stroke-dashoffset: calc(-1 * var(--ray-end, 45px));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
