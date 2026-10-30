/**
 * authAccountService.ts
 *
 * Central service for account credential storage, provider detection,
 * password validation, and password updates across Sentinel-X.
 */
import { SupabaseDataService } from '@/services/supabaseDataService';
import { getSupabaseClient, isSupabaseConfigured } from '@/config/supabaseClient';
import { GoogleAuthService } from '@/services/googleAuthService';

export interface StoredAccount {
  email: string;
  method: 'email' | 'google';
  password?: string;
  originalProvider?: 'email' | 'google';
  createdAt?: string;
  updatedAt?: string;
}

export const STORAGE_REGISTERED_ACCOUNTS = 'sentinel_registered_accounts';

/**
 * Computes SHA-256 hex digest for passwords to avoid storing plain text in localStorage.
 */
export async function hashPassword(plainText: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(plainText);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // fallback
  }
  let hash = 0;
  for (let i = 0; i < plainText.length; i++) {
    const char = plainText.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

export function isHashedPassword(val?: string): boolean {
  if (!val) return false;
  return /^[0-9a-f]{64}$/i.test(val) || /^h_[0-9a-f]{16}$/i.test(val);
}

export const INITIAL_USERS_DB: StoredAccount[] = [
  { email: 'demo@analyst', password: '12345678', method: 'email', originalProvider: 'email' },
  { email: 'demo@analyst.com', password: '12345678', method: 'email', originalProvider: 'email' },
  { email: 'demo@user', password: '12345678', method: 'email', originalProvider: 'email' },
  { email: 'demo@user.com', password: '12345678', method: 'email', originalProvider: 'email' },
  { email: 'sentinelx.analyst@gmail.com', password: 'password', method: 'email', originalProvider: 'email' },
  { email: 'analyst@gmail.com', password: 'password', method: 'email', originalProvider: 'email' },
  { email: 'demouser1@gmail.com', password: 'password', method: 'email', originalProvider: 'email' },
  { email: 'demouser2@gmail.com', password: 'password', method: 'email', originalProvider: 'email' },
  { email: 'janvip2246@gmail.com', password: 'password', method: 'email', originalProvider: 'email' },
  { email: 'dharmikk566@gmail.com', password: 'password', method: 'email', originalProvider: 'email' },
  { email: 'raichuramanthan13@gmail.com', password: 'password', method: 'email', originalProvider: 'email' },
  { email: 'tirthmpatel25@gmail.com', password: 'password', method: 'email', originalProvider: 'email' },
  { email: 'manthank0306@gmail.com', password: 'password', method: 'email', originalProvider: 'email' },
];

export class AuthAccountService {
  /**
   * Retrieves all registered accounts across built-in presets and persistent localStorage.
   */
  static getStoredAccounts(): StoredAccount[] {
    const map = new Map<string, StoredAccount>();

    // 1. Load initial seed users
    for (const u of INITIAL_USERS_DB) {
      const clean = u.email.trim().toLowerCase();
      map.set(clean, { ...u, email: clean });
    }

    // 2. Load accounts saved in localStorage
    try {
      const raw = localStorage.getItem(STORAGE_REGISTERED_ACCOUNTS);
      if (raw) {
        const list = JSON.parse(raw) as StoredAccount[];
        for (const item of list) {
          if (item?.email) {
            const clean = item.email.trim().toLowerCase();
            const existing = map.get(clean);
            map.set(clean, {
              email: clean,
              method: item.method || existing?.method || 'email',
              password: item.password !== undefined ? item.password : existing?.password,
              originalProvider: item.originalProvider || existing?.originalProvider || (item.method === 'google' ? 'google' : 'email'),
              createdAt: item.createdAt || existing?.createdAt,
              updatedAt: item.updatedAt || existing?.updatedAt,
            });
          }
        }
      }
    } catch {
      // ignore parsing errors
    }

    // 3. Scan cached profiles in localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('sentinel_profile_')) {
          const email = key.replace('sentinel_profile_', '').trim().toLowerCase();
          if (email && !map.has(email)) {
            map.set(email, { email, method: 'email', originalProvider: 'email' });
          }
        }
      }
    } catch {
      // ignore
    }

    return Array.from(map.values());
  }

  /**
   * Saves or updates an account in local persistent storage.
   */
  static saveStoredAccount(account: StoredAccount): void {
    try {
      const clean = account.email.trim().toLowerCase();
      const accounts = this.getStoredAccounts();
      const idx = accounts.findIndex((a) => a.email === clean);

      if (idx >= 0) {
        accounts[idx] = {
          ...accounts[idx],
          ...account,
          email: clean,
          password: (account.password && account.password.trim().length > 0) ? account.password : accounts[idx].password,
          originalProvider: accounts[idx].originalProvider || account.originalProvider || account.method,
          updatedAt: new Date().toISOString(),
        };
      } else {
        accounts.push({
          ...account,
          email: clean,
          originalProvider: account.originalProvider || account.method,
          createdAt: account.createdAt || new Date().toISOString(),
        });
      }

      localStorage.setItem(STORAGE_REGISTERED_ACCOUNTS, JSON.stringify(accounts));
    } catch {
      // ignore
    }
  }

  /**
   * Finds an account by email address.
   */
  static getAccountByEmail(email: string): StoredAccount | null {
    const clean = email.trim().toLowerCase();
    if (!clean) return null;
    const accounts = this.getStoredAccounts();
    return accounts.find((a) => a.email === clean) || null;
  }

  /**
   * Detects whether the user originally registered using Google OAuth.
   */
  static isGoogleRegistered(email: string): boolean {
    const clean = email.trim().toLowerCase();
    if (!clean) return false;

    // Check account record
    const account = this.getAccountByEmail(clean);
    if (account) {
      if (account.originalProvider === 'google') return true;
      if (account.originalProvider === 'email') return false;
      if (account.method === 'google') return true;
    }

    // Check explicit auth provider flag
    const explicitProvider = localStorage.getItem(`sentinel_auth_provider_${clean}`);
    if (explicitProvider === 'google') return true;
    if (explicitProvider === 'email') return false;

    // Check active Google session matching this email
    const googleProfile = GoogleAuthService.getUserProfile();
    if (googleProfile?.email && googleProfile.email.trim().toLowerCase() === clean) {
      return true;
    }

    const storedProfileRaw = localStorage.getItem('sentinel_google_user_profile');
    if (storedProfileRaw) {
      try {
        const p = JSON.parse(storedProfileRaw);
        if (p?.email && p.email.trim().toLowerCase() === clean) {
          return true;
        }
      } catch {
        // ignore
      }
    }

    // If account has no password stored yet, it came through Google OAuth
    if (account && !account.password) {
      return true;
    }

    return false;
  }

  /**
   * Checks if an email is already registered in the system (Google or Email).
   */
  static async checkEmailAlreadyExists(email: string): Promise<{ exists: boolean; method: 'email' | 'google' | 'unknown' }> {
    const clean = email.trim().toLowerCase();
    if (!clean) return { exists: false, method: 'unknown' };

    const matched = this.getAccountByEmail(clean);
    if (matched) {
      return { exists: true, method: matched.method };
    }

    // Remote check on Supabase profiles
    try {
      const profile = await SupabaseDataService.fetchProfile(clean);
      if (profile?.email) {
        this.saveStoredAccount({ email: clean, method: 'email', originalProvider: 'email' });
        return { exists: true, method: 'email' };
      }
    } catch {
      // ignore
    }

    return { exists: false, method: 'unknown' };
  }

  /**
   * Verifies password against stored hashed credentials or legacy plaintext.
   */
  static async verifyPassword(email: string, candidatePassword: string): Promise<boolean> {
    const clean = email.trim().toLowerCase();
    const account = this.getAccountByEmail(clean);
    if (!account) return false;

    const candidateHash = await hashPassword(candidatePassword);

    const checkMatch = (stored?: string) => {
      if (!stored) return false;
      return stored === candidatePassword || stored === candidateHash;
    };

    if (
      (clean === 'demo@user' || clean === 'demo@user.com' || clean === 'demo@analyst' || clean === 'demo@analyst.com') &&
      (candidatePassword === '12345678' || candidatePassword === 'password')
    ) {
      return true;
    }

    if (checkMatch(account.password)) return true;

    const seed = INITIAL_USERS_DB.find((u) => u.email === clean);
    if (seed?.password && checkMatch(seed.password)) return true;

    const backupPw = localStorage.getItem(`sentinel_user_password_${clean}`);
    if (checkMatch(backupPw || undefined)) return true;

    return false;
  }

  /**
   * Verifies the old password for an email & password account (supports sync/fallback).
   */
  static verifyOldPassword(email: string, oldPassword: string): boolean {
    const clean = email.trim().toLowerCase();
    const account = this.getAccountByEmail(clean);
    if (!account) return false;

    // Check direct equality or fallback
    if (account.password === oldPassword) return true;

    const seed = INITIAL_USERS_DB.find((u) => u.email === clean);
    if (seed?.password === oldPassword) return true;

    const backupPw = localStorage.getItem(`sentinel_user_password_${clean}`);
    if (backupPw === oldPassword) return true;

    return false;
  }

  /**
   * Returns true if this account has an active password set in the system.
   */
  static hasPasswordSet(email: string): boolean {
    const clean = email.trim().toLowerCase();
    if (!clean) return false;
    const account = this.getAccountByEmail(clean);
    if (account?.password && account.password.trim().length > 0) {
      return true;
    }
    // Check localStorage password set marker or direct password backup
    if (localStorage.getItem(`sentinel_has_password_${clean}`) === 'true') {
      return true;
    }
    if (localStorage.getItem(`sentinel_user_password_${clean}`)) {
      return true;
    }
    // Check initial seed accounts
    const seed = INITIAL_USERS_DB.find((u) => u.email === clean);
    if (seed?.password && seed.password.trim().length > 0) {
      return true;
    }
    return false;
  }

  /**
   * Updates an account's password with SHA-256 cryptographic hashing.
   * Works for both Google accounts (enabling email sign-in) and Email accounts.
   */
  static async updatePassword(
    email: string,
    newPassword: string,
    oldPassword?: string
  ): Promise<{ success: boolean; error?: string }> {
    const clean = email.trim().toLowerCase();
    if (!clean) {
      return { success: false, error: 'User email is required.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }

    const hasPassword = this.hasPasswordSet(clean);
    const account = this.getAccountByEmail(clean);

    // If account ALREADY has a password set (regardless of whether originally Google or Email):
    // Require old password and verify it!
    if (hasPassword) {
      if (!oldPassword) {
        return { success: false, error: 'Please enter your current password.' };
      }
      const isOldValid = (await this.verifyPassword(clean, oldPassword)) || this.verifyOldPassword(clean, oldPassword);
      if (!isOldValid) {
        return { success: false, error: 'Current password is incorrect.' };
      }
      if (oldPassword === newPassword) {
        return { success: false, error: 'New password must be different from your current password.' };
      }
    }

    // Compute secure SHA-256 hash for local storage
    const hashedPassword = await hashPassword(newPassword);

    // 1. Update local persistent storage with hashed password
    this.saveStoredAccount({
      email: clean,
      method: 'email', // Now supports email login
      password: hashedPassword,
      originalProvider: account?.originalProvider || (this.isGoogleRegistered(clean) ? 'google' : 'email'),
      updatedAt: new Date().toISOString(),
    });

    // Mark that this account now supports email login
    localStorage.setItem(`sentinel_has_password_${clean}`, 'true');
    localStorage.setItem(`sentinel_user_password_${clean}`, hashedPassword);

    // 2. Synchronize to Supabase Auth if client has an active session
    try {
      const client = getSupabaseClient();
      if (isSupabaseConfigured() && client) {
        const { error } = await client.auth.updateUser({ password: newPassword });
        if (error) {
          console.warn('Supabase updateUser password notice:', error.message);
        }
      }
    } catch (err) {
      console.warn('Remote password sync exception:', err);
    }

    return { success: true };
  }

  /**
   * Resets password after verified Google OAuth authentication.
   * Bypasses old password requirement because ownership of the Google identity is proven.
   */
  static async resetPasswordWithGoogleVerification(
    email: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const clean = email.trim().toLowerCase();
    if (!clean) {
      return { success: false, error: 'User email is required.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }

    const hashedPassword = await hashPassword(newPassword);
    const account = this.getAccountByEmail(clean);

    // Update local storage with new hashed password
    this.saveStoredAccount({
      email: clean,
      method: 'email',
      password: hashedPassword,
      originalProvider: account?.originalProvider || 'google',
      updatedAt: new Date().toISOString(),
    });

    localStorage.setItem(`sentinel_has_password_${clean}`, 'true');
    localStorage.setItem(`sentinel_user_password_${clean}`, hashedPassword);

    // Synchronize to Supabase Auth if session active
    try {
      const client = getSupabaseClient();
      if (isSupabaseConfigured() && client) {
        await client.auth.updateUser({ password: newPassword });
      }
    } catch {
      // ignore
    }

    return { success: true };
  }
}
