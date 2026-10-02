import Spline from '@splinetool/react-spline';
import { useState } from 'react';
import {
  Shield, ArrowRight, Mail, Zap, Eye, EyeOff, Lock, Globe,
  UserPlus, ChevronLeft, Check, Sparkles, UserCheck, AlertTriangle,
} from 'lucide-react';
import { TransparentLogo } from '@/components/TransparentLogo';
import { buildUser, type UserRole, deriveRoleFromEmail, deriveDisplayName } from '@/contexts/AuthContext';
import { GoogleAuthService } from '@/services/googleAuthService';
import { GmailIngestionService } from '@/services/gmailIngestionService';
import { GoogleSetupModal } from '@/components/GoogleSetupModal';
import { SupabaseDataService } from '@/services/supabaseDataService';
import { UserNotificationService } from '@/services/userNotificationService';

import { AuthAccountService, hashPassword, type StoredAccount } from '@/services/authAccountService';

interface WelcomePageProps {
  onNavigate: (route: string, opts?: { role?: UserRole }) => void;
}

export { type StoredAccount };
export const getStoredAccounts = () => AuthAccountService.getStoredAccounts();
export const saveStoredAccount = (acc: StoredAccount) => AuthAccountService.saveStoredAccount(acc);
export const checkEmailAlreadyExists = (email: string) => AuthAccountService.checkEmailAlreadyExists(email);

/* ─── Auth hook (Supabase + localStorage) ─── */
function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() =>
    localStorage.getItem('sentinel_auth') === 'true'
  );

  async function login(
    email: string,
    password: string,
    requestedRole?: UserRole,
    mode: 'login' | 'signup' = 'login'
  ): Promise<{ success: boolean; role?: UserRole; error?: string }> {
    const e = email.trim().toLowerCase();
    const p = password.trim();

    if (!e || !p) {
      return { success: false, error: 'Please fill in all fields.' };
    }

    // Always clear mismatched Google tokens if logging in as an account that differs from the active Google profile
    const existingGoogleProfile = GoogleAuthService.getUserProfile();
    if (existingGoogleProfile?.email && existingGoogleProfile.email.toLowerCase().trim() !== e) {
      GoogleAuthService.signOut();
    }

    // If attempting to Sign Up: check if email is already registered
    if (mode === 'signup') {
      const check = await checkEmailAlreadyExists(e);
      if (check.exists) {
        return {
          success: false,
          error: 'Account already created through email or Gmail. Please sign in to use.',
        };
      }

      // New account registration with SHA-256 hashed password
      const finalRole: UserRole = deriveRoleFromEmail(e);
      const hashedPassword = await hashPassword(p);
      saveStoredAccount({
        email: e,
        method: 'email',
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      });

      localStorage.setItem('sentinel_auth', 'true');
      localStorage.setItem('sentinel_user', e);
      localStorage.setItem('sentinel_user_role', finalRole);
      setIsLoggedIn(true);

      // Async sync profile to Supabase
      SupabaseDataService.upsertProfile({
        email: e,
        role: finalRole,
        displayName: deriveDisplayName(e),
      }).catch(() => {});

      return { success: true, role: finalRole };
    }

    // Login mode
    // Try Supabase auth first if available
    try {
      const supabaseRes = await SupabaseDataService.signInWithEmail(e, p);
      if (supabaseRes.success && supabaseRes.role) {
        const resolvedRole = deriveRoleFromEmail(e);
        const hashedPassword = await hashPassword(p);
        saveStoredAccount({ email: e, method: 'email', password: hashedPassword });
        localStorage.setItem('sentinel_auth', 'true');
        localStorage.setItem('sentinel_user', e);
        localStorage.setItem('sentinel_user_role', resolvedRole);
        setIsLoggedIn(true);
        return { success: true, role: resolvedRole };
      }
    } catch {
      // Fallback to local DB check
    }

    // Check stored accounts (USERS_DB + previously registered)
    const storedAccounts = getStoredAccounts();
    const known = storedAccounts.find((u) => u.email === e);
    if (known) {
      if (known.method === 'google' && !known.password) {
        return {
          success: false,
          error: 'This account was registered with Google. Please use Continue with Google to sign in.',
        };
      }
      const isPasswordValid = await AuthAccountService.verifyPassword(e, p);
      if (!isPasswordValid) {
        return { success: false, error: 'Incorrect password.' };
      }
      const role = deriveRoleFromEmail(known.email);
      localStorage.setItem('sentinel_auth', 'true');
      localStorage.setItem('sentinel_user', known.email);
      localStorage.setItem('sentinel_user_role', role);
      setIsLoggedIn(true);

      const existingName =
        localStorage.getItem(`sentinel_user_display_name_${known.email}`) ||
        localStorage.getItem('sentinel_user_display_name');
      if (existingName) {
        localStorage.setItem(`sentinel_user_display_name_${known.email}`, existingName);
        localStorage.setItem('sentinel_user_display_name', existingName);
      }

      return { success: true, role };
    }

    return {
      success: false,
      error: 'No account found with this email. Please sign up first.',
    };
  }

  function logout() {
    localStorage.removeItem('sentinel_auth');
    localStorage.removeItem('sentinel_user');
    localStorage.removeItem('sentinel_user_role');
    localStorage.removeItem('sentinel_google_user_profile');
    sessionStorage.removeItem('sentinel_google_user_profile');
    localStorage.removeItem('sentinel_google_access_token');
    sessionStorage.removeItem('sentinel_google_access_token');
    localStorage.removeItem('sentinel_google_token_expiry');
    sessionStorage.removeItem('sentinel_google_token_expiry');
    setIsLoggedIn(false);
  }

  const userEmail = localStorage.getItem('sentinel_user') ?? '';
  return { isLoggedIn, login, logout, userEmail };
}

/* ─── Google icon ─── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 12.075 17.64 9.767 17.64 9.2z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

/* ─── Apple icon ─── */
function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white shrink-0">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.13-1.96.99-3.12-1 .04-2.22.67-2.92 1.49-.63.73-1.18 1.9-1.03 3.05 1.12.09 2.37-.6 3.03-1.42z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   Auth Modal — premium dark design
═══════════════════════════════════════════════════════════ */
interface AuthModalProps {
  initialMode?: 'login' | 'signup';
  onClose: () => void;
  onSuccess: (email: string, password: string, role?: UserRole, mode?: 'login' | 'signup') => Promise<{ success: boolean; error?: string } | void> | void;
  onGoogleSignIn?: (role?: UserRole) => void;
  isGoogleLoading?: boolean;
}

function AuthModal({ initialMode = 'login', onClose, onSuccess, onGoogleSignIn, isGoogleLoading }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<UserRole>('user');
  const [error, setError] = useState('');
  const [appleToast, setAppleToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleAppleClick() {
    setAppleToast(true);
    setTimeout(() => setAppleToast(false), 3000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (tab === 'signup') {
      if (cleanPassword !== confirmPassword.trim()) {
        setError('Passwords do not match.');
        return;
      }
      if (cleanPassword.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }

      setIsSubmitting(true);
      try {
        const check = await checkEmailAlreadyExists(cleanEmail);
        if (check.exists) {
          setError('Account already created through email or Gmail. Please sign in to use.');
          setIsSubmitting(false);
          return;
        }
      } catch {
        // proceed
      }
    }

    setIsSubmitting(true);
    try {
      const resolvedRole = deriveRoleFromEmail(cleanEmail);
      const res = await onSuccess(cleanEmail, cleanPassword, resolvedRole, tab);
      if (res && typeof res === 'object' && !res.success && res.error) {
        setError(res.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[390px] mx-4 rounded-3xl p-6 sm:p-7 max-h-[92vh] overflow-y-auto overflow-x-hidden scrollbar-thin animate-slide-up"
        style={{
          background: 'rgba(18,18,26,0.97)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Back / close */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/8 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Brand */}
        <div className="flex flex-col items-center mb-6 mt-1">
          <TransparentLogo src="/MAILVEIL_DARKMODE.png" alt="Mailveil" className="h-14 sm:h-16 w-auto object-contain mb-2 drop-shadow-lg" />
          <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase font-medium">Secure Access Portal</p>
        </div>

        {/* Tab switcher */}
        <div className="flex mb-5 border-b border-white/8">
          {(['login', 'signup'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className="relative flex-1 pb-3 text-sm font-semibold transition-colors"
              style={{ color: tab === t ? '#ffffff' : 'rgba(255,255,255,0.35)' }}
            >
              {t === 'login' ? 'Sign In' : 'Sign Up'}
              {tab === t && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Note on Sign Up */}
        {tab === 'signup' && (
          <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <span>New accounts are created as <strong>Standard User</strong> (Protected Mailbox &amp; Threat Detection).</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Email */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Mail className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
            />
          </div>

          {/* Password */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Lock className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="text-gray-600 hover:text-gray-400 transition-colors"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirm password (signup only) */}
          {tab === 'signup' && (
            <div
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Lock className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
              />
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-xs text-red-300 flex items-start gap-2.5 animate-slide-down">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed text-left">
                <span>{error}</span>
                {tab === 'signup' && error.toLowerCase().includes('already created') && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab('login');
                      setError('');
                    }}
                    className="mt-1.5 text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 block cursor-pointer"
                  >
                    Click here to Sign In &rarr;
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Primary CTA */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm mt-1 hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 50%, #8b5cf6 100%)',
              boxShadow: '0 4px 24px rgba(99,102,241,0.4)',
            }}
          >
            {isSubmitting ? (
              <span>{tab === 'login' ? 'Signing in...' : 'Checking account...'}</span>
            ) : (
              <span>{tab === 'login' ? 'Sign In' : 'Create User Account'}</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <span className="text-gray-600 text-xs">or continue with</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* OAuth buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            disabled={isGoogleLoading}
            onClick={() => onGoogleSignIn ? onGoogleSignIn() : onSuccess('demouser1@gmail.com', 'google-oauth', 'user')}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl text-white text-sm font-medium transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <GoogleIcon />
            {isGoogleLoading
              ? 'Connecting to Google...'
              : 'Continue with Google'}
          </button>
          <button
            type="button"
            onClick={handleAppleClick}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl text-white text-sm font-medium transition-all hover:brightness-110 active:scale-95"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <AppleIcon />
            Continue with Apple
          </button>
          {appleToast && (
            <div
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium animate-slide-down"
              style={{ background: 'rgba(255,200,50,0.08)', border: '1px solid rgba(255,200,50,0.2)', color: 'rgba(255,210,80,0.9)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Apple Sign-In is not available yet — coming soon!
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ─── Feature shortcuts ─── */
const FEATURES = [
  { icon: Mail, label: 'Email Analyzer', desc: 'Deep-scan suspicious emails in seconds', route: 'email-analyzer', demo: true },
  { icon: Eye, label: 'Threat Intelligence', desc: 'Real-time IOC lookups & threat feeds', route: 'threat-intelligence', demo: false },
  { icon: Zap, label: 'Header Forensics', desc: 'Expose forged routing & sender spoofing', route: 'header-forensics', demo: false },
  { icon: Globe, label: 'Origin Investigation', desc: 'Geographic infrastructure & relay telemetry', route: 'origin-investigation', demo: false },
];

/* ═══════════════════════════════════════════════════════════════════
   WelcomePage
═══════════════════════════════════════════════════════════════════ */
export function WelcomePage({ onNavigate }: WelcomePageProps) {
  const { isLoggedIn, login } = useAuth();

  // null = closed | 'login' | 'signup' = open in that tab
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null);
  const [authError, setAuthError] = useState('');
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // pendingDemo tracks whether we should navigate to email-analyzer after successful login
  const [pendingDemo, setPendingDemo] = useState(false);

  async function handleGoogleSignIn(requestedRole?: UserRole) {
    setAuthError('');
    const clientId = GoogleAuthService.getClientId();
    if (!clientId) {
      setSetupModalOpen(true);
      return;
    }

    try {
      setGoogleLoading(true);
      const { token, profile } = await GoogleAuthService.signInWithGoogle();

      // Only official master SOC analyst accounts receive 'analyst' role.
      // ALL other emails & new Google sign-ins strictly receive 'user'.
      const resolvedRole: UserRole = deriveRoleFromEmail(profile.email);

      // Set user session in storage
      localStorage.setItem('sentinel_auth', 'true');
      localStorage.setItem('sentinel_user', profile.email);
      localStorage.setItem('sentinel_user_role', resolvedRole);

      // Preserve any custom display name saved by the user
      const cleanEmail = profile.email.toLowerCase().trim();
      const savedCustomName =
        localStorage.getItem(`sentinel_user_display_name_${cleanEmail}`) ||
        localStorage.getItem('sentinel_user_display_name');
      if (savedCustomName) {
        localStorage.setItem(`sentinel_user_display_name_${cleanEmail}`, savedCustomName);
        localStorage.setItem('sentinel_user_display_name', savedCustomName);
      }

      // Save Google account to registered accounts
      saveStoredAccount({
        email: profile.email,
        method: 'google',
        createdAt: new Date().toISOString(),
      });

      // Background sync to Supabase profiles
      SupabaseDataService.syncGoogleUser(profile, resolvedRole).catch((e) => {
        console.warn('Supabase Google user sync error:', e);
      });

      // Trigger background sync of real emails from Gmail if user
      GmailIngestionService.syncGmailEmails(token, profile.email).catch((e) => {
        console.warn('Initial live Gmail sync error:', e);
      });

      if (resolvedRole === 'user') {
        const existingNotifs = UserNotificationService.getUserNotifications(profile.email);
        const hasGmailNotif = existingNotifs.some((n) => n.id.startsWith('notif-gmail'));
        if (!hasGmailNotif) {
          UserNotificationService.addUserNotification(profile.email, {
            id: `notif-gmail-auth-${Date.now()}`,
            title: 'Gmail Connected',
            msg: `Gmail account (${profile.email}) connected for automated threat monitoring.`,
            sev: 'info',
            category: 'system',
            route: 'emails',
          });
        }
      }

      setAuthModal(null);
      setGoogleLoading(false);

      const targetRoute = resolvedRole === 'analyst' ? 'dashboard' : 'emails';
      onNavigate(targetRoute, { role: resolvedRole });
    } catch (err: any) {
      setGoogleLoading(false);
      if (err?.message === 'GOOGLE_CLIENT_ID_MISSING') {
        setSetupModalOpen(true);
      } else {
        setAuthError(err?.message || 'Google sign in failed.');
      }
    }
  }

  function handleAnalyzeEmailClick() {
    if (isLoggedIn) {
      const storedEmail = localStorage.getItem('sentinel_user') || '';
      const storedRole = (localStorage.getItem('sentinel_user_role') as UserRole) || deriveRoleFromEmail(storedEmail);
      const targetRoute = storedRole === 'user' ? 'emails' : 'email-analyzer';
      onNavigate(targetRoute, { role: storedRole });
    } else {
      setPendingDemo(true);
      setAuthModal('login');
    }
  }

  async function handleAuthSuccess(
    email: string,
    password: string,
    selectedRole?: UserRole,
    mode: 'login' | 'signup' = 'login'
  ) {
    const result = await login(email, password, selectedRole, mode);
    if (!result.success) {
      setAuthError(result.error ?? 'Authentication failed.');
      return result;
    }
    const role = result.role ?? 'user';
    setAuthError('');
    setAuthModal(null);

    if (pendingDemo) {
      setPendingDemo(false);
      const target = role === 'analyst' ? 'email-analyzer' : 'emails';
      onNavigate(target, { role });
    } else {
      const defaultRoute = role === 'analyst' ? 'dashboard' : 'emails';
      onNavigate(defaultRoute, { role });
    }
  }

  function handleAuthClose() {
    setAuthModal(null);
    setPendingDemo(false);
    setAuthError('');
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">

      {/* ══ LAYER 0 — Spline cinematic background (camera fully locked) ══ */}
      <div
        className="absolute inset-0 z-0"
        style={{ pointerEvents: 'none', filter: 'brightness(1.4) contrast(1.05)' }}
      >
        <Spline
          scene="https://prod.spline.design/M-YKjxruQiuxGBtY/scene.splinecode"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, transparent 40%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* ══ LAYER 1 — MAILVEIL UI ══ */}
      <div className="absolute inset-0 z-10 flex flex-col overflow-y-auto md:overflow-hidden touch-scroll" style={{ pointerEvents: 'none' }}>

        {/* ─ Top bar ─ */}
        <div
          className="flex items-center gap-3 px-4 sm:px-7"
          style={{
            pointerEvents: 'auto',
            paddingTop: 'max(1.25rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))',
          }}
        >
          <TransparentLogo src="/MAILVEIL_DARKMODE.png" alt="Mailveil" className="h-12 sm:h-16 md:h-20 w-auto object-contain drop-shadow-xl" />

          {/* Auth controls — only shown when NOT logged in */}
          {!isLoggedIn && (
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setAuthModal('login')}
                className="text-xs text-gray-300 hover:text-white font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-white/8 transition-all"
              >
                Log In
              </button>
              <button
                onClick={() => setAuthModal('signup')}
                className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white text-xs font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/20 hover:bg-white/18 hover:border-white/35 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-[20px]" />

        {/* ─ Hero ─ */}
        <div className="flex flex-col items-center text-center px-4 sm:px-6 pt-4 sm:pt-0 pb-6 md:pb-10" style={{ pointerEvents: 'auto' }}>
          <h1
            className="text-3xl sm:text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tight mb-3 sm:mb-5 animate-slide-up"
            style={{ textShadow: '0 4px 48px rgba(0,0,0,0.6)' }}
          >
            AI-Powered
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">
              Email Defense
            </span>
          </h1>

          <p
            className="text-xs sm:text-base md:text-lg text-gray-300 max-w-lg mb-6 sm:mb-10 leading-relaxed animate-fade-in"
            style={{ animationDelay: '0.15s', textShadow: '0 2px 16px rgba(0,0,0,0.8)' }}
          >
            Detect BEC, phishing &amp; advanced email threats with military-grade forensic analysis.
            Real-time intelligence. Zero blind spots.
          </p>

          {/* CTA row */}
          <div
            className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in"
            style={{ animationDelay: '0.25s' }}
          >
            {/* ★ Analyze Email */}
            <button
              id="analyze-email-btn"
              onClick={handleAnalyzeEmailClick}
              className="glow-btn group relative flex items-center gap-2 text-white font-semibold text-sm px-7 sm:px-8 py-3.5 sm:py-4 rounded-full transition-all duration-200 hover:scale-105 active:scale-100"
              style={{
                background: 'linear-gradient(135deg, rgba(10,10,20,0.95) 0%, rgba(5,5,14,0.98) 100%)',
                boxShadow: '0 0 32px rgba(96,165,250,0.08)',
              }}
            >
              <Mail className="w-4 h-4 text-blue-300" />
              <span>Analyze Email</span>
              <ArrowRight className="w-4 h-4 text-blue-300 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* ─ Feature cards ─ */}
        <div className="px-4 sm:px-5 pb-6 sm:pb-7" style={{ pointerEvents: 'auto' }}>
          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="group text-left bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 sm:p-3.5 hover:bg-white/8 hover:border-white/25 transition-all duration-200 cursor-default select-none"
              >
                <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center mb-2 sm:mb-2.5 group-hover:bg-white/15 transition-colors">
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <p className="text-gray-200 text-xs font-medium mb-0.5">{label}</p>
                <p className="text-gray-400 text-[11px] leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Auth modal ── */}
      {authModal && (
        <AuthModal
          initialMode={authModal}
          onClose={handleAuthClose}
          onSuccess={handleAuthSuccess}
          onGoogleSignIn={handleGoogleSignIn}
          isGoogleLoading={googleLoading}
        />
      )}

      {/* ── Google Setup Modal ── */}
      <GoogleSetupModal
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        onSuccessConnect={() => {
          setSetupModalOpen(false);
          handleGoogleSignIn();
        }}
      />
      {/* Show auth error as an overlay toast if needed */}
      {authError && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm text-red-300 font-medium"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', backdropFilter: 'blur(12px)' }}>
          {authError}
        </div>
      )}
    </div>
  );
}
