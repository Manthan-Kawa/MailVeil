import { useState, useMemo, useRef, useLayoutEffect } from 'react';
import {
  Mail,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  Inbox,
  Calendar,
  User,
  Shield,
  Clock,
  CheckCircle2,
  Check,
  Link2Off,
} from 'lucide-react';
import { useEmailIngestion } from '@/contexts/EmailIngestionContext';
import { type IngestedEmail, type ThreatLevel, decodeMimeHeader, generateRealisticCleanScore } from '@/services/emailIngestionService';
import { EmailDetailDrawer } from '@/components/EmailDetailDrawer';
import { GoogleSetupModal } from '@/components/GoogleSetupModal';
import { GoogleAuthService } from '@/services/googleAuthService';
import { UserNotificationService } from '@/services/userNotificationService';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/contexts/TicketContext';
import { SlideIn } from '@/components/SlideIn';

interface EmailsPageProps {
  onNavigate: (route: string, opts?: { role?: 'analyst' | 'user' }) => void;
}

export function EmailsPage({ onNavigate }: EmailsPageProps) {
  const { currentUser } = useAuth();
  const {
    emails,
    isLoading,
    isSyncing,
    lastSyncedAt,
    selectedEmail,
    stats,
    filterState,
    isGoogleConnected,
    googleProfile,
    disconnectGoogle,
    setFilterState,
    selectEmail,
    syncNow,
    connectGoogle,
  } = useEmailIngestion();
  const { tickets } = useTickets();

  const analyzedCaseIds = useMemo(
    () => new Set(tickets.filter((t) => t.status === 'analyzed').map((t) => t.id)),
    [tickets]
  );
  const analyzedEmailIds = useMemo(
    () => new Set(tickets.filter((t) => t.status === 'analyzed' && t.emailId).map((t) => t.emailId!)),
    [tickets]
  );

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Smooth sliding filter indicator pill
  const filterRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [filterIndicatorStyle, setFilterIndicatorStyle] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    opacity: number;
  }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const currentEl = filterRefs.current[filterState.threatLevel];
      if (currentEl) {
        setFilterIndicatorStyle((prev) => {
          if (
            prev.left === currentEl.offsetLeft &&
            prev.top === currentEl.offsetTop &&
            prev.width === currentEl.offsetWidth &&
            prev.height === currentEl.offsetHeight &&
            prev.opacity === 1
          ) {
            return prev;
          }
          return {
            left: currentEl.offsetLeft,
            top: currentEl.offsetTop,
            width: currentEl.offsetWidth,
            height: currentEl.offsetHeight,
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
  }, [filterState.threatLevel]);

  const handleDisconnectGmail = () => {
    disconnectGoogle();
    const userEmail = (currentUser?.email || '').trim().toLowerCase();
    if (userEmail) {
      UserNotificationService.addUserNotification(userEmail, {
        id: `notif-gmail-dc-${Date.now()}`,
        title: 'Gmail Disconnected',
        msg: 'Gmail account disconnected from Mailveil monitoring.',
        category: 'system',
        sev: 'info',
        route: 'emails',
      });
    }
    setSyncNotice('Gmail account disconnected successfully.');
    setTimeout(() => setSyncNotice(null), 4000);
  };

  const handleConnectGoogle = async () => {
    if (!GoogleAuthService.isConfigured()) {
      setIsGoogleModalOpen(true);
      return;
    }
    try {
      await connectGoogle();
    } catch (err: any) {
      console.error('Google connect error:', err);
      setSyncNotice(err?.message || 'Google connection failed.');
      setTimeout(() => setSyncNotice(null), 8000);
    }
  };

  const handleGoogleModalSuccess = async () => {
    setIsGoogleModalOpen(false);
    try {
      await connectGoogle();
    } catch (err: any) {
      console.error('Failed to sign in after setting client ID', err);
      setSyncNotice(err?.message || 'Failed to authenticate with Google.');
      setTimeout(() => setSyncNotice(null), 8000);
    }
  };

  const handleManualSync = async () => {
    setSyncNotice(null);
    if (!isGoogleConnected) {
      setSyncNotice('Please connect your Gmail account first to sync and view your emails.');
      setTimeout(() => setSyncNotice(null), 6000);
      handleConnectGoogle();
      return;
    }
    try {
      const count = await syncNow();
      if (count > 0) {
        setSyncNotice(`Successfully ingested and analyzed ${count} new incoming email(s) from Gmail!`);
      } else {
        setSyncNotice('Mailbox is up to date.');
      }
      setTimeout(() => setSyncNotice(null), 5000);
    } catch (err: any) {
      console.error('Manual sync error:', err);
      setSyncNotice(`Sync notice: ${err?.message || 'Failed to sync with Gmail.'}`);
      setTimeout(() => setSyncNotice(null), 8000);
    }
  };

  // Filtered emails
  const filteredEmails = useMemo(() => {
    return emails.filter((item) => {
      // If Google account is connected, strictly exclude any old seed/mock emails
      if (isGoogleConnected && (item.id.startsWith('msg-seed-') || item.id.startsWith('msg-live-'))) {
        return false;
      }

      // Threat level filter
      if (filterState.threatLevel !== 'all') {
        if (item.analysis?.threat_level !== filterState.threatLevel) {
          return false;
        }
      }

      // Search query
      if (filterState.searchQuery.trim() !== '') {
        const q = filterState.searchQuery.toLowerCase();
        const matchSubject = item.subject.toLowerCase().includes(q);
        const matchSender = item.sender.toLowerCase().includes(q) || (item.sender_name && item.sender_name.toLowerCase().includes(q));
        const matchSnippet = item.snippet.toLowerCase().includes(q);
        const matchSummary = item.analysis?.summary.toLowerCase().includes(q);
        if (!matchSubject && !matchSender && !matchSnippet && !matchSummary) {
          return false;
        }
      }

      return true;
    });
  }, [emails, filterState]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredEmails.length / itemsPerPage) || 1;
  const paginatedEmails = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEmails.slice(start, start + itemsPerPage);
  }, [filteredEmails, currentPage, itemsPerPage]);

  const renderRiskBadge = (level?: ThreatLevel, score?: number) => {
    const baseClasses = "w-[136px] h-7 inline-flex items-center justify-center gap-1.5 px-3 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all";
    if (level === 'malicious') {
      return (
        <span className={`${baseClasses} bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30`}>
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-600 dark:text-red-400" />
          <span>Malicious ({score ?? 90})</span>
        </span>
      );
    }
    if (level === 'suspicious') {
      return (
        <span className={`${baseClasses} bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Suspicious ({score ?? 50})</span>
        </span>
      );
    }
    return (
      <span className={`${baseClasses} bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30`}>
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>Clean ({score ?? 0})</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-white pb-16">
      {/* ── Header Card (Responsive Desktop + Mobile) ── */}
      <SlideIn delay={0} direction="down">
        {/* ── Desktop Card (PC only: md:flex) Matching Screenshot ── */}
        <div className="hidden md:flex items-center justify-between gap-4 p-4 lg:p-5 rounded-2xl bg-white dark:bg-[#090b12] border border-slate-200 dark:border-white/10 relative overflow-hidden shadow-sm dark:shadow-2xl">
          {/* Left: Icon + Title & Badges + Connected Account */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/10">
              <Mail className="w-5 h-5 text-cyan-400" />
            </div>

          <div className="min-w-0 space-y-1">
            {/* Title + Badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Automated Email Ingestion &amp; Analysis
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 shrink-0">
                Live Gemini Triage
              </span>
              {isGoogleConnected ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                  Gmail Live
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-cyan-100 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 dark:bg-cyan-400 animate-pulse" />
                  Mailbox Live
                </span>
              )}
            </div>

            {/* Subtitle & Connected Account Details */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400 flex-wrap">
              <span className="text-slate-400 dark:text-gray-500">Connected account</span>
              {isGoogleConnected ? (
                <span className="relative group inline-flex items-center gap-1.5 pl-2.5 pr-1 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.04] dark:hover:bg-white/[0.07] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 font-mono text-xs transition-all">
                  {googleProfile?.picture ? (
                    <img src={googleProfile.picture} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                  <span>{googleProfile?.email || currentUser?.email}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDisconnectGmail();
                    }}
                    title="Disconnect Gmail (Unlink)"
                    aria-label="Disconnect Gmail"
                    className="p-0.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-all cursor-pointer flex items-center justify-center group/unlink"
                  >
                    <Link2Off className="w-3 h-3 group-hover/unlink:scale-110 transition-transform" />
                  </button>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                  {currentUser?.email || 'user@company.corp'}
                </span>
              )}
              <span className="text-slate-300 dark:text-gray-600">|</span>
              <span className="text-slate-500 dark:text-gray-500 text-xs">
                Real-time Gemini security scoring &amp; phishing detection
              </span>
            </div>
          </div>
        </div>

        {/* Right: Telemetry status + Action buttons */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right space-y-0.5">
            <div className={`text-xs font-medium flex items-center gap-1.5 justify-end ${isGoogleConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-gray-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isGoogleConnected ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-slate-400 dark:bg-gray-500'}`} />
              <span>{isGoogleConnected ? 'Live Gmail · auto-sync 30s' : 'Gmail Not Connected'}</span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-gray-500 font-mono">
              {isGoogleConnected && lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'Connect account to sync'}
            </div>
          </div>

          {!isGoogleConnected && (
            <button
              onClick={handleConnectGoogle}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 dark:bg-white/[0.06] dark:hover:bg-white/10 dark:border-white/15 dark:text-white text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Connect Gmail</span>
            </button>
          )}

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : isGoogleConnected ? 'Sync Gmail' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* ── Mobile Card (Phone only: block md:hidden) ── */}
      <div className="block md:hidden rounded-2xl p-4 bg-white dark:bg-[#11121b] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl space-y-3.5">
        {/* Row 1: Icon + Title + Subtitle */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/10 mt-0.5">
            <Mail className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
              Automated email ingestion
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
              AI-powered inbox monitoring and triage
            </p>
          </div>
        </div>

        {/* Row 2: Badges (Gemini triage, Gmail live) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/15 border border-purple-300 dark:border-purple-500/30 text-purple-800 dark:text-purple-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
            <span>Gemini triage</span>
          </span>
          {isGoogleConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
              <span>Gmail live</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-500/15 border border-cyan-300 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 dark:bg-cyan-400 animate-pulse" />
              <span>Mailbox live</span>
            </span>
          )}
        </div>

        {/* Row 3: Connected account section */}
        <div className="space-y-1.5">
          <div className="text-xs text-slate-500 dark:text-gray-400 font-medium">
            Connected account
          </div>
          {isGoogleConnected ? (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {googleProfile?.picture ? (
                  <img src={googleProfile.picture} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-[11px] font-bold flex items-center justify-center shrink-0">
                    {(googleProfile?.email || currentUser?.email || 'MK').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium text-slate-900 dark:text-white truncate">
                  {googleProfile?.email || currentUser?.email}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  <Check className="w-3 h-3" />
                  <span>LIVE</span>
                </span>
                <button
                  type="button"
                  onClick={handleDisconnectGmail}
                  title="Disconnect Gmail (Unlink)"
                  aria-label="Disconnect Gmail"
                  className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                >
                  <Link2Off className="w-3 h-3" />
                  <span>Unlink</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-gray-500/20 text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-white/10 text-[11px] font-bold flex items-center justify-center shrink-0">
                  {(currentUser?.displayName || currentUser?.email || 'US').slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-slate-900 dark:text-white truncate">
                  {currentUser?.email || 'user@company.corp'}
                </span>
              </div>
              <button
                onClick={handleConnectGoogle}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200 dark:border-white/15 text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-cyan-200 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
              >
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Connect Gmail</span>
              </button>
            </div>
          )}
        </div>

        {/* Row 4: Subtle divider line */}
        <div className="border-t border-slate-200 dark:border-white/10 pt-3">
          {/* Row 5: Status indicator + Last synced */}
          <div className="flex items-start justify-between text-xs font-mono">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isGoogleConnected ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-slate-400 dark:bg-gray-500'}`} />
                <span className={`font-medium ${isGoogleConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-gray-400'}`}>
                  {isGoogleConnected ? 'Live Gmail' : 'Gmail Not Connected'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 dark:text-gray-400 pl-3.5">
                {isGoogleConnected ? 'auto-sync 30s' : 'Auto-sync disabled'}
              </div>
            </div>
            <div className="text-right space-y-0.5">
              <div className="text-[11px] text-slate-400 dark:text-gray-400">
                {isGoogleConnected && lastSyncedAt ? 'Last synced' : 'Status'}
              </div>
              <div className="text-xs text-slate-900 dark:text-white font-mono">
                {isGoogleConnected && lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'Not connected'}
              </div>
            </div>
          </div>
        </div>

        {/* Row 6: Full-width sync action button */}
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-60 cursor-pointer overflow-hidden select-none"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
              <span className="whitespace-nowrap">Syncing...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{isGoogleConnected ? 'Sync Gmail' : 'Sync Now'}</span>
            </>
          )}
        </button>
      </div>
      </SlideIn>

      {/* Google Session Expired Notification Banner */}
      {!isGoogleConnected && GoogleAuthService.isTokenExpired() && (
        <SlideIn delay={40} direction="down">
          <div className="p-3.5 rounded-xl border bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 animate-slide-down shadow-sm dark:shadow-none">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Your Gmail session has expired. Click <strong className="font-bold text-amber-950 dark:text-amber-100">Connect Gmail</strong> to re-authenticate and resume automated inbox threat monitoring.
              </span>
            </div>
            <button
              onClick={handleConnectGoogle}
              className="px-3 py-1.5 rounded-lg bg-amber-200/80 hover:bg-amber-300/80 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 border border-amber-400 dark:border-amber-500/40 text-amber-950 dark:text-amber-200 text-xs font-bold shrink-0 transition-all cursor-pointer shadow-sm"
            >
              Re-authenticate
            </button>
          </div>
        </SlideIn>
      )}

      {/* Sync Notification Banner */}
      {syncNotice && (
        <SlideIn delay={50} direction="down">
          {(() => {
            const isError =
              syncNotice.toLowerCase().includes('mismatch') ||
              syncNotice.toLowerCase().includes('failed') ||
              syncNotice.toLowerCase().includes('error');
            const isCancelled =
              syncNotice.toLowerCase().includes('closed') ||
              syncNotice.toLowerCase().includes('cancel');
            const isSuccess =
              syncNotice.toLowerCase().includes('success') ||
              syncNotice.toLowerCase().includes('ingested');

            const containerClasses = isError
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/40 text-rose-950 dark:text-rose-200'
              : isCancelled
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/40 text-amber-950 dark:text-amber-200'
              : isSuccess
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 text-emerald-950 dark:text-emerald-200'
              : 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-500/40 text-slate-900 dark:text-cyan-100';

            const iconClasses = isError
              ? 'text-rose-600 dark:text-rose-400'
              : isCancelled
              ? 'text-amber-600 dark:text-amber-400'
              : isSuccess
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-cyan-600 dark:text-cyan-400';

            const textClasses = isError
              ? 'text-rose-950 dark:text-rose-100'
              : isCancelled
              ? 'text-amber-950 dark:text-amber-100'
              : isSuccess
              ? 'text-emerald-950 dark:text-emerald-100'
              : 'text-slate-900 dark:text-cyan-100';

            return (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 animate-slide-down shadow-sm dark:shadow-none ${containerClasses}`}
              >
                <div className="flex items-center gap-2.5">
                  {isError || isCancelled ? (
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${iconClasses}`} />
                  ) : isSuccess ? (
                    <ShieldCheck className={`w-4 h-4 shrink-0 ${iconClasses}`} />
                  ) : (
                    <Sparkles className={`w-4 h-4 shrink-0 ${iconClasses}`} />
                  )}
                  <span className={`font-bold leading-relaxed ${textClasses}`}>
                    {syncNotice}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncNotice(null)}
                  className="text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white shrink-0 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors font-bold cursor-pointer text-sm"
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            );
          })()}
        </SlideIn>
      )}

      {/* Stat Metric Cards */}
      <SlideIn delay={80} direction="up">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          {[
            {
              label: 'Total Scanned',
              value: stats.total,
              subtitle: 'Inbox messages monitored',
              dotColor: 'bg-[#38bdf8]',
              numColor: 'text-sky-700 dark:text-[#38bdf8]',
              filter: 'all' as const,
            },
            {
              label: 'Clean & Authentic',
              value: stats.clean,
              subtitle: 'Verified safe communications',
              dotColor: 'bg-[#4ade80]',
              numColor: 'text-emerald-700 dark:text-[#4ade80]',
              filter: 'clean' as const,
            },
            {
              label: 'Suspicious Anomalies',
              value: stats.suspicious,
              subtitle: 'Require user caution',
              dotColor: 'bg-[#fbbf24]',
              numColor: 'text-amber-700 dark:text-[#fbbf24]',
              filter: 'suspicious' as const,
            },
            {
              label: 'Malicious Threats',
              value: stats.malicious,
              subtitle: 'Phishing & fraud intercepted',
              dotColor: 'bg-[#f87171]',
              numColor: 'text-red-700 dark:text-[#f87171]',
              filter: 'malicious' as const,
            },
          ].map((stat) => {
            return (
              <div
                key={stat.label}
                className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0c0e18] border border-slate-200 dark:border-white/[0.08] transition-all flex flex-col justify-between min-h-[92px] sm:min-h-[102px] shadow-none"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                    {stat.label}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${stat.dotColor}`} />
                </div>
                <div>
                  <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${stat.numColor}`}>
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 dark:text-gray-500 font-mono mt-0.5 truncate">
                    {stat.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SlideIn>

      {/* Filters and Search Bar */}
      <SlideIn delay={120} direction="up">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#11121b] border border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 shadow-sm">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-400" />
            <input
              type="text"
              value={filterState.searchQuery}
              onChange={(e) => {
                setFilterState((prev) => ({ ...prev, searchQuery: e.target.value }));
                setCurrentPage(1);
              }}
              placeholder="Search by sender, subject, or AI summary..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto overflow-y-hidden scrollbar-none touch-scroll touch-pan-x overscroll-x-contain pb-1 md:pb-0">
            <span className="text-xs text-slate-500 dark:text-gray-400 mr-1 flex items-center gap-1 shrink-0 font-medium">
              <Filter className="w-3.5 h-3.5" />
              Filter:
            </span>
            <div className="relative isolate flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/5 select-none">
              {/* Smooth sliding indicator pill */}
              <div
                className={`absolute pointer-events-none rounded-xl border transition-all duration-300 ease-out shadow-sm ${
                  filterState.threatLevel === 'malicious'
                    ? 'bg-red-500/15 dark:bg-red-500/20 border-red-400/60 dark:border-red-500/40 shadow-red-900/10'
                    : filterState.threatLevel === 'suspicious'
                      ? 'bg-amber-500/15 dark:bg-amber-500/20 border-amber-400/60 dark:border-amber-500/40 shadow-amber-900/10'
                      : filterState.threatLevel === 'clean'
                        ? 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-400/60 dark:border-emerald-500/40 shadow-emerald-900/10'
                        : 'bg-cyan-500/15 dark:bg-cyan-500/20 border-cyan-400/60 dark:border-cyan-500/40 shadow-cyan-900/10'
                }`}
                style={{
                  top: 0,
                  left: 0,
                  transform: `translate3d(${filterIndicatorStyle.left}px, ${filterIndicatorStyle.top}px, 0)`,
                  width: filterIndicatorStyle.width,
                  height: filterIndicatorStyle.height,
                  opacity: filterIndicatorStyle.opacity,
                  transition: 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1), width 300ms cubic-bezier(0.25, 1, 0.5, 1), height 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease',
                  zIndex: 0,
                }}
              />
              {[
                { id: 'all' as const, label: 'All Emails', icon: Inbox },
                { id: 'malicious' as const, label: 'Malicious', icon: ShieldAlert },
                { id: 'suspicious' as const, label: 'Suspicious', icon: AlertTriangle },
                { id: 'clean' as const, label: 'Clean', icon: ShieldCheck },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = filterState.threatLevel === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      filterRefs.current[tab.id] = el;
                      if (tab.id === filterState.threatLevel && el && filterIndicatorStyle.opacity === 0) {
                        setFilterIndicatorStyle({
                          left: el.offsetLeft,
                          top: el.offsetTop,
                          width: el.offsetWidth,
                          height: el.offsetHeight,
                          opacity: 1,
                        });
                      }
                    }}
                    onClick={() => {
                      setFilterState((prev) => ({ ...prev, threatLevel: tab.id }));
                      setCurrentPage(1);
                    }}
                    style={{ zIndex: 10 }}
                    className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-200 cursor-pointer shrink-0 ${
                      isActive
                        ? tab.id === 'malicious'
                          ? 'text-red-950 dark:text-red-200 font-bold'
                          : tab.id === 'suspicious'
                            ? 'text-amber-950 dark:text-amber-200 font-bold'
                            : tab.id === 'clean'
                              ? 'text-emerald-950 dark:text-emerald-200 font-bold'
                              : 'text-cyan-950 dark:text-cyan-200 font-bold'
                        : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive
                          ? tab.id === 'malicious'
                            ? 'text-red-700 dark:text-red-300'
                            : tab.id === 'suspicious'
                              ? 'text-amber-700 dark:text-amber-300'
                              : tab.id === 'clean'
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-cyan-700 dark:text-cyan-300'
                          : 'text-slate-500 dark:text-gray-400'
                      }`}
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SlideIn>

      {/* Main Paginated Emails: Mobile Cards + Desktop Table */}
      <SlideIn delay={160} direction="up">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#11121b] overflow-hidden shadow-sm dark:shadow-xl">
        {/* ── Mobile Card View (md:hidden) ── */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-white/5">
          {isLoading ? (
            <div className="py-12 text-center text-gray-400">
              <div className="flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                <span className="text-xs">Ingesting email feed and running Gemini security triage...</span>
              </div>
            </div>
          ) : paginatedEmails.length === 0 ? (
            <div className="py-12 px-4 text-center">
              {!isGoogleConnected ? (
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Mail className="w-7 h-7 text-cyan-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Connect Gmail to get started</p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">Link your Gmail account to monitor, scan and triage your inbox in real time.</p>
                  </div>
                  <button
                    onClick={handleConnectGoogle}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-cyan-900/30"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                    Connect Gmail
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-gray-400">
                  <Inbox className="w-8 h-8 text-slate-400 dark:text-gray-500" />
                  <span className="text-xs">No live Gmail messages loaded yet. Tap "Sync Now" above to fetch your inbox.</span>
                </div>
              )}
            </div>
          ) : (
            paginatedEmails.map((email) => {
              const level = email.analysis?.threat_level || 'clean';
              const rawScore = email.analysis?.threat_score;
              const displayScore = (rawScore === 5 || rawScore === undefined) && level === 'clean'
                ? generateRealisticCleanScore(`${email.id}:${email.sender}:${email.subject}`)
                : (rawScore ?? 5);
              const isRevertedBack =
                email.analysis?.escalation_completed ||
                (email.analysis?.soc_case_id && analyzedCaseIds.has(email.analysis.soc_case_id)) ||
                analyzedEmailIds.has(email.id);
              const showSocEscalated = email.analysis?.escalated_to_soc && !isRevertedBack;

              return (
                <div
                  key={email.id}
                  onClick={() => selectEmail(email)}
                  className="p-3.5 hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-white/[0.04] dark:active:bg-white/[0.08] transition-colors cursor-pointer space-y-2.5"
                >
                  {/* Row 1: Status badge + Date */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderRiskBadge(level, displayScore)}
                      {showSocEscalated && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-[10.5px] text-purple-700 dark:text-purple-300 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-pulse shrink-0" />
                          <span>SOC Escalated</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-gray-400 shrink-0 font-mono">
                      {new Date(email.received_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Row 2: Sender */}
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                      {decodeMimeHeader(email.sender_name || email.sender)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-gray-400 truncate">
                      {email.sender}
                    </div>
                  </div>

                  {/* Row 3: Subject & Snippet */}
                  <div className="space-y-0.5">
                    <div className="font-medium text-slate-800 dark:text-gray-200 text-xs line-clamp-1">
                      {decodeMimeHeader(email.subject)}
                    </div>
                    {email.snippet && (
                      <div className="text-[11px] text-slate-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {decodeMimeHeader(email.snippet)}
                      </div>
                    )}
                  </div>

                  {/* Row 4: Action */}
                  <div className="flex items-center justify-end pt-0.5">
                    <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400 font-medium">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Details &amp; Forensics →</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Desktop Data Table (hidden md:block) ── */}
        <div className="hidden md:block overflow-x-auto scrollbar-thin touch-scroll">
          <table className="w-full text-left text-xs min-w-[640px] md:min-w-0">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 dark:text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-44 whitespace-nowrap">Status / Risk</th>
                <th className="py-3.5 px-4 w-60">Sender</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4 w-36">Received</th>
                <th className="py-3.5 px-4 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-cyan-500 dark:text-cyan-400" />
                      <span>Ingesting email feed and running Gemini security triage...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedEmails.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    {!isGoogleConnected ? (
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                          <Mail className="w-7 h-7 text-cyan-500 dark:text-cyan-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Connect Gmail to get started</p>
                          <p className="text-xs text-slate-500 dark:text-gray-400">Link your Gmail account to monitor, scan and triage your inbox in real time.</p>
                        </div>
                        <button
                          onClick={handleConnectGoogle}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-cyan-900/30"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                          Connect Gmail
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-gray-400">
                        <Inbox className="w-8 h-8 text-slate-400 dark:text-gray-500" />
                        <span>No live Gmail messages loaded yet. Click "Sync Gmail" above to fetch and triage your real inbox.</span>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedEmails.map((email) => {
                  const level = email.analysis?.threat_level || 'clean';
                  const rawScore = email.analysis?.threat_score;
                  const displayScore = (rawScore === 5 || rawScore === undefined) && level === 'clean'
                    ? generateRealisticCleanScore(`${email.id}:${email.sender}:${email.subject}`)
                    : (rawScore ?? 5);
                  const isRevertedBack =
                    email.analysis?.escalation_completed ||
                    (email.analysis?.soc_case_id && analyzedCaseIds.has(email.analysis.soc_case_id)) ||
                    analyzedEmailIds.has(email.id);
                  const showSocEscalated = email.analysis?.escalated_to_soc && !isRevertedBack;

                  return (
                    <tr
                      key={email.id}
                      onClick={() => selectEmail(email)}
                      className="hover:bg-slate-50/80 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      {/* Risk Badge */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center gap-1 w-[136px]">
                          {renderRiskBadge(level, displayScore)}
                          {showSocEscalated && (
                            <span className="inline-flex items-center justify-center gap-1.5 text-[10.5px] leading-none text-purple-700 dark:text-purple-300 font-medium whitespace-nowrap tracking-wide">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-pulse shrink-0" />
                              <span className="leading-none">SOC Escalated</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sender */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="space-y-0.5 max-w-[220px]">
                          <div className="font-semibold text-slate-900 group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-300 transition-colors truncate text-xs">
                            {decodeMimeHeader(email.sender_name || email.sender)}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-gray-400 truncate">
                            {email.sender}
                          </div>
                        </div>
                      </td>

                      {/* Subject & Preview */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="space-y-0.5 pr-4">
                          <div className="font-medium text-slate-900 group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-200 transition-colors line-clamp-1 text-xs">
                            {decodeMimeHeader(email.subject)}
                          </div>
                          {email.snippet && (
                            <div className="text-[11px] text-slate-500 dark:text-gray-400 line-clamp-1">
                              {decodeMimeHeader(email.snippet)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 align-middle text-slate-500 dark:text-gray-400 text-[11px] whitespace-nowrap">
                        {new Date(email.received_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectEmail(email);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/20 text-xs flex items-center gap-1.5 font-medium transition-all cursor-pointer"
                            title="Inspect Details & Deep Forensics"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-gray-400 bg-slate-50/50 dark:bg-white/[0.01]">
          <div>
            Showing{' '}
            <span className="text-slate-900 dark:text-white font-semibold">
              {filteredEmails.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="text-slate-900 dark:text-white font-semibold">
              {Math.min(currentPage * itemsPerPage, filteredEmails.length)}
            </span>{' '}
            of <span className="text-slate-900 dark:text-white font-semibold">{filteredEmails.length}</span> emails
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-gray-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-gray-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </SlideIn>

      {/* Side Detail Drawer */}
      <EmailDetailDrawer
        email={selectedEmail}
        isOpen={Boolean(selectedEmail)}
        onClose={() => selectEmail(null)}
        onNavigate={onNavigate}
      />

      {/* Google OAuth 2.0 Setup Modal */}
      <GoogleSetupModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSuccessConnect={handleGoogleModalSuccess}
      />
    </div>
  );
}
