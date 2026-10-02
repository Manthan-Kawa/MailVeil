import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  User,
  Palette,
  Bell,
  Lock,
  Check,
  Sparkles,
  Key,
  Shield,
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  Cpu,
  Trash2,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { CLAUDE_KEY_STORAGE } from '@/services/claudeService';
import { clearEphemeralStorage } from '@/utils/storageKeys';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { useAuth, deriveInitials, getSavedDisplayName } from '@/contexts/AuthContext';
import { useTickets } from '@/contexts/TicketContext';
import { SupabaseDataService } from '@/services/supabaseDataService';
import { AuthAccountService } from '@/services/authAccountService';
import { GoogleAuthService } from '@/services/googleAuthService';
import { UserNotificationService } from '@/services/userNotificationService';
import { AppearanceService, type ThemePreset } from '@/services/appearanceService';
import { NotificationRulesService } from '@/services/notificationRulesService';
import { SlideIn } from '@/components/SlideIn';
import { AppearanceCard } from '@/components/AppearanceCard';
import { useTheme } from '@/context/ThemeContext';
const analystAvatar = '/analyst.png';

type TabType = 'profile' | 'appearance' | 'password' | 'notifications' | 'data' | 'ai-engine';

interface SettingsTabConfig {
  id: TabType;
  label: string;
  icon: LucideIcon;
  analystOnly?: boolean;
}

const TABS: SettingsTabConfig[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'password', label: 'Password Update', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'data', label: 'Data Cache', icon: RefreshCw, analystOnly: true },
  { id: 'ai-engine', label: 'AI Engine', icon: Cpu, analystOnly: true },
];

const USER_TABS = TABS.filter((t) => !t.analystOnly);

export function SettingsPage({ userRole }: { onResetCache?: () => void; userRole?: string | null }) {
  const { isDark } = useTheme();
  const { resetActiveAnalysis } = useAnalysis();
  const { currentUser, updateUserProfile } = useAuth();
  const isUser = userRole === 'user';

  const visibleTabs = isUser ? USER_TABS : TABS;

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const savedTab = typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem('settings_active_tab') as TabType) : null;
    if (savedTab && TABS.some((t) => t.id === savedTab)) {
      sessionStorage.removeItem('settings_active_tab');
      return savedTab;
    }
    return 'profile';
  });

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    opacity: number;
  }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const currentTabEl = tabRefs.current[activeTab];
      if (currentTabEl) {
        setIndicatorStyle((prev) => {
          if (
            prev.left === currentTabEl.offsetLeft &&
            prev.top === currentTabEl.offsetTop &&
            prev.width === currentTabEl.offsetWidth &&
            prev.height === currentTabEl.offsetHeight &&
            prev.opacity === 1
          ) {
            return prev;
          }
          return {
            left: currentTabEl.offsetLeft,
            top: currentTabEl.offsetTop,
            width: currentTabEl.offsetWidth,
            height: currentTabEl.offsetHeight,
            opacity: 1,
          };
        });
      }
    };
    updateIndicator();
    const rafId = requestAnimationFrame(updateIndicator);
    window.addEventListener('resize', updateIndicator);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeTab, isUser]);

  useEffect(() => {
    const handleOpenTab = (e: any) => {
      const tab = e?.detail;
      if (tab && TABS.some((t) => t.id === tab)) {
        setActiveTab(tab);
      }
    };
    window.addEventListener('sentinel_open_settings_tab', handleOpenTab);
    return () => window.removeEventListener('sentinel_open_settings_tab', handleOpenTab);
  }, []);

  /* Profile state */
  const [displayName, setDisplayName] = useState(() => {
    const activeEmail = (currentUser?.email || localStorage.getItem('sentinel_user') || '').trim().toLowerCase();
    return currentUser?.displayName || getSavedDisplayName(activeEmail) || activeEmail.split('@')[0] || 'User';
  });
  const [email, setEmail] = useState(() => currentUser?.email || localStorage.getItem('sentinel_user') || '');
  const [bio, setBio] = useState(() => currentUser?.bio || (userRole === 'analyst' ? 'Cybersecurity Analyst & SOC Lead specializing in Mailveil forensic investigation and threat correlation.' : 'Standard user with active email threat monitoring.'));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('Profile Saved!');

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser?.displayName) {
      setDisplayName(currentUser.displayName);
    }
    if (currentUser?.email) {
      setEmail(currentUser.email);
    }
    if (currentUser?.bio) {
      setBio(currentUser.bio);
    }
  }, [currentUser?.displayName, currentUser?.email, currentUser?.bio]);

  /* Toggles & Settings state */
  const initialPrefs = AppearanceService.getPreferences();
  const initialRules = NotificationRulesService.getRules();
  const [themePreset, setThemePreset] = useState<string>(initialPrefs.themePreset);
  const [emailNotifications, setEmailNotifications] = useState<boolean>(initialRules.emailNotifications);
  const [criticalAlerts, setCriticalAlerts] = useState<boolean>(initialRules.criticalAlerts);
  const [weeklyDigest, setWeeklyDigest] = useState<boolean>(initialRules.weeklyDigest);
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(initialPrefs.animationsEnabled);
  const [glowEffects, setGlowEffects] = useState<boolean>(initialPrefs.glowEffects);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);

  /* Password Update state */
  const activeUserEmail = (email || currentUser?.email || localStorage.getItem('sentinel_user') || '').trim().toLowerCase();
  const isGoogleAccount = AuthAccountService.isGoogleRegistered(activeUserEmail);
  const [hasExistingPassword, setHasExistingPassword] = useState(() => AuthAccountService.hasPasswordSet(activeUserEmail));

  useEffect(() => {
    setHasExistingPassword(AuthAccountService.hasPasswordSet(activeUserEmail));
  }, [activeUserEmail]);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isGoogleResetVerified, setIsGoogleResetVerified] = useState(false);
  const [isVerifyingGoogle, setIsVerifyingGoogle] = useState(false);

  const handleVerifyWithGoogleToReset = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    setIsVerifyingGoogle(true);
    try {
      const { profile } = await GoogleAuthService.signInWithGoogle(activeUserEmail);
      if (profile.email.trim().toLowerCase() !== activeUserEmail.toLowerCase()) {
        setPasswordError(`Google account mismatch: You must verify using "${activeUserEmail}".`);
        return;
      }
      setIsGoogleResetVerified(true);
      setPasswordSuccess('Google identity verified! Enter your new password below without entering your old password.');
    } catch (err: any) {
      setPasswordError(err?.message || 'Google verification failed.');
    } finally {
      setIsVerifyingGoogle(false);
    }
  };

  const handleUpdatePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword.trim()) {
      setPasswordError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    if (hasExistingPassword && !isGoogleResetVerified && !oldPassword.trim()) {
      setPasswordError('Please enter your current password.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      let result;
      if (isGoogleResetVerified) {
        result = await AuthAccountService.resetPasswordWithGoogleVerification(
          activeUserEmail,
          newPassword.trim()
        );
      } else {
        result = await AuthAccountService.updatePassword(
          activeUserEmail,
          newPassword.trim(),
          hasExistingPassword ? oldPassword.trim() : undefined
        );
      }

      if (!result.success) {
        setPasswordError(result.error || 'Failed to update password.');
        return;
      }

      setHasExistingPassword(true);
      const isReset = isGoogleResetVerified;
      const hadPw = hasExistingPassword;
      setIsGoogleResetVerified(false);
      setPasswordSuccess(
        isReset
          ? 'Password reset successfully! You can now sign in using your email and new password.'
          : hadPw
            ? 'Password updated successfully! You can now sign in using your email and updated password.'
            : 'Password set successfully! For security, your current password will be required for all future updates.'
      );
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Dispatch user notification
      UserNotificationService.addUserNotification(activeUserEmail, {
        id: `notif-pwd-${Date.now()}`,
        title: 'Password Updated Successfully',
        msg: isReset
          ? 'Account password was reset and updated successfully.'
          : hadPw
            ? 'Account password was updated successfully.'
            : 'Account password was created and set successfully.',
        sev: 'info',
        category: 'system',
        route: 'settings',
      });
    } catch (err: any) {
      setPasswordError(err?.message || 'An unexpected error occurred while updating your password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleTestPushAlert = async () => {
    setIsTestingPush(true);
    try {
      await NotificationRulesService.sendTestAlert(activeUserEmail);
    } finally {
      setTimeout(() => setIsTestingPush(false), 2000);
    }
  };

  const handleTestEmailNotice = () => {
    setIsTestingEmail(true);
    NotificationRulesService.sendSampleEmailNotification(activeUserEmail);
    setTimeout(() => setIsTestingEmail(false), 2000);
  };

  const handleGenerateDigest = () => {
    setIsGeneratingDigest(true);
    NotificationRulesService.generateWeeklyDigest(activeUserEmail);
    setTimeout(() => setIsGeneratingDigest(false), 2000);
  };

  /* AI Engine (Gemini) state */
  const [claudeKey, setClaudeKey] = useState(() => localStorage.getItem(CLAUDE_KEY_STORAGE) ?? '');
  const [claudeKeySaved, setClaudeKeySaved] = useState(false);
  const [claudeKeyTesting, setClaudeKeyTesting] = useState(false);
  const [claudeKeyTestResult, setClaudeKeyTestResult] = useState<'ok' | 'fail' | null>(null);

  const { clearAllTickets } = useTickets();
  /* Cache reset states */
  const [sessionCleared, setSessionCleared] = useState(false);
  const [ticketsCleared, setTicketsCleared] = useState(false);

  // Sync settings (theme, toggles, keys) from Supabase in the background
  useEffect(() => {
    let active = true;
    const targetEmail = (currentUser?.email || email || '').trim().toLowerCase();
    if (targetEmail) {
      SupabaseDataService.fetchSettings(targetEmail, (userRole as any) || 'user').then((s) => {
        if (active && s) {
          if (s.themePreset) {
            setThemePreset(s.themePreset);
            AppearanceService.applyPreferences({ themePreset: s.themePreset as ThemePreset }, targetEmail);
          }
          if (s.animationsEnabled !== undefined) {
            setAnimationsEnabled(s.animationsEnabled);
            AppearanceService.applyPreferences({ animationsEnabled: s.animationsEnabled }, targetEmail);
          }
          if (s.glowEffects !== undefined) {
            setGlowEffects(s.glowEffects);
            AppearanceService.applyPreferences({ glowEffects: s.glowEffects }, targetEmail);
          }
          setEmailNotifications(s.emailNotifications ?? true);
          setCriticalAlerts(s.criticalAlerts ?? true);
          setWeeklyDigest(s.weeklyDigest ?? false);
          if (s.customAiKey) setClaudeKey(s.customAiKey);
        }
      });
    }
    return () => { active = false; };
  }, [currentUser?.email, email, userRole]);

  const handleSaveProfile = async () => {
    const targetEmail = (email || currentUser?.email || localStorage.getItem('sentinel_user') || 'user@mailveil.local').trim().toLowerCase();
    const role = (currentUser?.role || userRole || 'user') as 'analyst' | 'user';
    const newName = displayName.trim() || targetEmail.split('@')[0];
    const newBio = bio.trim();

    // 1. Synchronously update AuthContext so TopBar and Sidebar update immediately on click
    updateUserProfile({
      displayName: newName,
      bio: newBio,
      email: targetEmail,
      role,
    });

    // 2. Immediately cache in localStorage for instant persistence across pages/reloads
    try {
      const cachedProfile = {
        email: targetEmail,
        role,
        displayName: newName,
        bio: newBio,
        avatarUrl: currentUser?.avatarUrl,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(`sentinel_profile_${targetEmail}`, JSON.stringify(cachedProfile));
      localStorage.setItem('sentinel_user_display_name', newName);
      localStorage.setItem(`sentinel_user_display_name_${targetEmail}`, newName);
      window.dispatchEvent(new Event('storage'));
    } catch { /* ignore */ }

    setSaveMessage('Profile Saved!');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);

    if (newName) {
      UserNotificationService.addUserNotification(targetEmail, {
        id: `notif-name-${Date.now()}`,
        title: 'Profile Name Updated',
        msg: `Display name updated to "${newName}".`,
        sev: 'info',
        category: 'system',
        route: 'settings',
      });
    }

    // 3. Persist to Supabase in background (resilient fallback)
    try {
      await SupabaseDataService.upsertProfile({
        email: targetEmail,
        role,
        displayName: newName,
        bio: newBio,
        avatarUrl: currentUser?.avatarUrl,
      });
    } catch (e) {
      console.warn('Supabase upsertProfile fallback saved locally:', e);
    }
  };

  const handleSyncSetting = (patch: Partial<{
    themePreset: string;
    animationsEnabled: boolean;
    glowEffects: boolean;
    emailNotifications: boolean;
    criticalAlerts: boolean;
    weeklyDigest: boolean;
    customAiKey: string;
  }>) => {
    const targetEmail = email || currentUser?.email || 'user@mailveil.local';
    const role = (currentUser?.role || userRole || 'user') as 'analyst' | 'user';

    SupabaseDataService.upsertSettings({
      userEmail: targetEmail,
      role,
      themePreset: patch.themePreset ?? themePreset,
      animationsEnabled: patch.animationsEnabled ?? animationsEnabled,
      glowEffects: patch.glowEffects ?? glowEffects,
      emailNotifications: patch.emailNotifications ?? emailNotifications,
      criticalAlerts: patch.criticalAlerts ?? criticalAlerts,
      weeklyDigest: patch.weeklyDigest ?? weeklyDigest,
      customAiKey: patch.customAiKey ?? claudeKey,
      activeAiModel: 'gemini-3.6-flash',
    }).catch((e) => console.warn('Supabase settings sync error:', e));
  };


  const handleSaveClaudeKey = () => {
    localStorage.setItem(CLAUDE_KEY_STORAGE, claudeKey.trim());
    handleSyncSetting({ customAiKey: claudeKey.trim() });
    setClaudeKeySaved(true);
    setClaudeKeyTestResult(null);
    setTimeout(() => setClaudeKeySaved(false), 2500);
  };

  const handleTestClaudeKey = async () => {
    const key = (claudeKey || import.meta.env.VITE_GEMINI_API_KEY || '').trim();
    if (!key || key === 'your_gemini_api_key_here') {
      setClaudeKeyTestResult('fail');
      return;
    }
    setClaudeKeyTesting(true);
    setClaudeKeyTestResult(null);
    let success = false;
    for (const m of ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash']) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
        });
        if (res.ok) {
          success = true;
          break;
        }
      } catch {
        // continue
      }
    }
    setClaudeKeyTestResult(success ? 'ok' : 'fail');
    setClaudeKeyTesting(false);
  };

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <SlideIn delay={0} direction="down">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">System Settings</h2>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
              Manage profile credentials, appearance themes, notification settings, and security keys
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl self-start sm:self-auto bg-purple-500/10 border border-purple-500/30"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 font-mono">SYSTEM READY</span>
          </div>
        </div>
      </SlideIn>

      {/* ── Main Layout: Sidebar & Content Panel ── */}
      <SlideIn delay={80} direction="up">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── Left Sidebar Navigation ── */}
          <div className="lg:col-span-1">
            <div
              className="relative isolate rounded-2xl p-2 lg:p-3 flex lg:flex-col overflow-x-auto overflow-y-hidden lg:overflow-visible scrollbar-none gap-1.5 touch-scroll touch-pan-x overscroll-x-contain bg-white dark:bg-[#0c0f1a] border border-slate-200 dark:border-white/[0.08] shadow-sm"
            >
              {/* Smooth sliding indicator pill */}
              <div
                className="absolute z-0 pointer-events-none rounded-xl bg-sky-500/15 dark:bg-purple-500/20 border border-sky-400/50 dark:border-purple-500/40 shadow-sm"
                style={{
                  transform: `translate3d(${indicatorStyle.left}px, ${indicatorStyle.top}px, 0)`,
                  width: indicatorStyle.width,
                  height: indicatorStyle.height,
                  opacity: indicatorStyle.opacity,
                  transition: 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1), width 300ms cubic-bezier(0.25, 1, 0.5, 1), height 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease',
                  left: 0,
                  top: 0,
                  zIndex: 0,
                }}
              />

              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => { tabRefs.current[tab.id] = el; }}
                    onClick={() => setActiveTab(tab.id)}
                    style={{ zIndex: 10 }}
                    className={`relative z-10 shrink-0 lg:w-full flex items-center justify-between gap-3 px-3.5 py-2.5 lg:px-4 lg:py-3 rounded-xl transition-colors duration-200 group text-left whitespace-nowrap ${
                      active
                        ? 'text-sky-950 dark:text-white font-bold'
                        : 'text-slate-700 dark:text-gray-400 hover:text-black dark:hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-colors duration-200 ${active ? 'text-sky-700 dark:text-purple-300' : 'text-slate-500 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-gray-200'}`}
                      />
                      <span className="text-xs font-semibold">
                        {tab.label}
                      </span>
                    </div>
                    {active && (
                      <span className="w-2 h-2 rounded-full bg-sky-600 dark:bg-purple-400 shrink-0 transition-opacity duration-200" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right Content Area ── */}
          <div className="lg:col-span-3">
            <div
              key={activeTab}
              className="rounded-2xl p-4 sm:p-7 min-h-[500px] bg-white dark:bg-[#0c0f1a] border border-slate-200 dark:border-white/[0.08] shadow-sm transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom-2"
            >
              {/* ── 1. Profile Tab ── */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Profile Information</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                      Personal identity credentials and operational focus
                    </p>
                  </div>

                  {/* Avatar Card */}
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0 overflow-hidden border border-slate-200 dark:border-white/10"
                      style={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        boxShadow: isDark
                          ? '0 4px 16px rgba(0,0,0,0.5)'
                          : '0 2px 8px rgba(0,0,0,0.08)',
                      }}
                    >
                      {currentUser?.role === 'analyst' ? (
                        <img src={analystAvatar} alt="Analyst" className="w-full h-full object-cover" />
                      ) : currentUser?.avatarUrl ? (
                        <img src={currentUser.avatarUrl} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        deriveInitials(displayName || currentUser?.displayName || email || 'User')
                      )}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{displayName || currentUser?.displayName || 'User'}</h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">
                        {userRole === 'analyst' ? 'Cybersecurity Analyst · Mailveil SOC' : 'Standard Organization User'}
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {userRole === 'analyst' ? 'ANALYST ACCOUNT' : 'USER ACCOUNT'}
                      </span>
                    </div>
                  </div>

                  {/* Form Inputs */}
                  <div className="space-y-4 pt-2">
                    {/* Display Name */}
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-2">
                        DISPLAY NAME
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none transition-all bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]"
                      />
                    </div>

                    {/* Email (Read Only) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-mono font-bold text-slate-500 dark:text-gray-500 uppercase tracking-widest">
                          EMAIL ADDRESS
                        </label>
                        <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-500 dark:text-gray-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
                          <Lock className="w-2.5 h-2.5 text-slate-400 dark:text-gray-400" />
                          LOCKED
                        </span>
                      </div>
                      <input
                        type="email"
                        value={email || currentUser?.email || localStorage.getItem('sentinel_user') || ''}
                        readOnly
                        disabled
                        className="w-full rounded-xl px-4 py-3 text-xs text-slate-400 dark:text-gray-400 font-mono cursor-not-allowed select-none focus:outline-none transition-all bg-slate-100 dark:bg-white/[0.015] border border-slate-200 dark:border-white/[0.05]"
                      />
                      <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono mt-1.5">
                        Account email is tied to your authentication credentials and cannot be changed.
                      </p>
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-2">
                        BIO / ROLE FOCUS
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                        placeholder="Describe your security focus or operational role..."
                        className="w-full rounded-xl p-4 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none resize-none transition-all scrollbar-thin bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={handleSaveProfile}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-transform duration-150 ease-out active:scale-95 shadow-lg cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        boxShadow: '0 4px 16px rgba(59, 130, 246, 0.35)',
                      }}
                    >
                      {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
                      {savedSuccess ? saveMessage : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── 2. Appearance Tab ── */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  {/* The Exact Attendify Appearance Card */}
                  <AppearanceCard />

                  <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Display & Animation Preferences</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Customize interface animations and visual enhancements</p>
                  </div>

                  <div className="space-y-4">
                    <ToggleRow
                      label="SlideIn Entrance Animations"
                      detail="Staggered entrance animations on page navigation"
                      checked={animationsEnabled}
                      onChange={() => {
                        const next = !animationsEnabled;
                        setAnimationsEnabled(next);
                        AppearanceService.applyPreferences({ animationsEnabled: next }, activeUserEmail);
                        handleSyncSetting({ animationsEnabled: next });
                      }}
                    />
                    <ToggleRow
                      label="Neon Glow Effects"
                      detail="Glow box shadows on active indicators and metrics"
                      checked={glowEffects}
                      onChange={() => {
                        const next = !glowEffects;
                        setGlowEffects(next);
                        AppearanceService.applyPreferences({ glowEffects: next }, activeUserEmail);
                        handleSyncSetting({ glowEffects: next });
                      }}
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                    <h4 className="text-xs font-mono font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                      Theme Accent Presets
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: 'Dark Cyber', color: '#8b5cf6' },
                        { name: 'Obsidian Black', color: '#3b82f6' },
                        { name: 'Cyberpunk Teal', color: '#14b8a6' },
                        { name: 'Crimson Red', color: '#ef4444' },
                      ].map((t) => {
                        const isPresetActive = themePreset === t.name;
                        return (
                          <div
                            key={t.name}
                            onClick={() => {
                              setThemePreset(t.name);
                              AppearanceService.applyPreferences({ themePreset: t.name as ThemePreset }, activeUserEmail);
                              handleSyncSetting({ themePreset: t.name });
                            }}
                            className={`rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                              isPresetActive
                                ? 'bg-sky-50 dark:bg-purple-500/15 border border-sky-300 dark:border-purple-500/40 shadow-sm'
                                : 'bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/5'
                            }`}
                            style={{
                              boxShadow: isPresetActive && glowEffects ? `0 0 16px ${t.color}35` : undefined,
                            }}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{
                                  background: t.color,
                                  boxShadow: glowEffects ? `0 0 8px ${t.color}` : undefined,
                                }}
                              />
                              <span className="text-xs font-medium text-slate-900 dark:text-white">{t.name}</span>
                            </div>
                            {isPresetActive && <Check className="w-3.5 h-3.5" style={{ color: t.color }} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── 2.5 Password Update Tab (Directly below Appearance) ── */}
              {activeTab === 'password' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Password Security</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                      {hasExistingPassword
                        ? 'Update your account authentication password. Your current password is required.'
                        : 'Set a custom password to enable direct email & password sign-in alongside Google OAuth.'}
                    </p>
                  </div>

                  {/* Account authentication method banner */}
                  <div
                    className="p-3.5 rounded-2xl flex items-center justify-between gap-3 flex-wrap bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-300 shrink-0">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          {isGoogleAccount ? 'Google OAuth Registered Account' : 'Email & Password Account'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-gray-400 font-mono">
                          {activeUserEmail}
                        </div>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border"
                      style={
                        isGoogleAccount
                          ? {
                            background: 'rgba(6,182,212,0.1)',
                            borderColor: 'rgba(6,182,212,0.3)',
                            color: '#0891b2',
                          }
                          : {
                            background: 'rgba(168,85,247,0.1)',
                            borderColor: 'rgba(168,85,247,0.3)',
                            color: '#7e22ce',
                          }
                      }
                    >
                      {isGoogleAccount
                        ? hasExistingPassword
                          ? 'GOOGLE SIGN-IN (PASSWORD SET — 3 FIELDS)'
                          : 'GOOGLE SIGN-IN (FIRST-TIME SETUP — 2 FIELDS)'
                        : 'EMAIL SIGN-UP (3 FIELDS)'}
                    </span>
                  </div>

                  {/* Security Notice */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-gray-400 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>
                      {hasExistingPassword
                        ? 'For security, your current password is required before updating to a new password.'
                        : 'Creating a password allows you to sign in with your email and password directly without clicking "Continue with Google". Once set, your current password will be required for all future updates.'}
                    </span>
                  </div>

                  {/* Feedback Banners */}
                  {passwordError && (
                    <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-xs text-red-600 dark:text-red-300 flex items-start gap-2.5 animate-slide-down">
                      <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1 leading-relaxed">
                        <span>{passwordError}</span>
                      </div>
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-3 animate-slide-down">
                      <div className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                        <span className="font-semibold leading-relaxed">{passwordSuccess}</span>
                      </div>
                      {isGoogleResetVerified && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsGoogleResetVerified(false);
                            setPasswordSuccess('');
                          }}
                          className="text-[11px] text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white underline cursor-pointer shrink-0"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}

                  {/* Password Form */}
                  <form onSubmit={handleUpdatePassword} className="space-y-4 pt-1">

                    {/* Show Current Password field if account already has a password configured and hasn't verified via Google */}
                    {hasExistingPassword && !isGoogleResetVerified && (
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-2">
                          CURRENT PASSWORD
                        </label>
                        <div className="relative">
                          <input
                            type={showOldPw ? 'text' : 'password'}
                            value={oldPassword}
                            onChange={(e) => {
                              setOldPassword(e.target.value);
                              setPasswordError('');
                            }}
                            placeholder="Enter current password"
                            className="w-full rounded-xl px-4 py-3 pr-11 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none transition-all bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPw(!showOldPw)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 p-1 transition-colors"
                            tabIndex={-1}
                          >
                            {showOldPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Hybrid Recovery: Verify via Google if user forgot old password */}
                        <div className="flex justify-center sm:justify-end mt-2">
                          <button
                            type="button"
                            onClick={handleVerifyWithGoogleToReset}
                            disabled={isVerifyingGoogle}
                            className="text-[11px] text-sky-600 dark:text-cyan-400 hover:text-sky-700 dark:hover:text-cyan-300 flex items-center justify-center text-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400 shrink-0" />
                            <span className="text-center">
                              {isVerifyingGoogle ? 'Verifying with Google...' : 'Forgot current password? Verify with Google to reset'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* New Password (both Google and Email accounts) */}
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-2">
                        NEW PASSWORD
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPw ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            setPasswordError('');
                          }}
                          placeholder="At least 6 characters"
                          className="w-full rounded-xl px-4 py-3 pr-11 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none transition-all bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 p-1 transition-colors"
                          tabIndex={-1}
                        >
                          {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password (both Google and Email accounts) */}
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-2">
                        CONFIRM NEW PASSWORD
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPw ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setPasswordError('');
                          }}
                          placeholder="Re-enter new password"
                          className="w-full rounded-xl px-4 py-3 pr-11 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none transition-all bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPw(!showConfirmPw)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 p-1 transition-colors"
                          tabIndex={-1}
                        >
                          {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isUpdatingPassword}
                        className="px-6 py-2.5 rounded-xl font-mono text-xs font-bold text-white transition-transform duration-150 ease-out active:scale-95 disabled:opacity-50 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.35)',
                        }}
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isUpdatingPassword ? 'Saving Password...' : 'Save'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── 3. Notifications Tab ── */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Notification Settings</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Configure alert notification dispatch thresholds and automated channels</p>
                  </div>

                  <div className="space-y-4">
                    <ToggleRow
                      label="Critical Threat Push Alerts"
                      detail="Instant browser notification when a high/critical risk email is detected"
                      checked={criticalAlerts}
                      onChange={() => {
                        const next = !criticalAlerts;
                        setCriticalAlerts(next);
                        NotificationRulesService.saveRules({ criticalAlerts: next }, activeUserEmail);
                        handleSyncSetting({ criticalAlerts: next });
                      }}
                      action={
                        <div className="flex items-center justify-between w-full gap-2 min-w-0">
                          <span className="text-slate-500 dark:text-gray-400 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono min-w-0 flex-1 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${criticalAlerts ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                            <span className="truncate">
                              {criticalAlerts ? (
                                <>Push alerts active<span className="hidden sm:inline"> (Browser + In-App)</span></>
                              ) : (
                                'Push alerts paused'
                              )}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestPushAlert();
                            }}
                            disabled={!criticalAlerts || isTestingPush}
                            className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 dark:bg-purple-500/15 dark:border-purple-500/30 dark:text-purple-300 font-bold transition-transform duration-150 ease-out active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer text-[10px] font-mono shrink-0 whitespace-nowrap"
                          >
                            <Bell className="w-3 h-3 shrink-0" />
                            <span>{isTestingPush ? 'Testing...' : 'Test Push Alert'}</span>
                          </button>
                        </div>
                      }
                    />
                    {isUser && (
                      <ToggleRow
                        label="Email Incident Notifications"
                        detail="Dispatch automated email reports when a case status changes"
                        checked={emailNotifications}
                        onChange={() => {
                          const next = !emailNotifications;
                          setEmailNotifications(next);
                          NotificationRulesService.saveRules({ emailNotifications: next }, activeUserEmail);
                          handleSyncSetting({ emailNotifications: next });
                        }}
                        action={
                          <div className="flex items-center justify-between w-full gap-2 min-w-0">
                            <span className="text-slate-500 dark:text-gray-400 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono min-w-0 flex-1 truncate">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${emailNotifications ? 'bg-cyan-500' : 'bg-gray-400'}`} />
                              <span className="truncate">
                                {emailNotifications ? `Delivering to: ${activeUserEmail}` : 'Email dispatch disabled'}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTestEmailNotice();
                              }}
                              disabled={!emailNotifications || isTestingEmail}
                              className="px-2.5 py-1 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-700 dark:bg-cyan-500/15 dark:border-cyan-500/30 dark:text-cyan-300 font-bold transition-transform duration-150 ease-out active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer text-[10px] font-mono shrink-0 whitespace-nowrap"
                            >
                              <Check className="w-3 h-3 shrink-0" />
                              <span>{isTestingEmail ? 'Notice Sent!' : (<>Send Sample <span className="hidden sm:inline">Incident </span>Notice</>)}</span>
                            </button>
                          </div>
                        }
                      />
                    )}
                    <ToggleRow
                      label="Weekly Intelligence Digest"
                      detail="Weekly summary report of top campaigns and IOCs"
                      checked={weeklyDigest}
                      onChange={() => {
                        const next = !weeklyDigest;
                        setWeeklyDigest(next);
                        NotificationRulesService.saveRules({ weeklyDigest: next }, activeUserEmail);
                        handleSyncSetting({ weeklyDigest: next });
                      }}
                      action={
                        <div className="flex items-center justify-between w-full gap-2 min-w-0">
                          <span className="text-slate-500 dark:text-gray-400 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono min-w-0 flex-1 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${weeklyDigest ? 'bg-purple-500' : 'bg-gray-400'}`} />
                            <span className="truncate">
                              {weeklyDigest ? (
                                <><span className="hidden sm:inline">Schedule: </span>Every Monday · 09:00 UTC</>
                              ) : (
                                'Weekly digest disabled'
                              )}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateDigest();
                            }}
                            disabled={!weeklyDigest || isGeneratingDigest}
                            className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 dark:bg-purple-500/15 dark:border-purple-500/30 dark:text-purple-300 font-bold transition-transform duration-150 ease-out active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer text-[10px] font-mono shrink-0 whitespace-nowrap"
                          >
                            <Sparkles className="w-3 h-3 shrink-0" />
                            <span>{isGeneratingDigest ? 'Generated!' : (<>Generate Digest<span className="hidden sm:inline"> Now</span></>)}</span>
                          </button>
                        </div>
                      }
                    />
                  </div>
                </div>
              )}


              {/* ── 5. Data Tab ── */}
              {activeTab === 'data' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Data Management</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Manage session cache and synthetic forensic states</p>
                  </div>

                  <div className="space-y-3">
                    {/* ── Clear Analysis Session (ephemeral tier only) ── */}
                    <div
                      className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-amber-500" /> Clear Analysis Session
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                          Clears only the active forensic session (Email Analyzer, Header Forensics, Threat Intelligence, Origin Investigation). Dashboard, Reports, Alerts &amp; Campaigns are <span className="text-slate-900 dark:text-white font-semibold">not affected</span>.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          resetActiveAnalysis();
                          clearEphemeralStorage();
                          setSessionCleared(true);
                          setTimeout(() => setSessionCleared(false), 2500);
                        }}
                        className="self-start sm:self-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-transform duration-150 ease-out active:scale-95 cursor-pointer"
                        style={{
                          background: sessionCleared ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.1)',
                          border: sessionCleared ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(251,191,36,0.25)',
                          color: sessionCleared ? '#16a34a' : '#d97706',
                        }}
                      >
                        {sessionCleared ? <Check className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        {sessionCleared ? 'Cleared!' : 'Clear Session'}
                      </button>
                    </div>

                    {/* ── Reload Synthetic Dataset ── */}
                    <div
                      className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Reload Synthetic Dataset</h4>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Reset demo cases, campaigns, and indicators</p>
                      </div>
                      <button
                        onClick={() => window.location.reload()}
                        className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/25 transition-transform duration-150 ease-out active:scale-95 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Reload
                      </button>
                    </div>

                    {/* ── Purge User Requests & Tickets ── */}
                    <div
                      className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Purge User Requests & Tickets
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                          Wipes all user-submitted tickets and investigation requests from local cache and remote database
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          if (window.confirm('Purge all user requests and tickets? This action cannot be undone.')) {
                            await clearAllTickets();
                            setTicketsCleared(true);
                            setTimeout(() => setTicketsCleared(false), 2500);
                          }
                        }}
                        className="self-start sm:self-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-transform duration-150 ease-out active:scale-95 cursor-pointer"
                        style={{
                          background: ticketsCleared ? 'rgba(34,197,94,0.12)' : 'rgba(244,63,94,0.1)',
                          border: ticketsCleared ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(244,63,94,0.25)',
                          color: ticketsCleared ? '#16a34a' : '#e11d48',
                        }}
                      >
                        {ticketsCleared ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                        {ticketsCleared ? 'Purged!' : 'Purge Requests'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 6. AI Engine Tab ── */}
              {activeTab === 'ai-engine' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      AI Engine — Google Gemini
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                      Mailveil utilizes Google Gemini Flash for zero-latency email threat forensics.
                    </p>
                  </div>

                  {/* Info banner */}
                  <div
                    className="rounded-xl p-4 flex items-start gap-3 bg-purple-500/10 border border-purple-500/25"
                  >
                    <Key className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed">
                      <span className="text-slate-900 dark:text-white font-semibold">Backend Integration:</span> Configured automatically through environment variables. (<code className="font-mono text-purple-600 dark:text-purple-300">End users do not need to provide their own keys.</code>)
                    </div>
                  </div>

                  {/* Active Model Status */}
                  <div
                    className="rounded-xl p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]"
                  >
                    <h4 className="text-[10px] font-mono font-bold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-2">Active Model &amp; Backend</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse"
                        />
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">gemini-3.6-flash</span>
                        <span className="text-[11px] text-slate-500 dark:text-gray-400 ml-2">JSON Schema Enforcement Enabled</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-700 dark:text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                        FREE TIER READY
                      </span>
                    </div>
                  </div>

                  {/* Test Connection */}
                  <div className="pt-2">
                    <button
                      onClick={handleTestClaudeKey}
                      disabled={claudeKeyTesting}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/25 transition-transform duration-150 ease-out active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {claudeKeyTesting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Cpu className="w-4 h-4" />
                      )}
                      {claudeKeyTesting ? 'Testing Engine…' : 'Test AI Connection'}
                    </button>

                    {/* Test result */}
                    {claudeKeyTestResult === 'ok' && (
                      <div
                        className="rounded-xl p-3.5 flex items-center gap-2.5 mt-3 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/25"
                      >
                        <Check className="w-4 h-4 text-emerald-600 dark:text-green-400 shrink-0" />
                        <span className="text-xs text-emerald-800 dark:text-green-300 font-semibold">Gemini AI engine is live and operational.</span>
                      </div>
                    )}
                    {claudeKeyTestResult === 'fail' && (
                      <div
                        className="rounded-xl p-3.5 flex items-center gap-2.5 mt-3 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/25"
                      >
                        <Shield className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                        <span className="text-xs text-red-800 dark:text-red-300 font-semibold">Could not reach Gemini. Please ensure <code className="font-mono text-red-600 dark:text-red-200">VITE_GEMINI_API_KEY</code> is set in <code className="font-mono text-red-600 dark:text-red-200">.env</code>.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </SlideIn >
    </div >
  );
}

function ToggleRow({
  label,
  detail,
  checked,
  onChange,
  action,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-4 transition-all bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.04]"
    >
      <div className="flex items-center justify-between cursor-pointer select-none" onClick={onChange}>
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">{label}</h4>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{detail}</p>
        </div>
        <div
          className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ml-3 ${
            checked ? 'bg-sky-500 dark:bg-purple-600' : 'bg-slate-300 dark:bg-white/10'
          }`}
        >
          <div
            className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-sm"
            style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </div>
      </div>
      {action && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5">
          {action}
        </div>
      )}
    </div>
  );
}
