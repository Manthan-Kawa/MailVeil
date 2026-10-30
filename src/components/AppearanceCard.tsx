import { Monitor, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

export function AppearanceCard() {
  const { theme, toggleTheme, setTheme } = useTheme();

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 shadow-sm transition-colors">
      <h3 className="font-semibold text-gray-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
        <Monitor className="w-5 h-5 text-sky-500" />
        Appearance
      </h3>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
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
              ? 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #7e22ce 100%)'
              : 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="relative w-16 h-8 rounded-full focus:outline-none cursor-pointer"
        >
          <motion.div
            layout
            initial={false}
            animate={{
              x: theme === 'dark' ? 32 : 4,
              backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff'
            }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30 }}
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
                  <Moon className="w-3.5 h-3.5 text-purple-400" />
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
      <div className="mt-5 grid grid-cols-2 gap-3 relative">
        {(['light', 'dark'] as const).map((mode) => {
          const isSelected = theme === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={(e) => setTheme(mode, e)}
              className="relative p-3 rounded-2xl cursor-pointer text-left focus:outline-none transition-colors duration-200 bg-gray-50/70 dark:bg-black/50 border border-gray-200/80 dark:border-zinc-800"
            >
              {isSelected && (
                <motion.div
                  layoutId="themeSelectionActiveBorder"
                  className="absolute inset-0 rounded-2xl border-2 border-blue-600 dark:border-white pointer-events-none shadow-sm"
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 32,
                  }}
                />
              )}

              <div
                className={`w-full h-8 rounded-xl mb-2.5 transition-all ${
                  mode === 'light'
                    ? 'bg-gradient-to-br from-slate-50 to-white border border-gray-200 shadow-sm'
                    : 'bg-black border border-zinc-700/80 shadow-inner'
                }`}
              />
              <p
                className={`text-xs font-semibold text-center transition-colors ${
                  isSelected
                    ? 'text-gray-900 dark:text-white font-bold'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {mode === 'light' ? 'Light' : 'Dark'}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
