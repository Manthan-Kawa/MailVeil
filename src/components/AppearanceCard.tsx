import { Monitor, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

export function AppearanceCard() {
  const { theme, toggleTheme, setTheme } = useTheme();

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] shadow-sm transition-colors">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <Monitor className="w-5 h-5 text-sky-500" />
        Appearance
      </h3>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {theme === 'dark'
              ? 'Switch to light for a brighter look'
              : 'Switch to dark for easier night use'}
          </p>
        </div>

        {/* Toggle switch pill */}
        <motion.button
          type="button"
          onClick={(e) => toggleTheme(e)}
          aria-label="Toggle dark/light mode"
          animate={{
            background: theme === 'dark'
              ? 'linear-gradient(to right, #4f46e5, #9333ea)'
              : 'linear-gradient(to right, #38bdf8, #22d3ee)'
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="relative w-16 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
        >
          <motion.div
            layout
            initial={false}
            animate={{
              x: theme === 'dark' ? 32 : 4,
              backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff'
            }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
            }}
            className="absolute top-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === 'dark' ? (
                <motion.div
                  key="moon"
                  initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="absolute flex items-center justify-center"
                >
                  <Moon className="w-3.5 h-3.5 text-indigo-300" />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="absolute flex items-center justify-center"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.button>
      </div>

      {/* Visual preview tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={(e) => setTheme('light', e)}
          className={`p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
            theme === 'light'
              ? 'border-sky-500 bg-sky-50'
              : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
          }`}
        >
          <div className="w-full h-8 rounded-lg bg-gradient-to-br from-slate-100 to-white border border-slate-200 mb-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]" />
          <p className={`text-xs font-medium text-center ${theme === 'light' ? 'text-sky-600 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
            Light
          </p>
        </button>

        <button
          type="button"
          onClick={(e) => setTheme('dark', e)}
          className={`p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
            theme === 'dark'
              ? 'border-indigo-500 bg-indigo-950/30'
              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
          }`}
        >
          <div className="w-full h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 dark:border-white/10 mb-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]" />
          <p className={`text-xs font-medium text-center ${theme === 'dark' ? 'text-indigo-400 font-semibold' : 'text-slate-400'}`}>
            Dark
          </p>
        </button>
      </div>
    </div>
  );
}
