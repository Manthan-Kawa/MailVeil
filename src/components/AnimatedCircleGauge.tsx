import { useState, useEffect, useId } from 'react';

export interface AnimatedCircleGaugeProps {
  score: number;
  max?: number;
  size?: number; // width/height in px
  strokeWidth?: number;
  label?: string;
  gradientColors?: [string, string, string];
  align?: 'center' | 'left';
  showTrack?: boolean;
}

export function AnimatedCircleGauge({
  score,
  max = 100,
  size = 135,
  strokeWidth = 9.5,
  label,
  gradientColors,
  align = 'center',
  showTrack = false,
}: AnimatedCircleGaugeProps) {
  const [currentScore, setCurrentScore] = useState(0);
  const idPrefix = useId().replace(/:/g, '_');

  const radius = 42;
  const circumference = 2 * Math.PI * radius; // ~263.89

  // Clamp progress percentage between 0 and 1
  const clampedScore = Math.min(Math.max(score, 0), max);
  const targetOffset = circumference - (clampedScore / max) * circumference;

  const [fillOffset, setFillOffset] = useState(circumference);

  useEffect(() => {
    // 1. Animate arc fill
    const timer = setTimeout(() => {
      setFillOffset(targetOffset);
    }, 50);

    // 2. Animate counter text with ease-out cubic
    let animationFrameId: number;
    const duration = 1200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setCurrentScore(clampedScore * easeOut);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationFrameId);
    };
  }, [clampedScore, max, targetOffset]);

  // Color scheme matching risk level if custom gradient not provided
  const getColors = () => {
    if (gradientColors && gradientColors.length >= 3) {
      return {
        gradient: gradientColors,
        textColor: score >= 80 ? 'text-red-500' : score >= 50 ? 'text-amber-500' : 'text-blue-500',
      };
    }

    if (score >= 80) {
      return {
        gradient: ['#f87171', '#ef4444', '#b91c1c'] as [string, string, string],
        textColor: 'text-red-500',
      };
    } else if (score >= 60) {
      return {
        gradient: ['#fb923c', '#ea580c', '#c2410c'] as [string, string, string],
        textColor: 'text-orange-500',
      };
    } else if (score >= 40) {
      return {
        gradient: ['#fbbf24', '#d97706', '#b45309'] as [string, string, string],
        textColor: 'text-amber-500',
      };
    } else {
      return {
        gradient: ['#38bdf8', '#3b82f6', '#1d4ed8'] as [string, string, string],
        textColor: 'text-blue-500',
      };
    }
  };

  const colors = getColors();

  return (
    <div className={`flex flex-col ${align === 'left' ? 'items-start' : 'items-center'} justify-center select-none`}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full -rotate-90"
          shapeRendering="geometricPrecision"
        >
          <defs>
            {/* Base Color Gradient */}
            <linearGradient id={`${idPrefix}_gaugeGradient`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.gradient[0]} />
              <stop offset="60%" stopColor={colors.gradient[1]} />
              <stop offset="100%" stopColor={colors.gradient[2]} />
            </linearGradient>

            {/* Continuous Rotating Wave Shine */}
            <linearGradient id={`${idPrefix}_shimmerSweepGradient`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="transparent" stopOpacity="0" />
              <stop offset="40%" stopColor="transparent" stopOpacity="0" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="60%" stopColor="transparent" stopOpacity="0" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              <animateTransform
                attributeName="gradientTransform"
                type="rotate"
                from="0 0.5 0.5"
                to="360 0.5 0.5"
                dur="2.8s"
                repeatCount="indefinite"
              />
            </linearGradient>
          </defs>

          {/* Background Track (optional) */}
          {showTrack && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
            />
          )}

          {/* Base Progress Arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={`url(#${idPrefix}_gaugeGradient)`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={fillOffset}
            strokeLinecap="round"
            shapeRendering="geometricPrecision"
            style={{
              transition: 'stroke-dashoffset 1.35s cubic-bezier(0.34, 1.25, 0.64, 1)',
            }}
          />

          {/* Rotating Light Wave Overlay */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={`url(#${idPrefix}_shimmerSweepGradient)`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={fillOffset}
            strokeLinecap="round"
            shapeRendering="geometricPrecision"
            style={{
              transition: 'stroke-dashoffset 1.35s cubic-bezier(0.34, 1.25, 0.64, 1)',
              mixBlendMode: 'screen',
              pointerEvents: 'none',
            }}
          />
        </svg>

        {/* Center Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-none">
            {Math.round(currentScore)}
          </span>
          <span className="text-[11px] font-mono font-medium text-zinc-400 mt-1">
            / {max}
          </span>
        </div>
      </div>

      {/* Optional Risk Label */}
      {label && (
        <span className={`mt-3.5 text-xs font-black uppercase tracking-wider ${colors.textColor}`}>
          {label}
        </span>
      )}
    </div>
  );
}

// Export alias for compatibility
export const CircularShineGauge = AnimatedCircleGauge;
