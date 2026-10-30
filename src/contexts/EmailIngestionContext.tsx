import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  EmailIngestionService,
  type IngestedEmail,
  type ThreatLevel,
} from '@/services/emailIngestionService';
import { GoogleAuthService, type GoogleUserProfile } from '@/services/googleAuthService';
import { GmailIngestionService } from '@/services/gmailIngestionService';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/contexts/TicketContext';
import { KEY_USER_INGESTED_EMAILS } from '@/utils/storageKeys';
import { UserNotificationService } from '@/services/userNotificationService';
import { NotificationRulesService } from '@/services/notificationRulesService';

export interface EmailFilterState {
  searchQuery: string;
  threatLevel: ThreatLevel | 'all';
  unreadOnly: boolean;
}

export interface EmailIngestionContextValue {
  emails: IngestedEmail[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  selectedEmail: IngestedEmail | null;
  stats: {
    total: number;
    clean: number;
    suspicious: number;
    malicious: number;
    threatsBlocked: number;
  };
  filterState: EmailFilterState;
  setFilterState: React.Dispatch<React.SetStateAction<EmailFilterState>>;
  selectEmail: (email: IngestedEmail | null) => void;
  syncNow: () => Promise<number>;
  markAsReviewed: (emailId: string) => Promise<void>;
  escalateToSoc: (emailId: string, userComment?: string) => Promise<string | null>;
  removeEscalation: (emailId: string) => Promise<void>;
  deleteEmail: (emailId: string) => void;
  isGoogleConnected: boolean;
  googleProfile: GoogleUserProfile | null;
  connectGoogle: () => Promise<void>;
  disconnectGoogle: () => void;
}

const EmailIngestionContext = createContext<EmailIngestionContextValue | null>(null);

export function EmailIngestionProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const { submitTicket, tickets } = useTickets();
  const effectiveEmail = currentUser?.email || 'user@gmail.com';

  const [emails, setEmails] = useState<IngestedEmail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<IngestedEmail | null>(null);
  const [googleProfile, setGoogleProfile] = useState<GoogleUserProfile | null>(() => GoogleAuthService.getUserProfile());

  const isProfileMatching = Boolean(
    googleProfile?.email &&
    currentUser?.email &&
    googleProfile.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()
  );

  const isGoogleConnected = Boolean(googleProfile && GoogleAuthService.isConnected() && isProfileMatching);

  // Listen to Google authentication status changes
  useEffect(() => {
    const handleGoogleAuth = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && 'profile' in customEvent.detail) {
        setGoogleProfile(customEvent.detail.profile);
      } else {
        setGoogleProfile(GoogleAuthService.getUserProfile());
      }
    };
    window.addEventListener('sentinel_google_auth_changed', handleGoogleAuth);
    return () => window.removeEventListener('sentinel_google_auth_changed', handleGoogleAuth);
  }, []);

  const [filterState, setFilterState] = useState<EmailFilterState>({
    searchQuery: '',
    threatLevel: 'all',
    unreadOnly: false,
  });

  // Initial load
  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const storedProfile = GoogleAuthService.getUserProfile();
        const googleToken = GoogleAuthService.getAccessToken();

        // If the stored Google profile does NOT match the logged-in user, sign out immediately
        if (storedProfile && currentUser?.email && storedProfile.email.trim().toLowerCase() !== currentUser.email.trim().toLowerCase()) {
          GoogleAuthService.signOut();
          if (mounted) {
            setGoogleProfile(null);
            setEmails([]);
            setLastSyncedAt(null);
          }
          return;
        }

        // Only load emails if Google is connected and matches current user — avoids leaking another
        // user's locally-cached emails to a freshly signed-up account.
        const matchesUser = Boolean(
          storedProfile?.email &&
          currentUser?.email &&
          storedProfile.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()
        );

        if (!googleToken || !matchesUser) {
          if (mounted) {
            setEmails([]);
            setLastSyncedAt(null);
          }
          return;
        }

        try {
          const result = await GmailIngestionService.syncGmailEmails(googleToken, effectiveEmail);
          if (mounted) {
            setEmails(result.emails);
            const now = new Date().toISOString();
            setLastSyncedAt(now);
            setIsLoading(false);
            return;
          }
        } catch (gmailErr) {
          console.warn('Initial live Gmail sync warning:', gmailErr);
        }

        const loaded = await EmailIngestionService.getEmails(effectiveEmail);
        if (mounted) {
          setEmails(loaded);
          const state = EmailIngestionService.getSyncState();
          setLastSyncedAt(state.last_synced_at);
        }
      } catch (err) {
        console.error('Failed to load ingested emails:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [currentUser?.email, effectiveEmail]);

  // Sync function: Live Gmail API if connected, otherwise return 0 and do not load emails
  const syncNow = useCallback(async (): Promise<number> => {
    const googleToken = GoogleAuthService.getAccessToken();
    const currentProfile = GoogleAuthService.getUserProfile();

    const canUseGoogle = Boolean(
      googleToken &&
      currentProfile?.email &&
      currentUser?.email &&
      currentProfile.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()
    );

    if (!canUseGoogle || !googleToken) {
      // Gmail is not connected yet; do not load or expose any emails
      return 0;
    }

    setIsSyncing(true);
    try {
      const result = await GmailIngestionService.syncGmailEmails(googleToken, effectiveEmail);
      const onlyReal = result.emails.filter((e) => !e.id.startsWith('msg-seed-') && !e.id.startsWith('msg-live-'));
      setEmails(onlyReal);
      const now = new Date().toISOString();
      setLastSyncedAt(now);

      // Check for incoming critical threat emails and fire push alert ONLY for newly ingested emails that haven't been notified yet
      if (result.newEmailsCount > 0 && NotificationRulesService.isCriticalAlertsEnabled(effectiveEmail)) {
        const freshThreats = (result.newlyIngested || []).filter(
          (e) => e.analysis?.threat_level === 'malicious' || (e.analysis?.threat_score ?? 0) >= 70
        );

        for (const critThreat of freshThreats) {
          if (!NotificationRulesService.isThreatAlreadyNotified(critThreat.id, critThreat.gmail_message_id)) {
            NotificationRulesService.markThreatAsNotified(critThreat.id, critThreat.gmail_message_id);

            NotificationRulesService.sendBrowserPush(
              `🚨 [CRITICAL THREAT] ${critThreat.subject}`,
              `From ${critThreat.sender}: High-risk phishing payload detected (Score: ${critThreat.analysis?.threat_score || 85}/100)`
            );
            UserNotificationService.addUserNotification(effectiveEmail, {
              id: `notif-crit-${Date.now()}`,
              title: 'Critical Threat Detected',
              msg: `Urgent: "${critThreat.subject}" contains malicious indicators (Score: ${critThreat.analysis?.threat_score || 85}/100)`,
              sev: 'critical',
              category: 'intel',
              route: 'emails',
            });
          }
        }
      }

      return result.newEmailsCount;
    } catch (err) {
      console.error('Email sync failed:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser?.email, effectiveEmail]);

  // Scheduled background poller (every 30s automatically): ONLY runs when Google is connected
  useEffect(() => {
    if (!isGoogleConnected) return;

    const timer = setInterval(() => {
      syncNow().catch((err) => {
        console.debug('Background 30s Gmail sync check:', err);
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [isGoogleConnected, syncNow]);

  // Listen for local storage email updates across components
  useEffect(() => {
    const handleEmailsUpdated = () => {
      if (!isGoogleConnected) {
        setEmails([]);
        return;
      }
      try {
        const stored =
          localStorage.getItem(KEY_USER_INGESTED_EMAILS) ||
          localStorage.getItem('sentinel_user_ingested_emails');
        if (stored) {
          const parsed = JSON.parse(stored) as IngestedEmail[];
          setEmails(
            parsed.filter((e) => !e.id.startsWith('msg-seed-') && !e.id.startsWith('msg-live-'))
          );
        }
      } catch {}
    };
    window.addEventListener('sentinel_emails_updated', handleEmailsUpdated);
    return () => {
      window.removeEventListener('sentinel_emails_updated', handleEmailsUpdated);
    };
  }, [isGoogleConnected]);

  // Automatically clear escalated_to_soc if the SOC analyst has analyzed and reverted back the ticket
  useEffect(() => {
    const analyzedCaseIds = new Set(
      tickets.filter((t) => t.status === 'analyzed').map((t) => t.id)
    );
    const analyzedEmailIds = new Set(
      tickets.filter((t) => t.status === 'analyzed' && t.emailId).map((t) => t.emailId!)
    );

    if (analyzedCaseIds.size > 0 || analyzedEmailIds.size > 0) {
      setEmails((prev) => {
        let changed = false;
        const next = prev.map((email) => {
          const isTarget =
            analyzedEmailIds.has(email.id) ||
            (email.analysis?.soc_case_id && analyzedCaseIds.has(email.analysis.soc_case_id));

          if (isTarget && email.analysis && (email.analysis.escalated_to_soc || !email.analysis.escalation_completed)) {
            changed = true;
            return {
              ...email,
              analysis: {
                ...email.analysis,
                escalated_to_soc: false,
                escalation_completed: true,
              },
            };
          }
          return email;
        });
        if (changed) {
          EmailIngestionService.saveEmailsLocally(next);
          return next;
        }
        return prev;
      });

      setSelectedEmail((prev) => {
        if (!prev) return null;
        const isTarget =
          analyzedEmailIds.has(prev.id) ||
          (prev.analysis?.soc_case_id && analyzedCaseIds.has(prev.analysis.soc_case_id));
        if (isTarget && prev.analysis && (prev.analysis.escalated_to_soc || !prev.analysis.escalation_completed)) {
          return {
            ...prev,
            analysis: {
              ...prev.analysis,
              escalated_to_soc: false,
              escalation_completed: true,
            },
          };
        }
        return prev;
      });
    }
  }, [tickets]);

  // Mark as reviewed (and clear escalation)
  const markAsReviewed = useCallback(async (emailId: string) => {
    await EmailIngestionService.markAsReviewed(emailId);
    setEmails((prev) =>
      prev.map((e) =>
        e.id === emailId && e.analysis
          ? { ...e, analysis: { ...e.analysis, is_reviewed: true, escalated_to_soc: false } }
          : e
      )
    );
    setSelectedEmail((prev) =>
      prev && prev.id === emailId && prev.analysis
        ? { ...prev, analysis: { ...prev.analysis, is_reviewed: true, escalated_to_soc: false } }
        : prev
    );
  }, []);

  // Remove SOC escalation from an email (e.g. once analyzed and reverted back)
  const removeEscalation = useCallback(async (emailId: string) => {
    await EmailIngestionService.removeEscalation(emailId);
    setEmails((prev) =>
      prev.map((e) =>
        e.id === emailId && e.analysis
          ? { ...e, analysis: { ...e.analysis, escalated_to_soc: false } }
          : e
      )
    );
    setSelectedEmail((prev) =>
      prev && prev.id === emailId && prev.analysis
        ? { ...prev, analysis: { ...prev.analysis, escalated_to_soc: false } }
        : prev
    );
  }, []);

  // Escalate to SOC analyst
  const escalateToSoc = useCallback(
    async (emailId: string, userComment?: string): Promise<string | null> => {
      const target = emails.find((e) => e.id === emailId);
      if (!target) return null;

      // Construct virtual .eml attachment for SOC ticket — include all RFC headers
      const emlHeaderLines: string[] = [];
      emlHeaderLines.push(`From: ${target.sender}`);
      emlHeaderLines.push(`To: ${target.recipient}`);
      emlHeaderLines.push(`Subject: ${target.subject}`);
      emlHeaderLines.push(`Date: ${target.headers.date || target.received_at}`);
      if (target.headers['message-id']) emlHeaderLines.push(`Message-ID: ${target.headers['message-id']}`);
      else if (target.gmail_message_id) emlHeaderLines.push(`Message-ID: <${target.gmail_message_id}@mail.gmail.com>`);

      for (const [k, v] of Object.entries(target.headers || {})) {
        const lk = k.toLowerCase();
        if (['from', 'to', 'subject', 'date', 'message-id', 'received_list', 'received_hops'].includes(lk)) continue;
        if (lk === 'received' && v.includes('---HOP---')) {
          v.split('\n---HOP---\n').forEach((hop) => { if (hop.trim()) emlHeaderLines.push(`Received: ${hop.trim()}`); });
        } else {
          emlHeaderLines.push(`${k}: ${v}`);
        }
      }

      const rawEmlContent = `${emlHeaderLines.join('\n')}\n\n${target.body_text}`;

      const base64Eml = btoa(unescape(encodeURIComponent(rawEmlContent)));

      const caseId = await submitTicket({
        userEmail: effectiveEmail,
        userComment:
          userComment ||
          `Escalated from User Mailbox Ingestion: Flagged as ${target.analysis?.threat_level.toUpperCase() || 'SUSPICIOUS'} with threat score ${target.analysis?.threat_score || 'N/A'}/100. AI Summary: ${target.analysis?.summary || 'N/A'}`,
        emlFile: {
          name: `${target.subject.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)}.eml`,
          data: base64Eml,
          type: 'message/rfc822',
          size: rawEmlContent.length,
        },
        emailId: emailId,
      });

      await EmailIngestionService.markAsEscalated(emailId, caseId);
      setEmails((prev) =>
        prev.map((e) =>
          e.id === emailId && e.analysis
            ? { ...e, analysis: { ...e.analysis, escalated_to_soc: true, soc_case_id: caseId } }
            : e
        )
      );
      setSelectedEmail((prev) =>
        prev && prev.id === emailId && prev.analysis
          ? { ...prev, analysis: { ...prev.analysis, escalated_to_soc: true, soc_case_id: caseId } }
          : prev
      );

      return caseId;
    },
    [emails, effectiveEmail, submitTicket]
  );

  // Delete email
  const deleteEmail = useCallback((emailId: string) => {
    setEmails((prev) => {
      const filtered = prev.filter((e) => e.id !== emailId);
      EmailIngestionService.saveEmailsLocally(filtered);
      return filtered;
    });
    setSelectedEmail((prev) => (prev?.id === emailId ? null : prev));
  }, []);

  // Active email list: if Google is NOT connected, no emails should be displayed!
  const activeEmails = useMemo(() => {
    if (!isGoogleConnected) {
      return [];
    }
    return emails.filter((e) => !e.id.startsWith('msg-seed-') && !e.id.startsWith('msg-live-'));
  }, [emails, isGoogleConnected]);

  // Stats calculation
  const stats = useMemo(() => {
    let clean = 0;
    let suspicious = 0;
    let malicious = 0;

    for (const e of activeEmails) {
      const lvl = e.analysis?.threat_level;
      if (lvl === 'clean') clean++;
      else if (lvl === 'suspicious') suspicious++;
      else if (lvl === 'malicious') malicious++;
    }

    return {
      total: activeEmails.length,
      clean,
      suspicious,
      malicious,
      threatsBlocked: malicious + suspicious,
    };
  }, [activeEmails]);

  // Connect Google account and ingest real emails
  const connectGoogle = useCallback(async () => {
    const requiredEmail = currentUser?.email?.trim();
    if (!requiredEmail) {
      throw new Error('Please sign in to your account before connecting Gmail.');
    }

    const { token, profile } = await GoogleAuthService.signInWithGoogle(requiredEmail);

    // Strict account verification
    if (profile.email.trim().toLowerCase() !== requiredEmail.toLowerCase()) {
      GoogleAuthService.signOut();
      setGoogleProfile(null);
      throw new Error(
        `Account mismatch: You signed up with "${requiredEmail}", but connected Google account "${profile.email}". Please connect using "${requiredEmail}".`
      );
    }

    setGoogleProfile(profile);

    // Record and broadcast user activity notification
    UserNotificationService.addUserNotification(requiredEmail, {
      id: `notif-gmail-${Date.now()}`,
      title: 'Gmail Connected',
      msg: `Gmail account (${profile.email}) connected for automated threat monitoring.`,
      sev: 'info',
      category: 'system',
      route: 'emails',
    });

    setIsSyncing(true);
    try {
      const result = await GmailIngestionService.syncGmailEmails(token, profile.email);
      const onlyReal = result.emails.filter((e) => !e.id.startsWith('msg-seed-') && !e.id.startsWith('msg-live-'));
      setEmails(onlyReal);
      EmailIngestionService.saveEmailsLocally(onlyReal);
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser?.email]);

  // Disconnect Google
  const disconnectGoogle = useCallback(() => {
    GoogleAuthService.signOut();
    setGoogleProfile(null);
  }, []);

  return (
    <EmailIngestionContext.Provider
      value={{
        emails: activeEmails,
        isLoading,
        isSyncing,
        lastSyncedAt,
        selectedEmail,
        stats,
        filterState,
        setFilterState,
        selectEmail: setSelectedEmail,
        syncNow,
        markAsReviewed,
        escalateToSoc,
        removeEscalation,
        deleteEmail,
        isGoogleConnected,
        googleProfile,
        connectGoogle,
        disconnectGoogle,
      }}
    >
      {children}
    </EmailIngestionContext.Provider>
  );
}

export function useEmailIngestion(): EmailIngestionContextValue {
  const ctx = useContext(EmailIngestionContext);
  if (!ctx) throw new Error('useEmailIngestion must be used within EmailIngestionProvider');
  return ctx;
}
