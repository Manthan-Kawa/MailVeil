/**
 * AuthContext.tsx
 *
 * Provides the currently authenticated user (email + role) across the app.
 * Synchronizes with Supabase profiles and persists across page refreshes.
 */
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  KEY_AUTH,
  KEY_USER,
  KEY_USER_ROLE,
  KEY_GOOGLE_USER_PROFILE,
  KEY_USER_DISPLAY_NAME,
  KEY_GOOGLE_ACCESS_TOKEN,
  KEY_GOOGLE_TOKEN_EXPIRY,
} from '@/utils/storageKeys';
import { SupabaseDataService } from '@/services/supabaseDataService';
import { getSupabaseClient, isSupabaseConfigured } from '@/config/supabaseClient';
const analystAvatar = '/analyst.png';

export type UserRole = 'analyst' | 'user';

export interface AuthUser {
  email: string;
  role: UserRole;
  /** Display name from Google Profile or derived from email or Supabase profile */
  displayName: string;
  /** Two-letter initials for avatar */
  initials: string;
  /** Avatar profile picture */
  avatarUrl?: string;
  /** Bio summary */
  bio?: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  setCurrentUser: (user: AuthUser | null) => void;
  updateUserProfile: (updates: Partial<AuthUser>) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function deriveDisplayName(email: string): string {
  const local = email.split('@')[0];
  return local
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function deriveInitials(nameOrEmail: string): string {
  const trimmed = nameOrEmail.trim();
  if (trimmed.includes('@')) {
    const local = trimmed.split('@')[0];
    const parts = local.replace(/[._-]/g, ' ').split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return local.slice(0, 2).toUpperCase();
  }
  const parts = trimmed.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function deriveRoleFromEmail(email: string): UserRole {
  const e = email.toLowerCase().trim();
  // Dedicated SOC analyst accounts are granted 'analyst' role.
  // ALL standard accounts & Google sign-ins strictly receive 'user'.
  if (
    e === 'sentinelx.analyst@gmail.com' ||
    e === 'analyst@gmail.com' ||
    e === 'demo@analyst' ||
    e === 'demo@analyst.com' ||
    e.startsWith('analyst@') ||
    e.endsWith('@analyst')
  ) {
    return 'analyst';
  }
  return 'user';
}

/**
 * Retrieves any custom display name saved by the user from localStorage.
 * Checks per-account storage first, then profile cache, then global display name.
 */
export function getSavedDisplayName(email: string): string | undefined {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return undefined;
  try {
    // 1. Check account-specific display name
    const perAccount = localStorage.getItem(`${KEY_USER_DISPLAY_NAME}_${cleanEmail}`);
    if (perAccount && perAccount.trim() && perAccount.trim() !== cleanEmail.split('@')[0]) {
      return perAccount.trim();
    }
    // 2. Check cached profile
    const cachedRaw = localStorage.getItem(`sentinel_profile_${cleanEmail}`);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      if (parsed?.displayName && parsed.displayName.trim() && parsed.displayName.trim() !== cleanEmail.split('@')[0]) {
        return parsed.displayName.trim();
      }
    }
    // 3. Check global display name if current session email matches
    const storedUser = localStorage.getItem(KEY_USER);
    if (storedUser && storedUser.trim().toLowerCase() === cleanEmail) {
      const globalName = localStorage.getItem(KEY_USER_DISPLAY_NAME);
      if (globalName && globalName.trim() && globalName.trim() !== cleanEmail.split('@')[0]) {
        return globalName.trim();
      }
    }
  } catch { /* ignore */ }
  return undefined;
}

function buildUser(
  email: string,
  role?: UserRole,
  customName?: string,
  customPicture?: string,
  customBio?: string
): AuthUser {
  const cleanEmail = email.trim().toLowerCase();
  const resolvedRole = role || deriveRoleFromEmail(cleanEmail);
  const savedName = getSavedDisplayName(cleanEmail);
  // User's explicitly saved custom name takes precedence over Google OAuth or default customName
  let name = savedName || customName;
  let picture = customPicture;
  let bio = customBio;

  // If bio is not provided, look up persisted bio from cache
  if (!bio) {
    try {
      const cachedRaw = localStorage.getItem(`sentinel_profile_${cleanEmail}`);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        if (parsed?.bio) bio = parsed.bio;
      }
    } catch { /* ignore */ }
  }

  if (resolvedRole === 'analyst') {
    picture = analystAvatar;
  } else if (!name || !picture) {
    try {
      const raw =
        sessionStorage.getItem(KEY_GOOGLE_USER_PROFILE) ||
        localStorage.getItem(KEY_GOOGLE_USER_PROFILE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.email?.toLowerCase() === cleanEmail || !cleanEmail)) {
          if (!name && parsed.name) name = parsed.name;
          if (!picture && parsed.picture) picture = parsed.picture;
        }
      }
    } catch {}
  }

  const finalDisplayName = name || deriveDisplayName(cleanEmail);
  return {
    email: cleanEmail,
    role: resolvedRole,
    displayName: finalDisplayName,
    initials: deriveInitials(finalDisplayName),
    avatarUrl: picture,
    bio,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<AuthUser | null>(() => {
    try {
      const email = localStorage.getItem(KEY_USER);
      let role = localStorage.getItem(KEY_USER_ROLE) as UserRole | null;
      if (email) {
        if (!role) {
          role = deriveRoleFromEmail(email);
          localStorage.setItem(KEY_USER_ROLE, role);
        }
        return buildUser(email, role);
      }
    } catch { /* ignore */ }
    return null;
  });

  // Sync profile details from Supabase when user email is active
  useEffect(() => {
    let isMounted = true;
    if (currentUser?.email) {
      SupabaseDataService.fetchProfile(currentUser.email).then((profile) => {
        if (isMounted && profile) {
          setCurrentUserState((prev) => {
            if (!prev) return null;
            const isAnalyst = (profile.role || prev.role) === 'analyst';
            const cleanEmail = prev.email.trim().toLowerCase();
            const savedCustom = getSavedDisplayName(cleanEmail);
            
            // Locally saved user preference MUST take precedence over remote DB
            const resolvedName = savedCustom ||
              (profile.displayName && profile.displayName !== cleanEmail.split('@')[0]
                ? profile.displayName
                : prev.displayName);

            return {
              ...prev,
              displayName: resolvedName,
              avatarUrl: isAnalyst ? analystAvatar : (profile.avatarUrl || prev.avatarUrl),
              bio: profile.bio || prev.bio,
              role: profile.role || prev.role,
              initials: deriveInitials(resolvedName),
            };
          });
        }
      }).catch((e) => console.warn('Background Supabase profile sync error:', e));
    }
    return () => { isMounted = false; };
  }, [currentUser?.email]);

  // Listen to Supabase Auth state changes if client is available
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const client = getSupabaseClient();
    if (!client) return;

    const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email) {
        const email = session.user.email;
        const role: UserRole = deriveRoleFromEmail(email);
        const profile = await SupabaseDataService.fetchProfile(email);
        const name = profile?.displayName || session.user.user_metadata?.display_name || deriveDisplayName(email);
        const isAnalyst = role === 'analyst';
        const user = buildUser(email, role, name, isAnalyst ? analystAvatar : profile?.avatarUrl, profile?.bio);

        setCurrentUserState(user);
        try {
          localStorage.setItem(KEY_USER, email);
          localStorage.setItem(KEY_USER_ROLE, role);
        } catch { /* ignore */ }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Listen to Google authentication events
  useEffect(() => {
    const handleGoogleAuth = (e: Event) => {
      try {
        const custom = e as CustomEvent;
        const profile = custom.detail?.profile || (
          sessionStorage.getItem(KEY_GOOGLE_USER_PROFILE) ||
          localStorage.getItem(KEY_GOOGLE_USER_PROFILE)
            ? JSON.parse(
                (sessionStorage.getItem(KEY_GOOGLE_USER_PROFILE) ||
                  localStorage.getItem(KEY_GOOGLE_USER_PROFILE))!
              )
            : null
        );

        if (profile && profile.email) {
          const cleanEmail = profile.email.trim().toLowerCase();
          const currentLoggedIn = (localStorage.getItem(KEY_USER) || '').trim().toLowerCase();
          if (currentLoggedIn && currentLoggedIn !== cleanEmail) {
            return;
          }
          const role: UserRole = deriveRoleFromEmail(cleanEmail);

          const savedName = getSavedDisplayName(cleanEmail);
          const user = buildUser(cleanEmail, role, savedName || profile.name, profile.picture);
          setCurrentUserState(user);
          localStorage.setItem(KEY_USER, cleanEmail);
          localStorage.setItem(KEY_USER_ROLE, role);
          if (user.displayName) {
            localStorage.setItem(KEY_USER_DISPLAY_NAME, user.displayName);
            localStorage.setItem(`${KEY_USER_DISPLAY_NAME}_${cleanEmail}`, user.displayName);
          }

          // Background sync to Supabase
          SupabaseDataService.syncGoogleUser(profile, role).catch((err) => {
            console.warn('Failed to sync Google user to Supabase:', err);
          });
        }
      } catch (err) {
        console.warn('Failed to sync Google user profile to AuthContext:', err);
      }
    };

    window.addEventListener('sentinel_google_auth_changed', handleGoogleAuth);
    return () => {
      window.removeEventListener('sentinel_google_auth_changed', handleGoogleAuth);
    };
  }, []);

  function setCurrentUser(user: AuthUser | null) {
    if (user) {
      try {
        const cleanEmail = user.email.trim().toLowerCase();
        localStorage.setItem(KEY_USER, cleanEmail);
        localStorage.setItem(KEY_USER_ROLE, user.role);
        if (user.displayName) {
          localStorage.setItem(KEY_USER_DISPLAY_NAME, user.displayName);
          localStorage.setItem(`${KEY_USER_DISPLAY_NAME}_${cleanEmail}`, user.displayName);
        }
      } catch { /* ignore */ }
    }
    setCurrentUserState(user);
  }

  function updateUserProfile(updates: Partial<AuthUser>) {
    setCurrentUserState((prev) => {
      const email = updates.email || prev?.email || localStorage.getItem(KEY_USER) || '';
      const cleanEmail = email.trim().toLowerCase();
      const current = prev || buildUser(cleanEmail);
      const updated = { ...current, ...updates };

      if (updates.displayName) {
        updated.displayName = updates.displayName.trim();
        updated.initials = deriveInitials(updated.displayName);
        try {
          localStorage.setItem(KEY_USER_DISPLAY_NAME, updated.displayName);
          if (cleanEmail) {
            localStorage.setItem(`${KEY_USER_DISPLAY_NAME}_${cleanEmail}`, updated.displayName);
          }
        } catch { /* ignore */ }
      }

      if (cleanEmail) {
        try {
          const existingCached = localStorage.getItem(`sentinel_profile_${cleanEmail}`);
          const base = existingCached ? JSON.parse(existingCached) : {};
          localStorage.setItem(
            `sentinel_profile_${cleanEmail}`,
            JSON.stringify({
              ...base,
              email: cleanEmail,
              role: updated.role,
              displayName: updated.displayName,
              bio: updated.bio,
              avatarUrl: updated.avatarUrl,
              updatedAt: new Date().toISOString(),
            })
          );
        } catch { /* ignore */ }
      }

      return updated;
    });
  }

  function signOut() {
    try {
      localStorage.removeItem(KEY_AUTH);
      localStorage.removeItem(KEY_USER);
      localStorage.removeItem(KEY_USER_ROLE);
      localStorage.removeItem(KEY_GOOGLE_USER_PROFILE);
      localStorage.removeItem(KEY_GOOGLE_ACCESS_TOKEN);
      localStorage.removeItem(KEY_GOOGLE_TOKEN_EXPIRY);
      sessionStorage.removeItem(KEY_GOOGLE_USER_PROFILE);
      sessionStorage.removeItem(KEY_GOOGLE_ACCESS_TOKEN);
      sessionStorage.removeItem(KEY_GOOGLE_TOKEN_EXPIRY);
    } catch { /* ignore */ }

    // Also sign out from Supabase Auth if connected
    const client = getSupabaseClient();
    if (client) {
      client.auth.signOut().catch(() => {});
    }

    setCurrentUserState(null);
  }

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, updateUserProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Helper used by WelcomePage to build a user object after login */
export { buildUser };
