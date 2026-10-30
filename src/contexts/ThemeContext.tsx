import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: (e?: React.MouseEvent | MouseEvent) => void;
  setTheme: (theme: Theme, e?: React.MouseEvent | MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

// Track last pointer position globally so we always have a valid origin
// even if the event object has been recycled or coordinates are 0,0
let lastPointerPos: { x: number; y: number } | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (e: PointerEvent) => { lastPointerPos = { x: e.clientX, y: e.clientY }; },
    { capture: true, passive: true }
  );
}

/**
 * Updates all meta[name="theme-color"] tags in-place.
 * IMPORTANT: removes the `media` attribute so iOS Safari never reverts to
 * system-preference color after page navigation — it always uses the JS value.
 */
const updateThemeColorMeta = (newTheme: Theme) => {
  const color = newTheme === 'dark' ? '#0b0c11' : '#ffffff';
  const metaTags = document.querySelectorAll('meta[name="theme-color"]');
  if (metaTags.length > 0) {
    metaTags.forEach((tag) => {
      tag.removeAttribute('media');   // ← critical: removes system-pref override
      tag.setAttribute('content', color);
    });
  } else {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', color);
    document.head.appendChild(meta);
  }

  // Keep colorScheme in sync for native browser chrome
  document.documentElement.style.colorScheme = newTheme;
  if (document.body) document.body.style.colorScheme = newTheme;
};

/**
 * Applies the .dark class and data-mode attribute to <html>.
 * Also clears any stale inline background-color so CSS classes are always authoritative.
 */
const applyThemeDom = (newTheme: Theme) => {
  const root = document.documentElement;
  // Clear any stale inline background-color (set by the initial-load script in index.html)
  root.style.removeProperty('background-color');
  if (document.body) document.body.style.removeProperty('background-color');

  if (newTheme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-mode', 'dark');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-mode', 'light');
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem('app-theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
    const legacy = localStorage.getItem('sentinel_theme') as Theme | null;
    if (legacy === 'light' || legacy === 'dark') return legacy;
    return 'dark';
  });

  const isTransitioningRef = useRef(false);
  // Always reflects latest theme synchronously (updated at render time, not in useEffect)
  // so any event handler closure never reads a stale value
  const themeRef = useRef<Theme>(theme);
  themeRef.current = theme;

  const setTheme = (newTheme: Theme, e?: React.MouseEvent | MouseEvent) => {
    if (newTheme === theme) return;

    const commit = () => {
      setThemeState(newTheme);
      applyThemeDom(newTheme);
      try {
        localStorage.setItem('app-theme', newTheme);
        localStorage.setItem('sentinel_theme', newTheme);
      } catch { /* ignore */ }
    };

    // Fallback: no View Transitions API → instant swap
    // @ts-ignore
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      commit();
      updateThemeColorMeta(newTheme);
      return;
    }

    // Resolve click origin for the circular reveal
    const ev = e || (typeof window !== 'undefined' && window.event instanceof MouseEvent ? window.event : undefined);
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (ev && typeof ev.clientX === 'number' && typeof ev.clientY === 'number' && (ev.clientX !== 0 || ev.clientY !== 0)) {
      x = ev.clientX;
      y = ev.clientY;
    } else if (lastPointerPos) {
      x = lastPointerPos.x;
      y = lastPointerPos.y;
    } else if (ev && 'currentTarget' in ev && ev.currentTarget instanceof HTMLElement) {
      const r = ev.currentTarget.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    } else if (ev && 'target' in ev && ev.target instanceof HTMLElement) {
      const r = ev.target.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    }

    const maxDistX = Math.max(x, window.innerWidth - x);
    const maxDistY = Math.max(y, window.innerHeight - y);
    const endRadius = Math.ceil(Math.hypot(maxDistX, maxDistY)) + 30;

    // Set CSS vars for the CSS @keyframes fallback (circle-reveal)
    document.documentElement.style.setProperty('--click-x', `${x}px`);
    document.documentElement.style.setProperty('--click-y', `${y}px`);
    document.documentElement.style.setProperty('--click-radius', `${endRadius}px`);
    document.documentElement.setAttribute('data-theme-transitioning', 'true');
    isTransitioningRef.current = true;

    // @ts-ignore
    const transition = document.startViewTransition(() => {
      flushSync(commit);
    });

    // Use JS animate() on the pseudo-element for precise control.
    // This fires after the browser has captured both old and new snapshots.
    transition.ready.then(() => {
      try {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 480,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      } catch {
        // CSS @keyframes circle-reveal is the fallback
      }
    }).catch(() => { /* transition was skipped */ });

    // After animation: update meta tags and clean up.
    // Updating theme-color AFTER transition.finished means the status bar
    // color changes after the circle has swept over it — seamless on iOS.
    transition.finished.finally(() => {
      document.documentElement.removeAttribute('data-theme-transitioning');
      isTransitioningRef.current = false;
      updateThemeColorMeta(newTheme);
    });
  };

  const toggleTheme = (e?: React.MouseEvent | MouseEvent) => {
    setTheme(theme === 'dark' ? 'light' : 'dark', e);
  };

  // Sync DOM on mount and whenever theme state changes
  useEffect(() => {
    applyThemeDom(theme);
    // Only update meta if we're not mid-transition (transition.finished handles it)
    if (!isTransitioningRef.current) {
      updateThemeColorMeta(theme);
    }
  }, [theme]);

  // Re-assert theme on every page navigation.
  // iOS Safari can revert meta[name="theme-color"] after hash changes —
  // this listener fixes it using themeRef so the closure is never stale.
  useEffect(() => {
    const handleNavChange = () => {
      applyThemeDom(themeRef.current);
      updateThemeColorMeta(themeRef.current);
      // Delayed re-assert: some page components may mount after hashchange
      // and override the meta tag — this catches that case
      setTimeout(() => {
        applyThemeDom(themeRef.current);
        updateThemeColorMeta(themeRef.current);
      }, 80);
    };

    // Re-assert on every user interaction — trivially cheap,
    // guarantees topbar is always correct when user touches the screen
    const handleInteraction = () => {
      applyThemeDom(themeRef.current);
      updateThemeColorMeta(themeRef.current);
    };

    // Re-assert when app comes back to foreground (e.g. switching apps on iPhone)
    const handleVisibility = () => {
      if (!document.hidden) {
        applyThemeDom(themeRef.current);
        updateThemeColorMeta(themeRef.current);
      }
    };

    window.addEventListener('hashchange', handleNavChange);
    window.addEventListener('popstate', handleNavChange);
    document.addEventListener('click', handleInteraction, { passive: true });
    document.addEventListener('touchstart', handleInteraction, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('hashchange', handleNavChange);
      window.removeEventListener('popstate', handleNavChange);
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []); // empty — reads from themeRef, never stale

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
