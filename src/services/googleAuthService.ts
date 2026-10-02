/**
 * googleAuthService.ts
 *
 * Google Identity Services (GIS) OAuth 2.0 Integration & Token Management.
 * Manages client-side authentication with scopes for Google User Profile and Gmail read-only access.
 */

import {
  KEY_GOOGLE_CLIENT_ID,
  KEY_GOOGLE_ACCESS_TOKEN,
  KEY_GOOGLE_TOKEN_EXPIRY,
  KEY_GOOGLE_USER_PROFILE,
} from '@/utils/storageKeys';

export interface GoogleUserProfile {
  sub: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email: string;
  email_verified?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: any) => void;
            prompt?: string;
            hint?: string;
          }) => GoogleTokenClient;
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

export interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string; hint?: string }) => void;
}

let gsiScriptLoadedPromise: Promise<void> | null = null;

export class GoogleAuthService {
  /**
   * Dynamically loads the Google Identity Services client script if not already present.
   */
  static async loadGsiScript(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (window.google?.accounts?.oauth2) return;

    if (!gsiScriptLoadedPromise) {
      gsiScriptLoadedPromise = new Promise((resolve, reject) => {
        const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')));
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
        document.head.appendChild(script);
      });
    }

    return gsiScriptLoadedPromise;
  }

  /**
   * Retrieves the configured Google Client ID from .env, localStorage, or hardcoded fallback.
   * Priority: env variable → localStorage → hardcoded fallback.
   * The fallback ensures no user ever sees the setup modal.
   */
  static getClientId(): string | null {
    // 1. Env variable (works on localhost and properly configured deployments)
    const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (envClientId && envClientId.trim() !== '' && !envClientId.includes('your_google_client_id')) {
      return envClientId.trim();
    }
    // 2. User-saved value in localStorage
    const localId = localStorage.getItem(KEY_GOOGLE_CLIENT_ID);
    if (localId && localId.trim() !== '') {
      return localId.trim();
    }
    // 3. Hardcoded fallback — guarantees Google sign-in always works for every user
    return '1067826540808-u61hk5rtkpe8tjtfj1lv8us2km8np55p.apps.googleusercontent.com';
  }

  /**
   * Persists user-entered Google Client ID to localStorage.
   */
  static setClientId(clientId: string): void {
    if (clientId && clientId.trim()) {
      localStorage.setItem(KEY_GOOGLE_CLIENT_ID, clientId.trim());
    } else {
      localStorage.removeItem(KEY_GOOGLE_CLIENT_ID);
    }
  }

  static isConfigured(): boolean {
    return this.getClientId() !== null;
  }

  /**
   * Returns whether a valid, non-expired Google access token is active in session.
   */
  static isConnected(): boolean {
    return this.getAccessToken() !== null;
  }

  /**
   * Gets current active access token, checking expiration timestamp.
   */
  static getAccessToken(): string | null {
    try {
      const token = sessionStorage.getItem(KEY_GOOGLE_ACCESS_TOKEN) || localStorage.getItem(KEY_GOOGLE_ACCESS_TOKEN);
      const expiry = sessionStorage.getItem(KEY_GOOGLE_TOKEN_EXPIRY) || localStorage.getItem(KEY_GOOGLE_TOKEN_EXPIRY);
      if (!token) return null;

      if (expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() >= expiryTime) {
          // Token expired: record expiry flag and notify components
          sessionStorage.setItem('sentinel_google_token_expired', 'true');
          localStorage.setItem('sentinel_google_token_expired', 'true');
          this.clearStoredAuth();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sentinel_google_auth_changed', { detail: { profile: null, expired: true } }));
          }
          return null;
        }
      }
      return token;
    } catch {
      return null;
    }
  }

  /**
   * Returns true if Google session access token has expired.
   */
  static isTokenExpired(): boolean {
    return (
      sessionStorage.getItem('sentinel_google_token_expired') === 'true' ||
      localStorage.getItem('sentinel_google_token_expired') === 'true'
    );
  }

  /**
   * Clears token expired flag upon new login or manual sign out.
   */
  static clearTokenExpiredFlag(): void {
    sessionStorage.removeItem('sentinel_google_token_expired');
    localStorage.removeItem('sentinel_google_token_expired');
  }

  /**
   * Returns the stored Google user profile if authenticated.
   */
  static getUserProfile(): GoogleUserProfile | null {
    try {
      const raw = sessionStorage.getItem(KEY_GOOGLE_USER_PROFILE) || localStorage.getItem(KEY_GOOGLE_USER_PROFILE);
      if (raw) return JSON.parse(raw) as GoogleUserProfile;
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Initiates Google Sign-In with popup asking for email, profile, and Gmail readonly access.
   * If expectedEmail is provided, strictly requires the authenticated Google account to match it.
   */
  static async signInWithGoogle(expectedEmail?: string): Promise<{ token: string; profile: GoogleUserProfile }> {
    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID_MISSING');
    }

    await this.loadGsiScript();

    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google Identity Services failed to initialize.');
    }

    const scopes = [
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.readonly',
    ].join(' ');

    const trimmedExpected = expectedEmail?.trim();

    return new Promise((resolve, reject) => {
      let isResolved = false;

      const tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scopes,
        hint: trimmedExpected || undefined,
        callback: async (tokenResponse: GoogleTokenResponse) => {
          if (tokenResponse.error) {
            isResolved = true;
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }

          if (!tokenResponse.access_token) {
            isResolved = true;
            reject(new Error('No access token returned by Google.'));
            return;
          }

          try {
            // Fetch Google user profile
            const profile = await GoogleAuthService.fetchUserProfile(tokenResponse.access_token);

            // If an expectedEmail is given, strictly require that the connected account matches!
            if (trimmedExpected) {
              const normExpected = trimmedExpected.toLowerCase();
              const normProfile = (profile.email || '').trim().toLowerCase();

              if (normProfile !== normExpected) {
                // Immediately revoke access grant if possible so Google doesn't hold the token
                try {
                  if (window.google?.accounts?.oauth2?.revoke) {
                    window.google.accounts.oauth2.revoke(tokenResponse.access_token, () => {});
                  }
                } catch {
                  // ignore
                }

                // Clear any stored Google session
                GoogleAuthService.signOut();

                isResolved = true;
                reject(
                  new Error(
                    `Account mismatch: You are signed up as "${trimmedExpected}", but tried connecting "${profile.email}". You must connect using your registered email address "${trimmedExpected}".`
                  )
                );
                return;
              }
            }

            // Store token, expiration, and profile
            const expiresInSeconds = tokenResponse.expires_in || 3600;
            const expiryTime = Date.now() + expiresInSeconds * 1000;

            sessionStorage.setItem(KEY_GOOGLE_ACCESS_TOKEN, tokenResponse.access_token);
            sessionStorage.setItem(KEY_GOOGLE_TOKEN_EXPIRY, expiryTime.toString());
            sessionStorage.setItem(KEY_GOOGLE_USER_PROFILE, JSON.stringify(profile));

            // Also mirror to localStorage for tab stability
            localStorage.setItem(KEY_GOOGLE_ACCESS_TOKEN, tokenResponse.access_token);
            localStorage.setItem(KEY_GOOGLE_TOKEN_EXPIRY, expiryTime.toString());
            localStorage.setItem(KEY_GOOGLE_USER_PROFILE, JSON.stringify(profile));

            this.clearTokenExpiredFlag();

            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('sentinel_google_auth_changed', { detail: { profile } }));
            }

            isResolved = true;
            resolve({ token: tokenResponse.access_token, profile });
          } catch (err) {
            isResolved = true;
            reject(err);
          }
        },
        error_callback: (err: any) => {
          if (!isResolved) {
            isResolved = true;
            reject(new Error(err?.message || 'Google OAuth prompt was cancelled or closed.'));
          }
        },
      });

      const requestConfig: { prompt?: string; hint?: string } = { prompt: 'consent' };
      if (trimmedExpected) {
        requestConfig.hint = trimmedExpected;
      }
      tokenClient.requestAccessToken(requestConfig);
    });
  }

  /**
   * Fetches the user profile from Google's userinfo endpoint.
   */
  static async fetchUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Google profile: ${res.statusText}`);
    }

    const profile: GoogleUserProfile = await res.json();
    return profile;
  }

  /**
   * Disconnects Google account and clears stored tokens.
   */
  static signOut(): void {
    const token = this.getAccessToken();
    if (token && window.google?.accounts?.oauth2?.revoke) {
      try {
        window.google.accounts.oauth2.revoke(token);
      } catch {
        // ignore
      }
    }
    this.clearStoredAuth();
    this.clearTokenExpiredFlag();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sentinel_google_auth_changed', { detail: { profile: null } }));
    }
  }

  private static clearStoredAuth(): void {
    sessionStorage.removeItem(KEY_GOOGLE_ACCESS_TOKEN);
    sessionStorage.removeItem(KEY_GOOGLE_TOKEN_EXPIRY);
    sessionStorage.removeItem(KEY_GOOGLE_USER_PROFILE);
    localStorage.removeItem(KEY_GOOGLE_ACCESS_TOKEN);
    localStorage.removeItem(KEY_GOOGLE_TOKEN_EXPIRY);
    localStorage.removeItem(KEY_GOOGLE_USER_PROFILE);
  }
}
