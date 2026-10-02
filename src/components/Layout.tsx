import {
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  Settings,
  LayoutDashboard,
  MailSearch,
  FileSearch,
  Globe2,
  MapPin,
  Share2,
  Network,
  FileText,
  Lock,
  ArrowRight,
  Upload,
  ClipboardList,
  Inbox,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  MessageSquare,
  Trash2,
  Mail,
} from 'lucide-react';
import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { getNavItemsForRole, type NavRole } from '@/config/navigation';
import type { LucideIcon } from 'lucide-react';
import { TransparentLogo } from '@/components/TransparentLogo';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets, type TicketMessage } from '@/contexts/TicketContext';
import { resultToAlert } from '@/utils/alertUtils';
import { SECURITY_ALERTS, type SecurityAlert } from '@/data/mockData';
import { SupabaseDataService } from '@/services/supabaseDataService';
import { UserNotificationService, type UserActivityNotification } from '@/services/userNotificationService';
import { NotificationRulesService } from '@/services/notificationRulesService';
import { useTheme } from '@/context/ThemeContext';
const analystAvatar = '/analyst.png';

interface SearchableItem {
  id: string;
  title: string;
  category: 'Page' | 'Forensic Tool' | 'Telemetry' | 'Module';
  route: string;
  description: string;
  keywords: string[];
  icon: LucideIcon;
  badgeColor: string;
  roles: NavRole[];
}

const SEARCHABLE_ITEMS: SearchableItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    category: 'Page',
    route: 'dashboard',
    description: 'Threat Operations Center, real-time KPI metrics & threat activity chart',
    keywords: ['dashboard', 'home', 'overview', 'kpi', 'metrics', 'threat activity', 'attack surface', 'live monitoring', 'stats'],
    icon: LayoutDashboard,
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    roles: ['analyst'],
  },
  {
    id: 'email-analyzer',
    title: 'Email Analyzer',
    category: 'Forensic Tool',
    route: 'email-analyzer',
    description: 'AI-assisted email analysis, raw EML parser, BEC & phishing detection',
    keywords: ['email analyzer', 'analyzer', 'eml', 'upload', 'paste', 'bec', 'phishing', 'spoofing', 'new analysis', 'scan email'],
    icon: MailSearch,
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    roles: ['analyst'],
  },
  {
    id: 'header-forensics',
    title: 'Header Forensics',
    category: 'Forensic Tool',
    route: 'header-forensics',
    description: 'SMTP relay hops, RFC-5322 header inspection & SPF/DKIM/DMARC auth',
    keywords: ['header forensics', 'headers', 'smtp', 'relay', 'hops', 'spf', 'dkim', 'dmarc', 'received', 'authentication'],
    icon: FileSearch,
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    roles: ['analyst'],
  },
  {
    id: 'threat-intelligence',
    title: 'Threat Intelligence',
    category: 'Telemetry',
    route: 'threat-intelligence',
    description: 'IP & domain reputation lookup, WHOIS records, DNS & homoglyph analysis',
    keywords: ['threat intelligence', 'intel', 'ip lookup', 'domain reputation', 'whois', 'dns', 'homoglyph', 'lookalike', 'ioc', 'reputation'],
    icon: Globe2,
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    roles: ['analyst'],
  },
  {
    id: 'origin-investigation',
    title: 'Origin Investigation',
    category: 'Telemetry',
    route: 'origin-investigation',
    description: 'Interactive global geolocation map, infrastructure nodes & originating IP trace',
    keywords: ['origin investigation', 'origin', 'geo', 'geolocation', 'map', 'infrastructure', 'ip location', 'trace', 'sending ip'],
    icon: MapPin,
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    roles: ['analyst'],
  },
  {
    id: 'attack-graph',
    title: 'Attack Graph',
    category: 'Forensic Tool',
    route: 'attack-graph',
    description: 'Interactive visual graph correlating emails, senders, domains, hashes & IPs',
    keywords: ['attack graph', 'graph', 'nodes', 'visualizer', 'correlations', 'flow', 'links', 'infrastructure graph'],
    icon: Share2,
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    roles: ['analyst'],
  },
  {
    id: 'campaigns',
    title: 'Campaign Intelligence',
    category: 'Module',
    route: 'campaigns',
    description: 'Correlated threat clusters, multi-vector campaign tracking & attack grouping',
    keywords: ['campaigns', 'campaign intelligence', 'clusters', 'threat cluster', 'create campaign', 'active clusters'],
    icon: Network,
    badgeColor: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
    roles: ['analyst'],
  },
  {
    id: 'reports',
    title: 'Forensic Reports & Export',
    category: 'Module',
    route: 'reports',
    description: 'Executive & technical dossiers, PDF export, printable incident records',
    keywords: ['reports', 'forensic reports', 'pdf export', 'export', 'dossier', 'download', 'print report', 'summary report'],
    icon: FileText,
    badgeColor: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    roles: ['analyst'],
  },
  {
    id: 'alerts',
    title: 'Security Alerts',
    category: 'Module',
    route: 'alerts',
    description: 'Real-time threat detection feed, SOC triage queue & alert status management',
    keywords: ['alerts', 'security alerts', 'notifications', 'soc triage', 'feed', 'new alerts', 'severity queue'],
    icon: Bell,
    badgeColor: 'text-red-400 bg-red-500/10 border-red-500/30',
    roles: ['analyst'],
  },
  {
    id: 'user-requests',
    title: 'User Requests',
    category: 'Module',
    route: 'user-requests',
    description: 'Review user-submitted report tickets, respond with investigation results',
    keywords: ['user requests', 'tickets', 'submissions', 'pending', 'review', 'respond'],
    icon: Inbox,
    badgeColor: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    roles: ['analyst'],
  },
  {
    id: 'submit-report',
    title: 'Submit Report',
    category: 'Page',
    route: 'submit-report',
    description: 'Upload a suspicious .eml file and submit it for analyst review',
    keywords: ['submit', 'report', 'upload', 'eml', 'ticket', 'suspicious email'],
    icon: Upload,
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    roles: ['user'],
  },
  {
    id: 'check-status',
    title: 'Check Status',
    category: 'Page',
    route: 'check-status',
    description: 'View the status of your submitted report tickets and analyst responses',
    keywords: ['check status', 'status', 'pending', 'analyzed', 'response', 'my tickets'],
    icon: ClipboardList,
    badgeColor: 'text-green-400 bg-green-500/10 border-green-500/30',
    roles: ['user'],
  },
  {
    id: 'settings',
    title: 'Settings & Configuration',
    category: 'Page',
    route: 'settings',
    description: 'API keys, AI model preferences, detection engine & dark theme configuration',
    keywords: ['settings', 'config', 'api key', 'claude', 'gemini', 'engine', 'theme', 'model'],
    icon: Settings,
    badgeColor: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
    roles: ['analyst', 'user'],
  },
];

interface SidebarProps {
  activeId: string;
  onNavigate: (id: string) => void;
  onSignOut: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ activeId, onNavigate, onSignOut, mobileOpen, onMobileClose }: SidebarProps) {
  const { currentUser } = useAuth();
  const { tickets } = useTickets();
  const { isDark } = useTheme();
  const role = currentUser?.role ?? 'analyst';

  const navList = getNavItemsForRole(role as NavRole);

  // Count pending tickets for analyst badge
  const pendingCount = role === 'analyst'
    ? tickets.filter((t) => t.status === 'pending').length
    : 0;

  return (
    <>
      {mobileOpen && (
        <div
          className="soc-mobile-backdrop fixed inset-0 bg-black/70 backdrop-blur-sm z-[9990] lg:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={`soc-sidebar fixed lg:static inset-y-0 left-0 z-[9999] lg:z-auto w-64 flex flex-col transition-transform duration-300 bg-white dark:bg-[#08090e] border-r border-slate-200 dark:border-white/[0.06] ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div
          className="soc-sidebar-header relative h-[88px] flex items-center justify-between pl-4 pr-3 shrink-0 border-b border-slate-200 dark:border-white/[0.06]"
        >
          <TransparentLogo
            src={isDark ? "/MAILVEIL_DARKMODE.png" : "/MAILVEIL_LIGHTMODE.png"}
            alt="Mailveil"
            className="h-[60px] max-w-[232px] w-auto object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.25)] transition-transform hover:scale-105"
          />
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg lg:hidden text-slate-400 hover:text-slate-900 dark:text-base-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-0.5">
          {navList.map((item) => {
            const Icon = item.icon;
            const active = activeId === item.id;
            const showBadge = item.id === 'user-requests' && pendingCount > 0;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onMobileClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left ${active
                  ? 'bg-sky-50 dark:bg-blue-500/15 text-sky-600 dark:text-white border border-sky-200 dark:border-blue-500/25 shadow-sm'
                  : 'text-slate-900 dark:text-gray-400 hover:text-black dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-white/[0.04] border border-transparent'
                  }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-sky-600 dark:text-blue-400' : 'text-slate-700 dark:text-gray-400'
                    }`}
                />
                <span className="truncate text-slate-900 dark:text-inherit font-semibold">{item.label}</span>
                {showBadge && (
                  <span
                    className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-violet-500/25 text-violet-600 dark:text-violet-300 border border-violet-500/40 shrink-0"
                  >
                    {pendingCount}
                  </span>
                )}
                {active && !showBadge && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-blue-400 shrink-0"
                    style={{ boxShadow: '0 0 6px #60a5fa' }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-white/[0.06] space-y-1">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-800 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.06] transition-all duration-150 group font-medium"
          >
            <LogOut className="w-4 h-4 text-slate-700 dark:text-gray-500 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors shrink-0" />
            <span className="text-slate-900 dark:text-inherit">Sign Out</span>
          </button>
        </div>

        <div className="border-t border-slate-200 dark:border-[#1a1a1a] p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden"
              style={{
                background: role === 'analyst'
                  ? 'linear-gradient(135deg, #1e3a5f, #0f2340)'
                  : 'linear-gradient(135deg, #1e3a2f, #0f2318)',
                border: role === 'analyst'
                  ? '1px solid rgba(59,130,246,0.4)'
                  : '1px solid rgba(34,197,94,0.4)',
              }}
            >
              {role === 'analyst' ? (
                <img
                  src={analystAvatar}
                  alt="Analyst"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.displayName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                currentUser?.initials ?? 'U'
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate text-slate-900 dark:text-white">{currentUser?.displayName ?? 'User'}</p>
              <p className="text-xs truncate font-medium" style={{ color: role === 'analyst' ? '#0284c7' : '#16a34a' }}>
                {role === 'analyst' ? 'Cybersecurity Analyst' : 'Standard User'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

interface TopBarProps {
  onMenuClick: () => void;
  activeLabel: string;
  onNavigate: (id: string) => void;
  mobileOpen?: boolean;
}

const ALERT_SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; dot: string; glow: string }> = {
  critical: { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.35)',   text: '#f87171', dot: '#ef4444', glow: 'rgba(239,68,68,0.18)' },
  high:     { bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.35)',  text: '#fb923c', dot: '#f97316', glow: 'rgba(249,115,22,0.15)' },
  medium:   { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.35)',  text: '#fbbf24', dot: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
  low:      { bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.35)',  text: '#60a5fa', dot: '#3b82f6', glow: 'rgba(59,130,246,0.12)' },
  info:     { bg: 'rgba(34,211,238,0.1)',  border: 'rgba(34,211,238,0.35)',  text: '#67e8f9', dot: '#22d3ee', glow: 'rgba(34,211,238,0.12)' },
};

export interface SystemNotification {
  id: string;
  title: string;
  msg: string;
  time: string;
  timestamp: number;
  sev: 'critical' | 'high' | 'medium' | 'info';
  category: 'alerts' | 'intel' | 'auth' | 'system' | 'ticket';
  route: string;
  read: boolean;
  ticketId?: string;
}



export function TopBar({ onMenuClick, onNavigate, mobileOpen }: TopBarProps) {
  const { isDark } = useTheme();
  const { currentUser } = useAuth();
  const { tickets } = useTickets();
  const role = currentUser?.role ?? 'analyst';
  const isAnalyst = role === 'analyst';

  const { analyzedReports } = useAnalysis();
  const [notifOpen, setNotifOpen] = useState(false);
  const [alertIdx, setAlertIdx] = useState(0);
  const [slideState, setSlideState] = useState<'in' | 'out'>('in');

  // Track read notification IDs in Supabase and localStorage
  const userNotifKey = currentUser?.email || role;
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`sentinel_read_notifs_${userNotifKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track dismissed (deleted) notification IDs in localStorage
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`sentinel_dismissed_notifs_${userNotifKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync notification read state from Supabase on mount/user change
  useEffect(() => {
    let active = true;
    if (userNotifKey) {
      SupabaseDataService.fetchReadNotifications(userNotifKey).then((remoteIds) => {
        if (active && remoteIds && remoteIds.length > 0) {
          setReadNotifIds(remoteIds);
        }
      }).catch((e) => console.warn('Supabase fetchReadNotifications error:', e));
    }
    return () => { active = false; };
  }, [userNotifKey]);

  const saveReadNotifs = (ids: string[]) => {
    setReadNotifIds(ids);
    try {
      localStorage.setItem(`sentinel_read_notifs_${userNotifKey}`, JSON.stringify(ids));
    } catch { /* ignore */ }
    SupabaseDataService.saveReadNotifications(userNotifKey, ids).catch((e) => {
      console.warn('Supabase saveReadNotifications error:', e);
    });
  };

  // Custom user and analyst notifications (Gmail connected, password updated, name changed)
  const effectiveEmail = (currentUser?.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('sentinel_user') : '') || '').trim().toLowerCase();
  const [customUserNotifs, setCustomUserNotifs] = useState<UserActivityNotification[]>(() => {
    return effectiveEmail ? UserNotificationService.getUserNotifications(effectiveEmail) : [];
  });

  useEffect(() => {
    if (effectiveEmail) {
      setCustomUserNotifs(UserNotificationService.getUserNotifications(effectiveEmail));
    } else {
      setCustomUserNotifs([]);
    }
  }, [effectiveEmail]);

  // Real-time listener for dispatched user and analyst activity notifications
  useEffect(() => {
    const handleNewNotif = (e: Event) => {
      const customEvt = e as CustomEvent<UserActivityNotification & { userEmail?: string }>;
      const notif = customEvt.detail;
      if (!notif) return;
      const currentEmail = (effectiveEmail || '').trim().toLowerCase();
      if (notif.userEmail && currentEmail && notif.userEmail.toLowerCase() !== currentEmail) return;

      setCustomUserNotifs((prev) => [notif, ...prev.filter((p) => p.id !== notif.id)]);
      fireToast({
        id: notif.id,
        title: notif.title,
        msg: notif.msg,
        time: notif.time,
        timestamp: notif.timestamp,
        sev: notif.sev,
        category: notif.category,
        route: notif.route,
        read: false,
      });
    };

    window.addEventListener('sentinel_user_notification_dispatched', handleNewNotif);
    return () => {
      window.removeEventListener('sentinel_user_notification_dispatched', handleNewNotif);
    };
  }, [effectiveEmail]);

  // Build notifications dynamically from tickets, analyzedReports, and system alerts
  const notifications: SystemNotification[] = useMemo(() => {
    if (!isAnalyst) {
      if (!currentUser?.email) return [];
      const userMail = currentUser.email.toLowerCase().trim();
      const myTickets = tickets.filter((t) => t.userEmail.toLowerCase().trim() === userMail);
      const notifs: SystemNotification[] = [];

      // 1. User activity notifications (Gmail connected, password updated, name changed)
      customUserNotifs.forEach((cn) => {
        notifs.push({
          id: cn.id,
          title: cn.title,
          msg: cn.msg,
          time: cn.time,
          timestamp: cn.timestamp,
          sev: cn.sev,
          category: cn.category,
          route: cn.route,
          read: readNotifIds.includes(cn.id),
        });
      });

      myTickets.forEach((t) => {
        const subTime = new Date(t.submittedAt).getTime() || (Date.now() - 60000);
        const respTime = t.respondedAt ? new Date(t.respondedAt).getTime() : subTime + 1000;

        // 1. If analyzed, add the completed review notification (with higher timestamp)
        if (t.status === 'analyzed') {
          const revId = `notif-rev-${t.id}`;
          notifs.push({
            id: revId,
            title: 'Report Review Complete',
            msg: `Analyst completed review for ${t.id}. Forensic report and findings are ready in Check Status.`,
            time: t.respondedAt ? new Date(t.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Completed',
            timestamp: respTime,
            sev: 'high',
            category: 'ticket',
            route: 'check-status',
            ticketId: t.id,
            read: readNotifIds.includes(revId),
          });
        }

        // 2. If in_review, add the active investigation notification
        if (t.status === 'in_review') {
          const inRevId = `notif-in-review-${t.id}`;
          notifs.push({
            id: inRevId,
            title: 'Case Under Active Investigation',
            msg: `SOC Analyst has started investigating ${t.id}. Telemetry & header analysis in progress.`,
            time: t.respondedAt ? new Date(t.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Review',
            timestamp: respTime,
            sev: 'info',
            category: 'ticket',
            route: 'check-status',
            ticketId: t.id,
            read: readNotifIds.includes(inRevId),
          });
        }

        // 3. If resolved, add resolution notification
        if (t.status === 'resolved' || t.status === 'closed') {
          const resId = `notif-res-${t.id}`;
          notifs.push({
            id: resId,
            title: 'Case Resolved & Confirmed',
            msg: `Case ${t.id} has been marked resolved. Thank you for your feedback!`,
            time: t.closedAt ? new Date(t.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Resolved',
            timestamp: t.closedAt ? new Date(t.closedAt).getTime() : respTime + 1000,
            sev: 'info',
            category: 'ticket',
            route: 'check-status',
            ticketId: t.id,
            read: readNotifIds.includes(resId),
          });
        }

        // 4. Add analyst live messages in ticket thread
        if (t.threadMessages && t.threadMessages.length > 0) {
          const analystMsgs = t.threadMessages.filter((m) => m.sender === 'analyst');
          analystMsgs.forEach((m) => {
            const msgId = `notif-msg-${m.id}`;
            notifs.push({
              id: msgId,
              title: `Analyst Message (${t.id})`,
              msg: m.message,
              time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              timestamp: new Date(m.timestamp).getTime(),
              sev: 'medium',
              category: 'ticket',
              route: 'check-status',
              ticketId: t.id,
              read: readNotifIds.includes(msgId),
            });
          });
        }

        // 5. Add the submitted ticket notification
        const subId = `notif-sub-${t.id}`;
        notifs.push({
          id: subId,
          title: 'Report Submitted',
          msg: `Case ${t.id} successfully submitted — queued for review`,
          time: new Date(t.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: subTime,
          sev: 'info',
          category: 'ticket',
          route: 'check-status',
          ticketId: t.id,
          read: readNotifIds.includes(subId),
        });
      });

      // Sort descending: newest (highest timestamp) strictly at the very top
      return notifs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    // ── Analyst Notifications ──
    const analystNotifs: SystemNotification[] = [];

    // 1. User ticket requests
    tickets.forEach((t) => {
      const isPending = t.status === 'pending';
      const isInReview = t.status === 'in_review';
      const isAnalyzed = t.status === 'analyzed';
      const isResolved = t.status === 'resolved' || t.status === 'closed';
      const tickId = `notif-analyst-ticket-${t.id}-${t.status}`;
      const subTime = new Date(t.submittedAt).getTime() || (Date.now() - 60000);
      const respTime = t.respondedAt ? new Date(t.respondedAt).getTime() : subTime + 1000;

      let title = 'Report Request Update';
      let msg = `${t.userEmail} — ${t.id}`;
      let sev: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'info';

      if (isPending) {
        title = 'New Report Request Received';
        msg = `${t.userEmail} submitted ${t.id} — awaiting review`;
        sev = 'high';
      } else if (isInReview) {
        title = 'Case Under Active Investigation';
        msg = `Investigation started for ${t.id} (${t.userEmail})`;
        sev = 'info';
      } else if (isAnalyzed) {
        title = 'Report Analyzed & Sent';
        msg = `Investigation for ${t.id} completed and sent to ${t.userEmail}`;
        sev = 'info';
      } else if (isResolved) {
        title = 'Case Resolved & Confirmed';
        msg = `${t.userEmail} acknowledged resolution for ${t.id}`;
        sev = 'info';
      }

      analystNotifs.push({
        id: tickId,
        title,
        msg,
        time: isPending
          ? new Date(t.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : (t.respondedAt ? new Date(t.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Updated'),
        timestamp: isPending ? subTime : respTime,
        sev,
        category: 'ticket',
        route: 'user-requests',
        ticketId: t.id,
        read: readNotifIds.includes(tickId),
      });

      // 1b. User messages in ticket thread for analyst
      if (t.threadMessages && t.threadMessages.length > 0) {
        const userMsgs = t.threadMessages.filter((m) => m.sender === 'user');
        userMsgs.forEach((m) => {
          const msgId = `notif-analyst-msg-${t.id}-${m.id}`;
          analystNotifs.push({
            id: msgId,
            title: `User Message (${t.id})`,
            msg: `${m.senderName || t.userEmail}: "${m.message}"`,
            time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(m.timestamp).getTime(),
            sev: 'high',
            category: 'ticket',
            route: 'user-requests',
            ticketId: t.id,
            read: readNotifIds.includes(msgId),
          });
        });
      }
    });

    // 2. Newly analyzed local SOC reports (threats only: score >= 40, never benign / authentic)
    analyzedReports
      .filter((r) => {
        const v = (r.verdict || '').toLowerCase();
        const s = r.threat_score ?? 0;
        return s >= 40 && !v.includes('benign') && !v.includes('authentic') && !v.includes('legitimate');
      })
      .forEach((r, idx) => {
        const isCrit = (r.threat_score ?? 0) >= 70;
        const repId = `notif-soc-rep-${r.case_id}`;
        analystNotifs.push({
          id: repId,
          title: isCrit ? 'Critical Threat Detected' : 'Threat Analyzed',
          msg: `${r.verdict} — ${r.case_id} (Score: ${r.threat_score}/100)`,
          time: 'Analyzed',
          timestamp: Date.now() - (idx + 1) * 30000,
          sev: isCrit ? 'critical' : 'high',
          category: 'alerts',
          route: 'alerts',
          read: readNotifIds.includes(repId),
        });
      });

    // 3. Account activity notifications (Gmail connected, password updated, name changed)
    customUserNotifs.forEach((cn) => {
      analystNotifs.push({
        id: cn.id,
        title: cn.title,
        msg: cn.msg,
        time: cn.time,
        timestamp: cn.timestamp,
        sev: cn.sev,
        category: cn.category,
        route: cn.route,
        read: readNotifIds.includes(cn.id),
      });
    });

    // Sort descending: newest on top
    return analystNotifs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [isAnalyst, currentUser?.email, tickets, analyzedReports, readNotifIds, customUserNotifs]);

  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
  }, []);

  const [notifCategory, setNotifCategory] = useState<'all' | 'requests' | 'alerts' | 'intel' | 'system' | 'ticket'>('all');
  const notifTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [notifIndicatorStyle, setNotifIndicatorStyle] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    opacity: number;
  }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const currentTabEl = notifTabRefs.current[notifCategory];
      if (currentTabEl) {
        setNotifIndicatorStyle({
          left: currentTabEl.offsetLeft,
          top: currentTabEl.offsetTop,
          width: currentTabEl.offsetWidth,
          height: currentTabEl.offsetHeight,
          opacity: 1,
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
  }, [notifCategory, notifOpen]);

  const [activeToast, setActiveToast] = useState<SystemNotification | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const prevReportsCountRef = useRef(analyzedReports.length);
  const prevTicketsCountRef = useRef(tickets.length);
  const prevUserTicketsCountRef = useRef(
    tickets.filter((t) => t.userEmail.toLowerCase().trim() === currentUser?.email?.toLowerCase().trim()).length
  );
  const prevInReviewTicketsRef = useRef<string[]>(
    tickets
      .filter((t) => t.userEmail.toLowerCase().trim() === currentUser?.email?.toLowerCase().trim() && t.status === 'in_review')
      .map((t) => t.id)
  );
  const prevAnalyzedTicketsRef = useRef<string[]>(
    tickets
      .filter((t) => t.userEmail.toLowerCase().trim() === currentUser?.email?.toLowerCase().trim() && t.status === 'analyzed')
      .map((t) => t.id)
  );
  const prevAnalystMessagesRef = useRef<string[]>(
    tickets
      .filter((t) => t.userEmail.toLowerCase().trim() === currentUser?.email?.toLowerCase().trim())
      .flatMap((t) => (t.threadMessages || []).filter((m) => m.sender === 'analyst').map((m) => m.id))
  );
  const prevUserMessagesRef = useRef<string[]>(
    tickets.flatMap((t) => (t.threadMessages || []).filter((m) => m.sender === 'user').map((m) => m.id))
  );
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Keep tracking refs in sync when active user or role switches
  const prevUserEmailRef = useRef(currentUser?.email);
  const prevRoleRef = useRef(role);
  useEffect(() => {
    if (prevUserEmailRef.current !== currentUser?.email || prevRoleRef.current !== role) {
      prevUserEmailRef.current = currentUser?.email;
      prevRoleRef.current = role;
      const userMail = currentUser?.email?.toLowerCase().trim();
      const myTickets = userMail ? tickets.filter((t) => t.userEmail.toLowerCase().trim() === userMail) : [];
      prevUserTicketsCountRef.current = myTickets.length;
      prevInReviewTicketsRef.current = myTickets.filter((t) => t.status === 'in_review').map((t) => t.id);
      prevAnalyzedTicketsRef.current = myTickets.filter((t) => t.status === 'analyzed').map((t) => t.id);
      prevAnalystMessagesRef.current = myTickets.flatMap((t) => (t.threadMessages || []).filter((m) => m.sender === 'analyst').map((m) => m.id));
      prevUserMessagesRef.current = tickets.flatMap((t) => (t.threadMessages || []).filter((m) => m.sender === 'user').map((m) => m.id));
    }
  }, [currentUser?.email, role, tickets]);

  // Analyst: toast when a new user ticket is submitted OR when a user sends a message
  useEffect(() => {
    if (!isAnalyst) return;

    // A. New ticket request submitted
    if (tickets.length > prevTicketsCountRef.current) {
      const newest = tickets[0];
      if (newest && isMountedRef.current) {
        const n: SystemNotification = {
          id: `notif-ticket-${Date.now()}`,
          title: 'New Report Request Received',
          msg: `${newest.userEmail} submitted ${newest.id} — awaiting review`,
          time: 'Just now',
          timestamp: Date.now(),
          sev: 'high',
          category: 'ticket',
          route: 'user-requests',
          ticketId: newest.id,
          read: false,
        };
        fireToast(n);
      }
    }
    prevTicketsCountRef.current = tickets.length;

    // B. New message from user in any ticket thread
    const allUserMsgs: { ticketId: string; userEmail: string; msg: TicketMessage }[] = [];
    tickets.forEach((t) => {
      (t.threadMessages || []).forEach((m) => {
        if (m.sender === 'user') {
          allUserMsgs.push({ ticketId: t.id, userEmail: t.userEmail, msg: m });
        }
      });
    });

    const newMsgs = allUserMsgs.filter((item) => !prevUserMessagesRef.current.includes(item.msg.id));
    if (newMsgs.length > 0 && isMountedRef.current) {
      const latest = newMsgs[newMsgs.length - 1];
      const n: SystemNotification = {
        id: `notif-analyst-toast-msg-${latest.msg.id}`,
        title: `New Message (${latest.ticketId})`,
        msg: `${latest.msg.senderName || latest.userEmail}: "${latest.msg.message}"`,
        time: 'Just now',
        timestamp: Date.now(),
        sev: 'high',
        category: 'ticket',
        route: 'user-requests',
        ticketId: latest.ticketId,
        read: false,
      };
      fireToast(n);
    }
    prevUserMessagesRef.current = allUserMsgs.map((item) => item.msg.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, isAnalyst]);

  // Standard user: toast when ticket is submitted, moved to in_review, analyst responds, or analyst sends message
  useEffect(() => {
    if (isAnalyst || !currentUser?.email) return;
    const userMail = currentUser.email.toLowerCase().trim();
    const myTickets = tickets.filter((t) => t.userEmail.toLowerCase().trim() === userMail);

    // 1. Submission toast
    if (myTickets.length > prevUserTicketsCountRef.current) {
      const newest = myTickets[0];
      if (newest && isMountedRef.current) {
        const n: SystemNotification = {
          id: `notif-sub-${Date.now()}`,
          title: 'Report Submitted',
          msg: `Case ${newest.id} successfully submitted — queued for review`,
          time: 'Just now',
          timestamp: Date.now(),
          sev: 'info',
          category: 'ticket',
          route: 'check-status',
          ticketId: newest.id,
          read: false,
        };
        fireToast(n);
      }
    }
    prevUserTicketsCountRef.current = myTickets.length;

    // 2. In-Review notification: Analyst started investigation
    const currentInReview = myTickets.filter((t) => t.status === 'in_review');
    const newInReviewTicket = currentInReview.find((t) => !prevInReviewTicketsRef.current.includes(t.id));
    if (newInReviewTicket && isMountedRef.current) {
      const n: SystemNotification = {
        id: `notif-in-review-${Date.now()}`,
        title: 'Investigation In Progress',
        msg: `SOC Analyst has started investigating ${newInReviewTicket.id}. Check telemetry & status.`,
        time: 'Just now',
        timestamp: Date.now(),
        sev: 'info',
        category: 'ticket',
        route: 'check-status',
        ticketId: newInReviewTicket.id,
        read: false,
      };
      fireToast(n);
    }
    prevInReviewTicketsRef.current = currentInReview.map((t) => t.id);

    // 3. Review completed notification
    const currentAnalyzed = myTickets.filter((t) => t.status === 'analyzed');
    const newAnalyzedTicket = currentAnalyzed.find((t) => !prevAnalyzedTicketsRef.current.includes(t.id));
    if (newAnalyzedTicket && isMountedRef.current) {
      const emailNotifEnabled = NotificationRulesService.isEmailNotificationsEnabled(userMail);
      const n: SystemNotification = {
        id: `notif-analyzed-${Date.now()}`,
        title: 'Report Review Complete',
        msg: `Analyst completed review for ${newAnalyzedTicket.id}. Forensic report is ready.${emailNotifEnabled ? ` (Notice dispatched to ${userMail})` : ''}`,
        time: 'Just now',
        timestamp: Date.now(),
        sev: 'high',
        category: 'ticket',
        route: 'check-status',
        ticketId: newAnalyzedTicket.id,
        read: false,
      };
      fireToast(n);

      if (emailNotifEnabled) {
        NotificationRulesService.sendSampleEmailNotification(
          userMail,
          `Forensic investigation finished for case ${newAnalyzedTicket.id}. Detailed threat summary and mitigations are now accessible in your dashboard.`
        );
      }
    }
    prevAnalyzedTicketsRef.current = currentAnalyzed.map((t) => t.id);

    // 4. New analyst message in user's ticket thread
    const allAnalystMsgs: { ticketId: string; msg: TicketMessage }[] = [];
    myTickets.forEach((t) => {
      (t.threadMessages || []).forEach((m) => {
        if (m.sender === 'analyst') {
          allAnalystMsgs.push({ ticketId: t.id, msg: m });
        }
      });
    });

    const newAnalystMsgs = allAnalystMsgs.filter((item) => !prevAnalystMessagesRef.current.includes(item.msg.id));
    if (newAnalystMsgs.length > 0 && isMountedRef.current) {
      const latest = newAnalystMsgs[newAnalystMsgs.length - 1];
      const n: SystemNotification = {
        id: `notif-user-toast-msg-${latest.msg.id}`,
        title: `Analyst Message (${latest.ticketId})`,
        msg: latest.msg.message,
        time: 'Just now',
        timestamp: Date.now(),
        sev: 'medium',
        category: 'ticket',
        route: 'check-status',
        ticketId: latest.ticketId,
        read: false,
      };
      fireToast(n);
    }
    prevAnalystMessagesRef.current = allAnalystMsgs.map((item) => item.msg.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, currentUser?.email, isAnalyst]);

  // Analyst: new analysis report → notification + toast
  useEffect(() => {
    if (!isAnalyst) return;
    if (analyzedReports.length > prevReportsCountRef.current) {
      const latestReport = analyzedReports[0];
      if (latestReport) {
        const v = (latestReport.verdict || '').toLowerCase();
        const isThreat = (latestReport.threat_score ?? 0) >= 40 && !v.includes('benign') && !v.includes('authentic') && !v.includes('legitimate');
        if (isThreat) {
          const isCrit = (latestReport.threat_score ?? 0) >= 70;
          const userEmail = currentUser?.email;
          const criticalEnabled = NotificationRulesService.isCriticalAlertsEnabled(userEmail);

          // If critical alert is disabled, skip pop-up toast & push alert for critical items
          if (!isCrit || criticalEnabled) {
            const newNotif: SystemNotification = {
              id: `notif-${Date.now()}`,
              title: isCrit ? 'Critical Threat Detected' : 'Threat Analyzed',
              msg: `${latestReport.verdict} — ${latestReport.case_id} (Score: ${latestReport.threat_score}/100)`,
              time: 'Just now',
              timestamp: Date.now(),
              sev: isCrit ? 'critical' : 'high',
              category: 'alerts',
              route: 'alerts',
              read: false,
            };
            fireToast(newNotif);

            if (isCrit && criticalEnabled) {
              NotificationRulesService.sendBrowserPush(
                `🚨 [CRITICAL THREAT] ${latestReport.case_id}`,
                `${latestReport.verdict} (Score: ${latestReport.threat_score}/100)`
              );
            }
          }
        }
      }
    }
    prevReportsCountRef.current = analyzedReports.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzedReports, currentUser?.email, isAnalyst]);

  function fireToast(n: SystemNotification) {
    setActiveToast(n);
    const showTimer = setTimeout(() => setToastVisible(true), 50);
    const hideTimer = setTimeout(() => {
      setToastVisible(false);
      setTimeout(() => setActiveToast(null), 450);
    }, 3800);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutsideNotif = (e: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        const btn = document.getElementById('topbar-notif-btn');
        if (btn && btn.contains(e.target as Node)) return;
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutsideNotif);
      return () => document.removeEventListener('mousedown', handleClickOutsideNotif);
    }
  }, [notifOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    saveReadNotifs([...new Set([...readNotifIds, ...allIds])]);
  };

  const handleNotificationClick = (n: SystemNotification) => {
    saveReadNotifs([...new Set([...readNotifIds, n.id])]);
    setNotifOpen(false);
    if (n.ticketId) {
      sessionStorage.setItem('sentinel_active_ticket_id', n.ticketId);
    }
    if (n.route === 'settings') {
      const targetTab = n.id.includes('pwd') ? 'password' : 'profile';
      try {
        sessionStorage.setItem('settings_active_tab', targetTab);
        window.dispatchEvent(new CustomEvent('sentinel_open_settings_tab', { detail: targetTab }));
      } catch { /* ignore */ }
    }
    onNavigate(n.route);
  };

  const dismissNotification = (id: string) => {
    const updated = [...new Set([...dismissedNotifIds, id])];
    setDismissedNotifIds(updated);
    try {
      localStorage.setItem(`sentinel_dismissed_notifs_${userNotifKey}`, JSON.stringify(updated));
    } catch { /* ignore */ }
    if (effectiveEmail) {
      UserNotificationService.deleteUserNotification(effectiveEmail, id);
      setCustomUserNotifs((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const filteredNotifs = useMemo(() => {
    const notDismissed = (n: SystemNotification) => !dismissedNotifIds.includes(n.id);
    if (!isAnalyst) {
      return notifications.filter((n) => (n.category === 'ticket' || n.category === 'system' || n.category === 'auth') && notDismissed(n));
    }
    let base = notifications;
    if (notifCategory === 'requests' || notifCategory === 'ticket') base = notifications.filter((n) => n.category === 'ticket');
    else if (notifCategory === 'alerts') base = notifications.filter((n) => n.category === 'alerts');
    else if (notifCategory === 'intel') base = notifications.filter((n) => n.category === 'intel' || n.category === 'auth');
    else if (notifCategory === 'system') base = notifications.filter((n) => n.category === 'system');
    return base.filter(notDismissed);
  }, [notifications, notifCategory, isAnalyst, dismissedNotifIds]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedSearchIdx, setSelectedSearchIdx] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Derive live alerts from analyzed reports or fallback to baseline alerts (analyst only)
  const activeAlerts: SecurityAlert[] = useMemo(() => {
    if (!isAnalyst) return [];
    if (analyzedReports && analyzedReports.length > 0) {
      return analyzedReports.map(resultToAlert);
    }
    return SECURITY_ALERTS;
  }, [analyzedReports, isAnalyst]);

  // Rotate every 6 seconds on loop with smooth slide transition
  useEffect(() => {
    if (activeAlerts.length <= 1) return;
    const timer = setInterval(() => {
      setSlideState('out');
      setTimeout(() => {
        setAlertIdx((prev) => (prev + 1) % activeAlerts.length);
        setSlideState('in');
      }, 350);
    }, 6000);

    return () => clearInterval(timer);
  }, [activeAlerts.length]);

  const currentAlert = activeAlerts[alertIdx % (activeAlerts.length || 1)] || activeAlerts[0];
  const sevKey = (currentAlert?.severity || 'medium').toLowerCase();
  const sevStyle = ALERT_SEVERITY_STYLES[sevKey] || ALERT_SEVERITY_STYLES.medium;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSearchItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const currentRole = (role === 'user' ? 'user' : 'analyst') as NavRole;
    const roleFiltered = SEARCHABLE_ITEMS.filter((item) =>
      item.roles.includes(currentRole) || item.roles.includes('all')
    );
    if (!q) return roleFiltered;
    return roleFiltered.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchCat || matchKeywords;
    });
  }, [searchQuery, role]);

  useEffect(() => {
    setSelectedSearchIdx(0);
  }, [filteredSearchItems]);

  const handleSelectSearchItem = (item: SearchableItem) => {
    onNavigate(item.route);
    setSearchOpen(false);
    setSearchQuery('');
    searchInputRef.current?.blur();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSearchIdx((prev) => (prev + 1) % Math.max(1, filteredSearchItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSearchIdx((prev) => (prev - 1 + filteredSearchItems.length) % Math.max(1, filteredSearchItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSearchItems[selectedSearchIdx]) {
        handleSelectSearchItem(filteredSearchItems[selectedSearchIdx]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  return (
    <header
      className="flex items-center justify-between gap-3 px-4 lg:px-5 shrink-0 bg-white dark:bg-[#0b0c11] border-b border-slate-200 dark:border-white/[0.06] shadow-sm transition-colors select-none touch-none lg:touch-auto z-20"
      style={{
        height: 'calc(4rem + env(safe-area-inset-top, 0px))',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="flex items-center gap-3 relative" ref={searchContainerRef}>
        <button
          onClick={onMenuClick}
          className="lg:hidden text-slate-500 hover:text-slate-900 dark:text-gray-500 dark:hover:text-white transition-colors shrink-0 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 touch-auto cursor-pointer"
          title={mobileOpen ? "Close Menu" : "Open Menu"}
        >
          {mobileOpen ? <X className="w-5 h-5 text-cyan-500" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Mobile Search Button */}
        <button
          onClick={() => {
            setSearchOpen(!searchOpen);
            if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 100);
          }}
          className="md:hidden text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 shrink-0 touch-auto cursor-pointer"
          title="Search tools and telemetry"
        >
          <Search className="w-4 h-4" />
        </button>

        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl w-80 transition-all duration-200 bg-slate-100 dark:bg-white border border-slate-200 dark:border-slate-200 shadow-sm"
        >
          <Search className={`w-3.5 h-3.5 shrink-0 transition-colors ${searchOpen ? 'text-sky-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-400'}`} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search pages, tools, telemetry..."
            className="bg-transparent text-xs text-slate-900 dark:text-slate-900 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none w-full font-mono"
          />
          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-600 p-0.5 text-[10px]"
            >
              ✕
            </button>
          ) : (
            <kbd
              className="shrink-0 flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-100 border border-slate-300/60 dark:border-slate-200"
            >
              ⌘K
            </kbd>
          )}
        </div>

        {searchOpen && (
          <div
            className="fixed md:absolute top-16 md:top-12 left-3 right-3 md:left-0 md:right-auto w-auto md:w-96 rounded-2xl p-2.5 md:p-2 z-50 shadow-2xl backdrop-blur-xl animate-fade-in bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100"
          >
            {/* Mobile-only Search input field */}
            <div className="md:hidden flex items-center gap-2 px-3 py-2 rounded-xl mb-2 bg-slate-100 dark:bg-white border border-slate-200 dark:border-slate-200 shadow-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages, tools, telemetry..."
                autoFocus
                className="bg-transparent text-xs text-slate-900 dark:text-slate-900 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none w-full font-mono"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 dark:text-slate-400 text-xs p-0.5">✕</button>
              )}
            </div>

            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 dark:border-white/5 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                {searchQuery.trim() ? `Search Results (${filteredSearchItems.length})` : 'Quick Navigation & Modules'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500 flex items-center gap-1">
                <span>↑↓ Navigate</span>
                <span>↵ Open</span>
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto scrollbar-thin space-y-1">
              {filteredSearchItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 dark:text-gray-500 font-mono">
                  No matching pages or modules found for "{searchQuery}".
                </div>
              ) : (
                filteredSearchItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedSearchIdx;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSearchItem(item)}
                      onMouseEnter={() => setSelectedSearchIdx(idx)}
                      className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'bg-sky-50 dark:bg-purple-500/15 border border-sky-200 dark:border-purple-500/35 shadow-sm'
                          : 'border border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-600 dark:text-purple-300' : 'text-slate-500 dark:text-gray-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold font-mono ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-gray-200'}`}>
                            {item.title}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${item.badgeColor}`}>
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate mt-0.5 leading-snug">
                          {item.description}
                        </p>
                      </div>
                      {isSelected && (
                        <ArrowRight className="w-3.5 h-3.5 text-sky-500 dark:text-purple-400 shrink-0 self-center" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3 shrink-0">
        {/* Alerts ticker — analyst only */}
        {isAnalyst && currentAlert && (
          <div
            onClick={() => onNavigate('alerts')}
            className="hidden sm:flex items-center cursor-pointer transition-all duration-300 hover:scale-[1.03]"
            title="Click to view Security Alerts"
          >
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-all duration-350 ease-out ${
                slideState === 'in'
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 -translate-y-2 scale-95'
              }`}
              style={{
                background: sevStyle.bg,
                borderColor: sevStyle.border,
                boxShadow: `0 0 16px ${sevStyle.glow}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                style={{ background: sevStyle.dot, boxShadow: `0 0 6px ${sevStyle.dot}` }}
              />
              <span
                className="text-[11px] font-bold font-mono tracking-wide"
                style={{ color: sevStyle.text, letterSpacing: '0.04em' }}
              >
                {currentAlert.relatedCase || currentAlert.id}
              </span>
              <span className="text-slate-400 dark:text-gray-600 text-[11px]">·</span>
              <span className="text-[11px] text-slate-700 dark:text-gray-300 font-mono font-medium truncate max-w-[190px]">
                {currentAlert.type || currentAlert.summary}
              </span>
            </div>
          </div>
        )}

        {/* Settings Gear Icon */}
        <button
          onClick={() => onNavigate('settings')}
          title="Settings"
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 group text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 touch-auto cursor-pointer"
        >
          <Settings className="w-4 h-4 text-slate-500 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
        </button>

        {/* Bell */}
        <div className="relative">
          <button
            id="topbar-notif-btn"
            onClick={() => {
              if (!notifOpen) {
                markAllRead();
              }
              setNotifOpen(!notifOpen);
            }}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 group text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 touch-auto cursor-pointer"
            style={{ background: notifOpen ? 'rgba(147,51,234,0.1)' : undefined }}
          >
            <Bell className="w-4 h-4 text-slate-500 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
                style={{ boxShadow: '0 0 6px rgba(239,68,68,0.9)' }}
              />
            )}
          </button>

          {/* Notif dropdown — exact Attendify notification specs */}
          {notifOpen && (
            <div
              ref={notifDropdownRef}
              className="fixed top-14 sm:top-[4.25rem] left-3 sm:left-auto right-3 sm:right-4 lg:right-6 w-auto sm:w-96 max-w-none sm:max-w-sm rounded-2xl z-50 overflow-hidden animate-fade-in bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 shadow-[0_20px_50px_rgba(0,0,0,0.18)] touch-auto"
            >
              {/* Notification Header */}
              <div className="px-4 py-3 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-sky-500 dark:text-purple-400 shrink-0" />
                  <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Notifications</p>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30 shrink-0">
                      {unreadCount} NEW
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] font-mono font-semibold text-sky-600 hover:text-sky-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors shrink-0"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification subheader / tab bar */}
              {isAnalyst ? (
                <div className="relative isolate px-3 py-1.5 bg-slate-50 dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-scroll text-slate-600 dark:text-zinc-400">
                  {/* Smooth sliding indicator pill */}
                  <div
                    className="absolute z-0 pointer-events-none rounded-lg bg-sky-500/15 border border-sky-400/50 dark:bg-purple-500/25 dark:border-purple-500/40 shadow-sm"
                    style={{
                      transform: `translate3d(${notifIndicatorStyle.left}px, ${notifIndicatorStyle.top}px, 0)`,
                      width: notifIndicatorStyle.width,
                      height: notifIndicatorStyle.height,
                      opacity: notifIndicatorStyle.opacity,
                      transition: 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1), width 300ms cubic-bezier(0.25, 1, 0.5, 1), height 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease',
                      left: 0,
                      top: 0,
                      zIndex: 0,
                    }}
                  />
                  {(['all', 'requests', 'alerts', 'intel', 'system'] as const).map((cat) => (
                    <button
                      key={cat}
                      ref={(el) => { notifTabRefs.current[cat] = el; }}
                      onClick={() => setNotifCategory(cat as any)}
                      style={{ zIndex: 10 }}
                      className={`relative z-10 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase whitespace-nowrap shrink-0 transition-colors duration-200 ${
                        notifCategory === cat
                          ? 'text-sky-950 dark:text-purple-200'
                          : 'text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      {cat === 'requests' ? 'USER REQUESTS' : cat}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-1.5 bg-slate-50 dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between text-slate-600 dark:text-zinc-400">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-600 dark:text-gray-400">
                    Activity &amp; Updates ({filteredNotifs.length})
                  </span>
                  <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400/90 font-semibold">
                    Security &amp; Account
                  </span>
                </div>
              )}

              {/* Notification items list */}
              <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-slate-100 dark:divide-zinc-800/60">
                {filteredNotifs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 dark:text-gray-500 font-mono">
                    {isAnalyst
                      ? 'No notifications in this category.'
                      : 'No notifications yet. Account activity and report reviews will appear here.'}
                  </div>
                ) : (
                  filteredNotifs.map((n) => {
                    const ns = ALERT_SEVERITY_STYLES[n.sev] || ALERT_SEVERITY_STYLES.medium;
                    return (
                      <div
                        key={n.id}
                        className={`px-3.5 sm:px-4 py-3 flex items-start gap-2.5 sm:gap-3 transition-all duration-150 ${
                          !n.read
                            ? 'bg-emerald-50/70 border-b border-emerald-200/60 dark:bg-zinc-900 dark:border-zinc-800'
                            : 'hover:bg-slate-50 dark:hover:bg-zinc-900/60'
                        }`}
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                          style={{
                            background: ns.dot,
                            boxShadow: !n.read ? `0 0 6px ${ns.dot}` : undefined,
                          }}
                        />
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => handleNotificationClick(n)}
                        >
                          <div className="flex items-center gap-2">
                            <p className={`text-xs font-mono truncate text-black dark:text-zinc-100 font-bold`}>
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-purple-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-snug mt-0.5 line-clamp-2 pr-1">
                            {n.msg}
                          </p>
                          <div className="flex items-center gap-1 text-[9px] text-sky-600 dark:text-purple-400/80 font-mono font-medium mt-1">
                            <span>Open module</span>
                            <ArrowRight className="w-2.5 h-2.5 shrink-0" />
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                          <span className="text-[9px] text-slate-400 dark:text-gray-500 font-mono">{n.time}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(n.id);
                            }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400/60 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-all duration-200 group mt-0.5 cursor-pointer"
                            title="Delete notification"
                          >
                            <Trash2 className="w-3 h-3 group-hover:drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider (desktop/tablet only, hidden on mobile) */}
        <div className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-white/[0.08]" />

        {/* User profile for Mobile (compact avatar only, tap to open profile in settings) */}
        <button
          onClick={() => {
            try {
              sessionStorage.setItem('settings_active_tab', 'profile');
            } catch { /* ignore */ }
            try {
              let evt: any;
              try {
                evt = new CustomEvent('sentinel_open_settings_tab', { detail: 'profile' });
              } catch {
                evt = document.createEvent('CustomEvent');
                evt.initCustomEvent('sentinel_open_settings_tab', false, false, 'profile');
              }
              window.dispatchEvent(evt);
            } catch { /* ignore */ }
            onNavigate('settings');
          }}
          title="Update Profile"
          className="sm:hidden w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 cursor-pointer hover:opacity-85 focus:outline-none touch-auto"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 overflow-hidden"
            style={{
              background: isAnalyst
                ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                : 'linear-gradient(135deg, #0f2318 0%, #071a0f 100%)',
              border: isAnalyst
                ? '1px solid rgba(255,255,255,0.12)'
                : '1px solid rgba(34,197,94,0.25)',
            }}
          >
            {isAnalyst ? (
              <img
                src={analystAvatar}
                alt="Analyst"
                className="w-full h-full object-cover rounded-full"
              />
            ) : currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              currentUser?.initials ?? 'U'
            )}
          </div>
        </button>

        {/* User chip for Laptop / PC view (avatar on left, name & role on right like old) */}
        <div
          onClick={() => {
            try {
              sessionStorage.setItem('settings_active_tab', 'profile');
            } catch { /* ignore */ }
            try {
              let evt: any;
              try {
                evt = new CustomEvent('sentinel_open_settings_tab', { detail: 'profile' });
              } catch {
                evt = document.createEvent('CustomEvent');
                evt.initCustomEvent('sentinel_open_settings_tab', false, false, 'profile');
              }
              window.dispatchEvent(evt);
            } catch { /* ignore */ }
            onNavigate('settings');
          }}
          title={`${currentUser?.displayName ?? 'User'} (${isAnalyst ? 'Cybersecurity Analyst' : 'Standard User'}) — Click to edit profile`}
          className="hidden sm:flex items-center gap-2.5 cursor-pointer px-2 py-1 rounded-lg transition-all duration-150 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 overflow-hidden"
            style={{
              background: isAnalyst
                ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                : 'linear-gradient(135deg, #0f2318 0%, #071a0f 100%)',
              border: isAnalyst
                ? '1px solid rgba(255,255,255,0.12)'
                : '1px solid rgba(34,197,94,0.25)',
            }}
          >
            {isAnalyst ? (
              <img
                src={analystAvatar}
                alt="Analyst"
                className="w-full h-full object-cover rounded-full"
              />
            ) : currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              currentUser?.initials ?? 'U'
            )}
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[12px] font-semibold text-slate-900 dark:text-white whitespace-nowrap leading-tight">
              {currentUser?.displayName ?? 'User'}
            </p>
            <p
              className="text-[10px] mt-0.5 whitespace-nowrap leading-none font-medium tracking-wide"
              style={{ color: isAnalyst ? '#0284c7' : '#16a34a' }}
            >
              {isAnalyst ? 'Cybersecurity Analyst' : 'Standard User'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Slide Down / Slide Out Toast Banner ── */}
      {activeToast && (
        <div
          onClick={() => {
            handleNotificationClick(activeToast);
            setToastVisible(false);
            setTimeout(() => setActiveToast(null), 350);
          }}
          className={`fixed top-3 left-3 right-3 sm:left-auto sm:right-6 z-50 max-w-sm w-auto sm:w-96 p-3.5 rounded-2xl cursor-pointer shadow-2xl transition-all duration-500 ease-out flex items-start gap-3 border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 ${
            toastVisible
              ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto'
              : '-translate-y-8 opacity-0 scale-95 pointer-events-none'
          }`}
          style={{
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{
              background:
                activeToast.title.includes('Investigation')
                  ? 'rgba(6,182,212,0.18)'
                  : activeToast.sev === 'critical'
                  ? 'rgba(239,68,68,0.18)'
                  : activeToast.sev === 'high'
                  ? 'rgba(249,115,22,0.18)'
                  : 'rgba(139,92,246,0.18)',
              border: `1px solid ${
                activeToast.title.includes('Investigation')
                  ? 'rgba(6,182,212,0.4)'
                  : activeToast.sev === 'critical'
                  ? 'rgba(239,68,68,0.35)'
                  : activeToast.sev === 'high'
                  ? 'rgba(249,115,22,0.35)'
                  : 'rgba(139,92,246,0.35)'
              }`,
            }}
          >
            {activeToast.title.includes('Investigation') ? (
              <Clock className="w-4 h-4 text-cyan-500 animate-spin" />
            ) : activeToast.title.includes('Gmail') ? (
              <Mail className="w-4 h-4 text-emerald-500" />
            ) : activeToast.title.includes('Password') ? (
              <Lock className="w-4 h-4 text-cyan-500" />
            ) : activeToast.title.includes('Profile') || activeToast.title.includes('Name') ? (
              <CheckCircle2 className="w-4 h-4 text-purple-500" />
            ) : activeToast.title.includes('Message') ? (
              <MessageSquare className="w-4 h-4 text-purple-500" />
            ) : activeToast.sev === 'critical' ? (
              <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
            ) : activeToast.sev === 'high' ? (
              <Bell className="w-4 h-4 text-orange-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeToast.title.includes('Investigation')
                      ? 'bg-cyan-500 animate-pulse'
                      : activeToast.title.includes('Message')
                      ? 'bg-purple-500 animate-ping'
                      : activeToast.sev === 'critical'
                      ? 'bg-red-500 animate-ping'
                      : activeToast.sev === 'high'
                      ? 'bg-orange-500 animate-ping'
                      : 'bg-emerald-500 animate-pulse'
                  }`}
                />
                {activeToast.title}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-gray-500 font-mono">Just now</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-gray-300 mt-0.5 leading-snug font-mono line-clamp-2">
              {activeToast.msg}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-sky-600 dark:text-purple-400 font-mono font-semibold mt-1">
              <span>
                {activeToast.title.includes('Message') && activeToast.route === 'user-requests'
                  ? 'Reply to User'
                  : activeToast.title.includes('Message') && activeToast.route === 'check-status'
                  ? 'Reply to Analyst'
                  : activeToast.route === 'emails'
                  ? 'View in Emails'
                  : activeToast.route === 'settings'
                  ? 'View in Settings'
                  : activeToast.route === 'check-status'
                  ? 'View in Check Status'
                  : activeToast.route === 'user-requests'
                  ? 'View User Requests'
                  : 'Open module'}
              </span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

interface PlaceholderPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function PlaceholderPage({ icon: Icon, title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">{description}</p>
      <div className="badge-info">
        <span className="w-1.5 h-1.5 bg-severity-medium rounded-full" />
        Module pending — Phase 2
      </div>
    </div>
  );
}
