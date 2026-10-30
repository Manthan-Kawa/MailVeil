import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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
  const [bio, setBio] = useState(() => currentUser?.bio || (userRole === 'analyst' ? 'Cybersecurity Analyst & SOC Lead specializing in SENTINEL-X forensic investigation and threat correlation.' : 'Standard user with active email threat monitoring.'));
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
            : 'Password created successfully! You can now sign in using your email and new password.'
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
            : 'Account password was created successfully.',
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
    const targetEmail = (email || currentUser?.email || localStorage.getItem('sentinel_user') || 'user@sentinel.local').trim().toLowerCase();
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
    const targetEmail = email || currentUser?.email || 'user@sentinel.local';
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
            <h2 className="text-2xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">System Settings</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Manage profile credentials, appearance themes, notification settings, and security keys
            </p>
          </div>
        </div>
      </SlideIn>

      {/* ── Main Layout: Sidebar & Content Panel ── */}
      <SlideIn delay={80} direction="up">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── Left Sidebar Navigation ── */}
          <div className="lg:col-span-1">
            <div
              className="relative isolate rounded-2xl p-2 flex lg:flex-col overflow-x-auto overflow-y-hidden lg:overflow-visible scrollbar-none gap-1 lg:gap-1.5 touch-scroll touch-pan-x overscroll-x-contain bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm"
            >
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative z-10 shrink-0 lg:w-full flex items-center gap-3 px-3 py-2 lg:px-3.5 lg:py-2.5 rounded-xl transition-colors duration-200 group text-left whitespace-nowrap cursor-pointer ${
                      active
                        ? '!text-white font-bold'
                        : 'text-gray-600 dark:text-zinc-400 font-medium hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-zinc-800/80'
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="settingsActiveTabPill"
                        className="absolute inset-0 rounded-xl bg-blue-600 dark:bg-blue-600 shadow-md shadow-blue-500/25 border border-blue-500/60 z-0 pointer-events-none"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <div className="relative z-10 flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-colors duration-200 ${
                          active ? '!text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200'
                        }`}
                      />
                      <span className={`text-xs font-semibold ${active ? '!text-white' : ''}`}>
                        {tab.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right Content Area ── */}
          <div className="lg:col-span-3">
            <div
              key={activeTab}
              className="rounded-2xl p-4 sm:p-7 min-h-[500px] bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom-2"
            >
              {/* ── 1. Profile Tab ── */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 tracking-tight">Profile Information</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Personal identity credentials and operational focus
                    </p>
                  </div>

                  {/* Avatar Card */}
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0 overflow-hidden border border-gray-200 dark:border-zinc-800/50"
                      style={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        boxShadow: isDark
                          ? '0 4px 16px rgba(0,0,0,0.5)'
                          : '0 2px 8px rgba(0,0,0,0.08)' }}
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
                      <h4 className="text-base font-bold text-gray-900 dark:text-zinc-100">{displayName || currentUser?.displayName || 'User'}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {userRole === 'analyst' ? 'Cybersecurity Analyst · Sentinel-X SOC' : 'Standard Organization User'}
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-mono font-bold text-white bg-blue-600 px-2.5 py-0.5 rounded-lg shadow-sm">
                        {userRole === 'analyst' ? 'ANALYST ACCOUNT' : 'USER ACCOUNT'}
                      </span>
                    </div>
                  </div>

                  {/* Form Inputs */}
                  <div className="space-y-4 pt-2">
                    {/* Display Name */}
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2">
                        DISPLAY NAME
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 text-xs text-gray-900 dark:text-zinc-100 font-mono placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none transition-all bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
                      />
                    </div>

                    {/* Email (Read Only) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-mono font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">
                          EMAIL ADDRESS
                        </label>
                        <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded border border-gray-200 dark:border-zinc-800/50">
                          <Lock className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400" />
                          LOCKED
                        </span>
                      </div>
                      <input
                        type="email"
                        value={email || currentUser?.email || localStorage.getItem('sentinel_user') || ''}
                        readOnly
                        disabled
                        className="w-full rounded-xl px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono cursor-not-allowed select-none focus:outline-none transition-all bg-gray-50 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800/50"
                      />
                      <p className="text-[10px] text-gray-500 dark:text-gray-500 font-mono mt-1.5">
                        Account email is tied to your authentication credentials and cannot be changed.
                      </p>
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2">
                        BIO / ROLE FOCUS
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                        placeholder="Describe your security focus or operational role..."
                        className="w-full rounded-xl p-4 text-xs text-gray-900 dark:text-zinc-100 font-mono placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none resize-none transition-all scrollbar-thin bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
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
                        boxShadow: 'none' }}
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

                  <div className="pt-4 border-t border-gray-200 dark:border-zinc-800/50">
                    <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 tracking-tight">Display & Animation Preferences</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Customize interface animations and motion preferences</p>
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
                  </div>
                </div>
              )}

              {/* ── 2.5 Password Update Tab (Directly below Appearance) ── */}
              {activeTab === 'password' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 tracking-tight">Password Security</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {hasExistingPassword
                        ? 'Update your account authentication password. Your current password is required.'
                        : 'Set a custom password to enable direct email & password sign-in alongside Google OAuth.'}
                    </p>
                  </div>

                  {/* Account authentication method banner */}
                  <div
                    className="p-3.5 rounded-2xl flex items-center justify-between gap-3 flex-wrap bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#edf5ff] dark:bg-white border border-blue-100 dark:border-white flex items-center justify-center text-blue-600 dark:text-blue-600 shadow-sm shrink-0 transition-colors">
                        <Key className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                          {isGoogleAccount ? 'Google OAuth Registered Account' : 'Email & Password Account'}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                          {activeUserEmail}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-lg bg-blue-600 text-white shadow-sm">
                      {isGoogleAccount
                        ? hasExistingPassword
                          ? 'GOOGLE SIGN-IN (PASSWORD SET — 3 FIELDS)'
                          : 'GOOGLE SIGN-IN (NO PASSWORD — 2 FIELDS)'
                        : 'EMAIL SIGN-UP (3 FIELDS)'}
                    </span>
                  </div>

                  {/* Security Notice */}
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
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
                          className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline cursor-pointer shrink-0"
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
                        <label className="block text-[10px] font-mono font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2">
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
                            className="w-full rounded-xl px-4 py-3 pr-11 text-xs text-gray-900 dark:text-zinc-100 font-mono placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none transition-all bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPw(!showOldPw)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 p-1 transition-colors"
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
                      <label className="block text-[10px] font-mono font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2">
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
                          className="w-full rounded-xl px-4 py-3 pr-11 text-xs text-gray-900 dark:text-zinc-100 font-mono placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none transition-all bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 p-1 transition-colors"
                          tabIndex={-1}
                        >
                          {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password (both Google and Email accounts) */}
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2">
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
                          className="w-full rounded-xl px-4 py-3 pr-11 text-xs text-gray-900 dark:text-zinc-100 font-mono placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none transition-all bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPw(!showConfirmPw)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 p-1 transition-colors"
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
                          boxShadow: 'none' }}
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
                    <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 tracking-tight">Notification Settings</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Configure alert notification dispatch thresholds and automated channels</p>
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
                          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono min-w-0 flex-1 truncate">
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
                            className="px-3.5 py-1.5 rounded-xl text-white font-bold transition-transform duration-150 ease-out active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer text-xs font-mono shrink-0 whitespace-nowrap"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                          >
                            <Bell className="w-3.5 h-3.5 shrink-0 text-white" />
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
                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono min-w-0 flex-1 truncate">
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
                              className="px-3.5 py-1.5 rounded-xl text-white font-bold transition-transform duration-150 ease-out active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer text-xs font-mono shrink-0 whitespace-nowrap"
                              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                            >
                              <Check className="w-3.5 h-3.5 shrink-0 text-white" />
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
                          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono min-w-0 flex-1 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${weeklyDigest ? 'bg-blue-500' : 'bg-gray-400'}`} />
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
                            className="px-3.5 py-1.5 rounded-xl text-white font-bold transition-transform duration-150 ease-out active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer text-xs font-mono shrink-0 whitespace-nowrap"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                          >
                            <Sparkles className="w-3.5 h-3.5 shrink-0 text-white" />
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
                    <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 tracking-tight">Data Management</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage session cache and synthetic forensic states</p>
                  </div>

                  <div className="space-y-3">
                    {/* ── Clear Analysis Session (ephemeral tier only) ── */}
                    <div
                      className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-amber-500" /> Clear Analysis Session
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Clears only the active forensic session (Email Analyzer, Header Forensics, Threat Intelligence, Origin Investigation). Dashboard, Reports, Alerts &amp; Campaigns are <span className="text-gray-900 dark:text-zinc-100 font-semibold">not affected</span>.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          resetActiveAnalysis();
                          clearEphemeralStorage();
                          setSessionCleared(true);
                          setTimeout(() => setSessionCleared(false), 2500);
                        }}
                        className="self-start sm:self-auto shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-white transition-transform duration-150 ease-out active:scale-95 cursor-pointer"
                        style={{
                          background: sessionCleared
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        }}
                      >
                        {sessionCleared ? <Check className="w-3.5 h-3.5 text-white" /> : <RefreshCw className="w-3.5 h-3.5 text-white" />}
                        {sessionCleared ? 'Cleared!' : 'Clear Session'}
                      </button>
                    </div>

                    {/* ── Reload Synthetic Dataset ── */}
                    <div
                      className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100">Reload Synthetic Dataset</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Reset demo cases, campaigns, and indicators</p>
                      </div>
                      <button
                        onClick={() => window.location.reload()}
                        className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-white transition-transform duration-150 ease-out active:scale-95 cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-white" /> Reload
                      </button>
                    </div>

                    {/* ── Purge User Requests & Tickets ── */}
                    <div
                      className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Purge User Requests & Tickets
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
                        className="self-start sm:self-auto shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-white transition-transform duration-150 ease-out active:scale-95 cursor-pointer"
                        style={{
                          background: ticketsCleared
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                        }}
                      >
                        {ticketsCleared ? <Check className="w-3.5 h-3.5 text-white" /> : <Trash2 className="w-3.5 h-3.5 text-white" />}
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
                    <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      AI Engine — Google Gemini
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Sentinel-X utilizes Google Gemini Flash for zero-latency email threat forensics.
                    </p>
                  </div>

                  {/* Info banner (Subtle translucent blue) */}
                  <div
                    className="rounded-xl p-4 flex items-start gap-3 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-gray-700 dark:text-zinc-300"
                  >
                    <Key className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <span className="text-gray-900 dark:text-white font-bold">Backend Integration:</span> Configured automatically through environment variables. (<code className="font-mono text-blue-700 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-900/40 px-1 py-0.5 rounded text-[11px]">End users do not need to provide their own keys.</code>)
                    </div>
                  </div>

                  {/* Active Model Status */}
                  <div
                    className="rounded-xl p-4 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
                  >
                    <h4 className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2">Active Model &amp; Backend</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"
                        />
                        <span className="text-xs font-mono font-bold text-gray-900 dark:text-zinc-100">gemini-3.6-flash</span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-2">JSON Schema Enforcement Enabled</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-white bg-blue-600 px-2.5 py-1 rounded-lg shadow-sm">
                        FREE TIER READY
                      </span>
                    </div>
                  </div>

                  {/* Test Connection */}
                  <div className="pt-2">
                    <button
                      onClick={handleTestClaudeKey}
                      disabled={claudeKeyTesting}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-transform duration-150 ease-out active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                    >
                      {claudeKeyTesting ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Cpu className="w-4 h-4 text-white" />
                      )}
                      {claudeKeyTesting ? 'Testing Engine…' : 'Test AI Connection'}
                    </button>

                    {/* Test result */}
                    {claudeKeyTestResult === 'ok' && (
                      <div
                        className="rounded-xl p-3.5 flex items-center gap-2.5 mt-3 bg-emerald-100/70 border border-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-700/50"
                      >
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-xs text-emerald-900 dark:text-emerald-300 font-semibold">Gemini AI engine is live and operational.</span>
                      </div>
                    )}
                    {claudeKeyTestResult === 'fail' && (
                      <div
                        className="rounded-xl p-3.5 flex items-center gap-2.5 mt-3 bg-red-100/70 border border-red-300 dark:bg-red-950/60 dark:border-red-700/50"
                      >
                        <Shield className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                        <span className="text-xs text-red-900 dark:text-red-300 font-semibold">Could not reach Gemini. Please ensure <code className="font-mono text-red-700 dark:text-red-200">VITE_GEMINI_API_KEY</code> is set in <code className="font-mono text-red-700 dark:text-red-200">.env</code>.</span>
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
      className="rounded-xl p-4 transition-all bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-700/50"
    >
      <div className="flex items-center justify-between cursor-pointer select-none" onClick={onChange}>
        <div>
          <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100">{label}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{detail}</p>
        </div>
        <div
          className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ml-3 ${
            checked ? 'bg-blue-600 dark:bg-blue-600' : 'bg-slate-300 dark:bg-zinc-700'
          }`}
        >
          <div
            className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-sm"
            style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </div>
      </div>
      {action && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-zinc-800/50">
          {action}
        </div>
      )}
    </div>
  );
}
