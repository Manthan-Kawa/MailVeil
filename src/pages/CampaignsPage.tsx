import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Network,
  Mail,
  Globe,
  Server,
  Link2,
  FolderSearch,
  ArrowDown,
  ArrowLeft,
  Activity,
  ChevronRight,
  Crosshair,
  Sparkles,
  Zap,
  ShieldAlert,
  Clock,
  User,
  FileText,
  Lock,
  Plus,
  StickyNote,
  Pencil,
  RefreshCw,
  ChevronDown,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  INVESTIGATION_CASES,
  type Campaign,
  type CampaignStatus,
  type Severity,
  type ThreatType,
  type CaseStatus,
  type InvestigationCase,
} from '@/data/mockData';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { useCampaigns } from '@/contexts/CampaignContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { EmailAnalysisResult } from '@/services/claudeService';
import { CopyButton } from '@/components/CopyButton';

/* ─── Slide-in entrance wrapper ─── */
function SlideIn({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'down';
  className?: string;
}) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVis(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  const from =
    direction === 'left'
      ? 'translateX(-36px)'
      : direction === 'right'
        ? 'translateX(36px)'
        : direction === 'down'
          ? 'translateY(-20px)'
          : 'translateY(24px)';
  return (
    <div
      className={className}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? 'none' : from,
        transition: 'opacity .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1)' }}
    >
      {children}
    </div>
  );
}

/* ─── Severity config ─── */
const SEVERITY_STYLES: Record<Severity, { border: string; bg: string; text: string; dot: string }> = {
  critical: { border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.1)', text: '#f87171', dot: '#ef4444' },
  high: { border: 'rgba(249,115,22,0.4)', bg: 'rgba(249,115,22,0.1)', text: '#fb923c', dot: '#f97316' },
  medium: { border: 'rgba(245,158,11,0.35)', bg: 'rgba(245,158,11,0.08)', text: '#fbbf24', dot: '#f59e0b' },
  low: { border: 'rgba(59,130,246,0.35)', bg: 'rgba(59,130,246,0.08)', text: '#60a5fa', dot: '#3b82f6' },
  info: { border: 'rgba(156,163,175,0.25)', bg: 'rgba(156,163,175,0.06)', text: '#9ca3af', dot: '#6b7280' },
};

const STATUS_CONFIG: Record<CampaignStatus, { color: string; bg: string; border: string; label: string; pulse?: string }> = {
  active: { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', label: 'Active', pulse: '#ef4444' },
  dormant: { color: '#9ca3af', bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.2)', label: 'Dormant' },
  disrupted: { color: '#4ade80', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', label: 'Disrupted', pulse: '#22c55e' },
  monitoring: { color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', label: 'Monitoring', pulse: '#3b82f6' },
};

const CASE_STATUS_CONFIG: Record<CaseStatus, { color: string; bg: string; border: string; label: string; pulse?: string }> = {
  open: { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', label: 'Open', pulse: '#ef4444' },
  investigating: { color: '#fb923c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', label: 'Investigating', pulse: '#f97316' },
  contained: { color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', label: 'Contained' },
  resolved: { color: '#4ade80', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', label: 'Resolved' },
};

/* ─── Map alert level to severity ─── */
function alertToSeverity(level: string): Severity {
  if (level === 'critical' || level === 'high' || level === 'medium' || level === 'low' || level === 'info') {
    return level as Severity;
  }
  return 'info';
}

/* ─── Build dynamic InvestigationCase from analyzed email ─── */
function buildCaseFromAnalysis(r: EmailAnalysisResult): InvestigationCase {
  const subjectHdr = r.headers.find((h) => h.key.toLowerCase() === 'subject')?.value ?? r.case_id;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const status: CaseStatus =
    r.alert_level === 'critical'
      ? 'investigating'
      : r.alert_level === 'high' || r.alert_level === 'medium'
        ? 'open'
        : 'resolved';

  return {
    id: r.case_id,
    title: subjectHdr,
    severity: alertToSeverity(r.alert_level),
    status,
    created: now,
    assignedAnalyst: 'SENTINEL-X Engine',
    threatType: (r.verdict?.split(' ')[0] ?? 'BEC') as any,
    relatedCampaign: r.campaign_id ?? 'UNKNOWN',
    lastUpdated: now,
    summary: r.summary ?? `Forensic analysis concluded for ${r.case_id}.`,
    timeline:
      r.recommended_actions?.length > 0
        ? r.recommended_actions.map((a) => ({
          time: now,
          event: `[${a.priority.toUpperCase()}] ${a.action}: ${a.detail}`,
          actor: 'SENTINEL-X Engine',
        }))
        : [{ time: now, event: `Analysis completed — threat score ${r.threat_score}/100`, actor: 'SENTINEL-X Engine' }],
    analystNotes: r.ai_inferences.slice(0, 3).map((inf) => ({
      author: 'AI Engine',
      timestamp: now,
      note: `${inf.inference} — ${inf.confidence}% confidence. Basis: ${inf.basis}`,
    })),
    activityHistory: [
      { time: now, action: 'Case generated via live email analysis', actor: 'SENTINEL-X Engine' },
    ],
    relatedEvidence: r.evidence?.map((e) => e.id) ?? [],
  };
}

/* ─── Severity Pill ─── */
function SeverityPill({ severity, className = '' }: { severity: Severity; className?: string }) {
  const s = SEVERITY_STYLES[severity];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider font-mono ${className}`}
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      <span>{severity}</span>
    </span>
  );
}

/* ─── Campaign Status Pill ─── */
function StatusPill({ status, className = '' }: { status: CampaignStatus; className?: string }) {
  const s = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${className}`}
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {s.pulse && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: s.pulse }}
          />
        )}
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: s.pulse ?? '#6b7280' }} />
      </span>
      <span>{s.label}</span>
    </span>
  );
}

/* ─── Case Status Pill ─── */
function CaseStatusPill({ status, animate = false }: { status: CaseStatus; animate?: boolean }) {
  const s = CASE_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      <span className="relative flex h-2 w-2">
        {animate && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: s.pulse }}
          />
        )}
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: s.pulse ?? '#6b7280' }} />
      </span>
      {s.label}
    </span>
  );
}

/* ─── Real-time "Last Refreshed" badge ─── */
function LiveRefreshBadge({ lastRefreshed }: { lastRefreshed: Date }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  const secs = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000);
  const label = secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`;

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold whitespace-nowrap shrink-0 text-emerald-600 dark:text-[#86efac] bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/25 dark:border-emerald-500/20"
    >
      <RefreshCw className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '3s' }} />
      <span>Live · {label}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════ */
export function CampaignsPage({ onNavigate }: { onNavigate?: (id: string) => void } = {}) {
  const { analyzedReports } = useAnalysis();
  const { campaigns, stats, addCampaign, updateCampaign, deleteCampaign, activeCampaignsCount, lastRefreshed } = useCampaigns();

  const allCampaigns = campaigns;

  // Merge static investigation cases with dynamic ones from analyzed reports
  const allCases = useMemo((): InvestigationCase[] => {
    const staticIds = new Set(INVESTIGATION_CASES.map((c) => c.id));
    const dynamicCases = analyzedReports
      .filter((r) => !staticIds.has(r.case_id))
      .map(buildCaseFromAnalysis);
    return [...INVESTIGATION_CASES, ...dynamicCases];
  }, [analyzedReports]);

  const [selected, setSelected] = useState<Campaign | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Keep selected campaign in sync with context updates (e.g. real-time tick)
  useEffect(() => {
    if (selected) {
      const updated = campaigns.find((c) => c.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [campaigns, selected]);

  const targetClusters = useMemo(() => {
    const actives = allCampaigns.filter((c) => c.status === 'active');
    return actives.length > 0 ? actives : allCampaigns;
  }, [allCampaigns]);

  // Rotate through target clusters if more than 1
  const [clusterIdx, setClusterIdx] = useState(0);
  const [clusterFade, setClusterFade] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (targetClusters.length <= 1) return;
    const interval = setInterval(() => {
      setClusterFade('out');
      setTimeout(() => {
        setClusterIdx((prev) => (prev + 1) % targetClusters.length);
        setClusterFade('in');
      }, 250);
    }, 4500);

    return () => clearInterval(interval);
  }, [targetClusters.length]);

  if (selected) {
    return (
      <CampaignDetail
        campaign={selected}
        allCases={allCases}
        onBack={() => setSelected(null)}
        onEdit={() => setEditingCampaign(selected)}
      />
    );
  }

  const filtered = allCampaigns.filter((c) => {
    const caseId = c.relatedCases?.[0] ?? '';
    const matchesSearch =
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      caseId.toLowerCase().includes(search.toLowerCase()) ||
      c.threatType.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || c.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const activeCount = activeCampaignsCount;

  const currentCluster = targetClusters[clusterIdx % (targetClusters.length || 1)] || targetClusters[0];

  const STAT_CARDS = [
    {
      label: 'Emails Observed',
      value: stats.emailsObserved,
      dotColor: 'bg-[#f43f5e] dark:bg-zinc-800 shadow-sm ',
      numColor: 'text-[#e11d48] dark:text-[#f87171]',
    },
    {
      label: 'Unique Domains',
      value: stats.uniqueDomains,
      dotColor: 'bg-white dark:bg-zinc-800 dark:bg-zinc-800 shadow-sm ',
      numColor: 'text-[#0d9488] dark:text-[#2dd4bf]',
    },
    {
      label: 'Unique IPs',
      value: stats.uniqueIPs,
      dotColor: 'bg-[#ea580c] dark:bg-zinc-800 shadow-sm ',
      numColor: 'text-[#ea580c] dark:text-[#fb923c]',
    },
    {
      label: 'Suspicious URLs',
      value: stats.suspiciousURLs,
      dotColor: 'bg-[#f59e0b] dark:bg-zinc-800 shadow-sm ',
      numColor: 'text-[#d97706] dark:text-[#fbbf24]',
    },
    {
      label: 'Active Cases',
      value: stats.activeCases,
      dotColor: 'bg-[#9333ea] dark:bg-zinc-800 shadow-sm ',
      numColor: 'text-[#9333ea] dark:text-[#c084fc]',
    },
  ];

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ── Page Header (Single top-level SlideIn eliminates extra top margin on PC) ── */}
      <SlideIn delay={0} direction="down">
        {/* Mobile Card Header (Phone only: block md:hidden) Matching User Screenshot */}
        <div className="block md:hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm dark:shadow-2xl space-y-4">
          {/* Row 1: Icon + Eyebrow + Title + Active Count Pill */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-lg ">
                <Crosshair className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-100 leading-tight">
                  Campaign Intelligence
                </h1>
              </div>
            </div>

            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full shrink-0"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)' }}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold text-amber-600 dark:text-amber-300 font-mono">{activeCount}</span>
            </div>
          </div>

          {/* Row 2: Subtitle Description */}
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Correlated threat clusters — multi-vector attack tracking, case intelligence &amp; real-time indicator grouping.
          </p>

          {/* Row 3: Live refresh + Active Clusters pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <LiveRefreshBadge lastRefreshed={lastRefreshed} />
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0 whitespace-nowrap"
              style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}
            >
              <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 font-mono">
                {activeCount} ACTIVE CLUSTERS
              </span>
            </div>
          </div>

          {/* Row 4: Subheader (TARGET CLUSTERS | HIGH PRIORITY) */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] font-mono tracking-wider text-gray-500 dark:text-gray-400 uppercase font-semibold">
              TARGET CLUSTERS
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/25 text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 tracking-wider uppercase">
              HIGH PRIORITY
            </span>
          </div>

          {/* Row 5: Single Target Cluster Card with Live Loop Switcher */}
          {currentCluster && (
            <div
              onClick={() => setSelected(currentCluster)}
              className="rounded-xl p-3 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-gray-50 dark:bg-zinc-800 border-none border border-gray-200 dark:border-zinc-800/50 hover:border-purple-400 dark:hover:border-purple-500/40 flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.99] group shadow-sm"
            >
              <div className={`min-w-0 flex-1 space-y-1 transition-opacity duration-200 ${clusterFade === 'in' ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                  <span className={clusterIdx % 2 === 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-purple-600 dark:text-purple-400 font-bold'}>
                    #{currentCluster.id.replace(/^#/, '')}
                  </span>
                  <span className="text-gray-500 dark:text-gray-500">•</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {clusterIdx % 2 === 0 ? '3m ago' : '11m ago'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">
                  {currentCluster.name}
                </p>
                <div className="flex items-center gap-2 text-[11px] flex-wrap">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {currentCluster.indicators || 14} IOCs detected
                  </span>
                  <span className="text-gray-500 dark:text-gray-500">·</span>
                  <span className="text-gray-500 dark:text-gray-400 truncate">
                    {currentCluster.threatType || 'Tor Exit Node'}
                  </span>
                </div>
              </div>

              <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-white/5 border border-gray-200 dark:border-zinc-800/50 text-gray-900 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white flex items-center justify-center shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Row 6: Divider */}
          <div className="border-t border-gray-200 dark:border-zinc-800/50 pt-1" />

          {/* Row 7: Create Campaign button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-lg  transition-transform duration-150 ease-out active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Campaign</span>
          </button>
        </div>

        {/* Desktop Header (PC only: hidden md:flex) */}
        <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">Campaign Intelligence</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Correlated threat clusters — multi-vector attack tracking, case intelligence &amp; real-time indicator grouping
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Real-time refresh badge */}
              <LiveRefreshBadge lastRefreshed={lastRefreshed} />

              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0 whitespace-nowrap"
                style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}
              >
                <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 font-mono">
                  {activeCount} ACTIVE CLUSTER{activeCount !== 1 ? 'S' : ''}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1 rounded-lg text-xs font-bold text-white transition-transform duration-150 ease-out active:scale-95 font-mono shadow-md shrink-0 whitespace-nowrap cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                 }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Campaign</span>
            </button>
          </div>
        </div>
      </SlideIn>

      {/* ── Stat Cards ── */}
      <SlideIn delay={60} direction="up" className="w-full">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 w-full">
          {STAT_CARDS.map((stat) => {
            const isFullWidthMobile = stat.label === 'Emails Observed';
            return (
              <div
                key={stat.label}
                className={`p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 transition-all flex flex-col justify-between min-h-[82px] sm:min-h-[92px] ${
                  isFullWidthMobile ? 'col-span-2 lg:col-span-1' : 'col-span-1'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {stat.label}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${stat.dotColor}`} />
                </div>
                <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${stat.numColor}`}>
                  {stat.value.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </SlideIn>

      {/* ── Filters ── */}
      <SlideIn delay={120} direction="up">
        <div
          className="rounded-2xl p-4 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm "
        >
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <div
              className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2.5 min-w-0 bg-gray-50 dark:bg-white border border-gray-200 dark:border-gray-200 shadow-sm"
            >
              <Search className="w-4 h-4 text-gray-500 dark:text-gray-500 shrink-0" />
              <input
                type="text"
                placeholder="Search by campaign ID, cluster name, case ID, or threat type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-xs sm:text-sm text-gray-900 dark:text-gray-900 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none w-full font-mono"
              />
            </div>

            {/* Mobile: Severity and Status on same line | Desktop: inline */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Severity Dropdown */}
              <div className="relative flex-1 sm:flex-none sm:shrink-0">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as any)}
                  className="w-full sm:w-auto appearance-none px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 pr-6 sm:pr-8 rounded-xl text-[11px] sm:text-xs font-mono font-medium sm:font-semibold text-gray-900 dark:text-gray-200 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-zinc-800/50 hover:border-gray-200 dark:hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer transition-all"
                >
                  <option value="all" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">All Severity</option>
                  <option value="critical" className="bg-white dark:bg-zinc-800 text-red-500 dark:text-red-400">Critical</option>
                  <option value="high" className="bg-white dark:bg-zinc-800 text-orange-500 dark:text-orange-400">High</option>
                  <option value="medium" className="bg-white dark:bg-zinc-800 text-amber-500 dark:text-amber-400">Medium</option>
                  <option value="low" className="bg-white dark:bg-zinc-800 text-green-500 dark:text-green-400">Low</option>
                </select>
                <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 dark:text-gray-400 absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Status Dropdown */}
              <div className="relative flex-1 sm:flex-none sm:shrink-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full sm:w-auto appearance-none px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 pr-6 sm:pr-8 rounded-xl text-[11px] sm:text-xs font-mono font-medium sm:font-semibold text-gray-900 dark:text-gray-200 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-zinc-800/50 hover:border-gray-200 dark:hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer transition-all"
                >
                  <option value="all" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">All Status</option>
                  <option value="active" className="bg-white dark:bg-zinc-800 text-red-500 dark:text-red-400">Active</option>
                  <option value="dormant" className="bg-white dark:bg-zinc-800 text-gray-500 dark:text-gray-400">Dormant</option>
                  <option value="disrupted" className="bg-white dark:bg-zinc-800 text-green-600 dark:text-green-400">Disrupted</option>
                  <option value="monitoring" className="bg-white dark:bg-zinc-800 text-blue-600 dark:text-cyan-400">Monitoring</option>
                </select>
                <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 dark:text-gray-400 absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </SlideIn>

      {/* ── Campaigns Table ── */}
      <SlideIn delay={180} direction="up">
        <div
          className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm "
        >
          {/* ── Mobile Campaign Cards View (< md) ── */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
            {filtered.map((c) => {
              const primaryCaseId = c.relatedCases[0] ?? null;
              const casesForCampaign = allCases.filter((cs) => c.relatedCases.includes(cs.id));
              const hasLiveCase = casesForCampaign.some(
                (cs) => !INVESTIGATION_CASES.find((ic) => ic.id === cs.id)
              );

              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="p-3.5 space-y-2 cursor-pointer transition-all duration-150 hover:bg-white dark:hover:bg-zinc-700/50 active:bg-gray-50 dark:active:bg-white/[0.05]"
                >
                  {/* Row 1: Campaign ID + Live dot + Status pill */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">{c.id}</span>
                      {c.status === 'active' && (
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      )}
                      {hasLiveCase && (
                        <span
                          className="shrink-0 w-2 h-2 rounded-full bg-green-400 animate-pulse"
                          title="Live email analysis linked"
                        />
                      )}
                    </div>
                    <div className="shrink-0">
                      <StatusPill status={c.status} />
                    </div>
                  </div>

                  {/* Row 2: Full Cluster Name */}
                  <div className="text-xs text-gray-900 dark:text-zinc-100 font-semibold leading-snug break-words">
                    {c.name}
                  </div>

                  {/* Row 3: Linked Case ID badge, Threat Type, Severity, Confidence, & Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-zinc-800/50 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {primaryCaseId ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 bg-cyan-500/10 border border-cyan-500/25 text-cyan-700 dark:text-cyan-400"
                        >
                          <Lock className="w-2.5 h-2.5 opacity-75 shrink-0" />
                          <span className="whitespace-nowrap">{primaryCaseId}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500 dark:text-gray-600 font-mono italic shrink-0">No Case</span>
                      )}
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono px-2 py-0.5 rounded bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 shrink-0 whitespace-nowrap">
                        {c.threatType}
                      </span>
                      <div className="shrink-0">
                        <SeverityPill severity={c.severity} />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 font-bold">{c.confidence}%</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCampaign(c);
                        }}
                        className="p-1 rounded text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
                        title="Edit Campaign"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete campaign ${c.id}?`)) {
                            deleteCampaign(c.id);
                          }
                        }}
                        className="p-1 rounded text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-500 dark:text-gray-600" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Desktop & Tablet Campaigns Table (md+) ── */}
          <div className="hidden md:block overflow-x-auto scrollbar-thin">
            <div className="min-w-[700px] md:min-w-0">
              {/* Table Header */}
              <div
                className="grid grid-cols-12 gap-2 px-5 py-3 text-[10px] font-mono font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/50"
              >
                <div className="col-span-2">Campaign ID</div>
                <div className="col-span-2">Case ID</div>
                <div className="col-span-3">Cluster Name</div>
                <div className="col-span-1 hidden md:block">Threat Type</div>
                <div className="col-span-1 hidden md:block">Severity</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1 hidden xl:block text-right">Confidence</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map((c) => {
                  const primaryCaseId = c.relatedCases[0] ?? null;
                  const casesForCampaign = allCases.filter((cs) => c.relatedCases.includes(cs.id));
                  const hasLiveCase = casesForCampaign.some(
                    (cs) => !INVESTIGATION_CASES.find((ic) => ic.id === cs.id)
                  );

                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="grid grid-cols-12 gap-2 px-5 py-3.5 cursor-pointer transition-all duration-150 hover:bg-white dark:hover:bg-zinc-700/50 group items-center"
                    >
                      {/* Campaign ID */}
                      <div className="col-span-2 flex items-center gap-2">
                        <Crosshair className="w-3 h-3 text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">{c.id}</span>
                        {c.status === 'active' && (
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        )}
                      </div>

                      {/* Exactly 1 Single Case ID per Campaign */}
                      <div className="col-span-2 flex items-center">
                        {primaryCaseId ? (
                          <span
                            className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded transition-colors bg-cyan-500/10 border border-cyan-500/25 text-cyan-700 dark:text-cyan-400"
                          >
                            <Lock className="w-3 h-3 opacity-75" />
                            {primaryCaseId}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-500 dark:text-gray-600 font-mono italic">None</span>
                        )}
                      </div>

                      {/* Cluster Name */}
                      <div className="col-span-3 flex items-center gap-1.5">
                        <span className="text-xs text-gray-900 dark:text-zinc-100 font-medium truncate block">{c.name}</span>
                        {hasLiveCase && (
                          <span
                            className="shrink-0 w-2 h-2 rounded-full bg-green-400 animate-pulse"
                            title="Live email analysis linked"
                          />
                        )}
                      </div>

                      {/* Threat Type */}
                      <div className="col-span-1 hidden md:flex items-center">
                        <span className="text-xs text-gray-900 dark:text-zinc-100 font-mono truncate">{c.threatType}</span>
                      </div>

                      {/* Severity */}
                      <div className="col-span-1 hidden md:flex items-center">
                        <SeverityPill severity={c.severity} />
                      </div>

                      {/* Status */}
                      <div className="col-span-2 flex items-center">
                        <StatusPill status={c.status} />
                      </div>

                      {/* Confidence & Actions */}
                      <div className="col-span-1 hidden xl:flex items-center justify-end gap-2">
                        <div className="w-10 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${c.confidence}%`,
                              background: c.confidence > 80 ? '#ef4444' : '#f97316',
                               }}
                          />
                        </div>
                        <span className="text-xs font-mono text-gray-900 dark:text-zinc-100 font-bold">{c.confidence}%</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCampaign(c);
                          }}
                          className="p-1 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-500/10 transition-colors cursor-pointer"
                          title="Edit Campaign"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete campaign ${c.id}?`)) {
                              deleteCampaign(c.id);
                            }
                          }}
                          className="p-1 rounded-lg text-gray-500 hover:text-red-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-500/15 transition-colors cursor-pointer"
                          title="Delete Campaign"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-500 dark:text-gray-600 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 px-4">
              {allCampaigns.length === 0 ? (
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
                    <Network className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 font-mono">No Campaigns Recorded</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      No campaign threat clusters exist yet. Ingest and analyze emails in Email Analyzer or manually create a correlated campaign cluster.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all font-mono flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create Campaign
                    </button>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('email-analyzer')}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-900 hover:text-black dark:text-zinc-100 dark:hover:text-white bg-gray-50 hover:bg-gray-200 dark:bg-white/5 border border-gray-200 dark:border-zinc-800/50 transition-all font-mono flex items-center gap-1.5"
                      >
                        <Network className="w-3.5 h-3.5" />
                        Analyze Email
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <Search className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-mono">No campaign clusters match your filters</p>
                  <button
                    onClick={() => {
                      setSearch('');
                      setSeverityFilter('all');
                      setStatusFilter('all');
                    }}
                    className="mt-2 text-xs text-purple-400 font-mono hover:underline"
                  >
                    Reset filters
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </SlideIn>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CampaignFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSaved={(newCamp) => {
            setShowCreateModal(false);
            setSelected(newCamp);
          }}
        />
      )}

      {/* Edit Campaign Modal */}
      {editingCampaign && (
        <CampaignFormModal
          mode="edit"
          initialData={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onSaved={(updated) => {
            updateCampaign(updated.id, updated);
            setEditingCampaign(null);
            setSelected(updated);
          }}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CAMPAIGN FORM MODAL (Create + Edit)
════════════════════════════════════════════════════════════ */
function CampaignFormModal({
  mode,
  initialData,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  initialData?: Campaign;
  onClose: () => void;
  onSaved: (camp: Campaign) => void;
}) {
  const { isDark } = useTheme();
  const { addCampaign, updateCampaign } = useCampaigns();
  const [name, setName] = useState(initialData?.name ?? '');
  const [threatType, setThreatType] = useState<ThreatType>(initialData?.threatType ?? 'BEC');
  const [severity, setSeverity] = useState<Severity>(initialData?.severity ?? 'high');
  const [status, setStatus] = useState<CampaignStatus>(initialData?.status ?? 'active');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [domains, setDomains] = useState(initialData?.relatedDomains?.join(', ') ?? '');
  const [ips, setIps] = useState(initialData?.relatedIPs?.join(', ') ?? '');
  const [urls, setUrls] = useState(initialData?.relatedURLs?.join(', ') ?? '');
  const [confidence, setConfidence] = useState(initialData?.confidence ?? 85);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const domainList = domains.split(',').map((s) => s.trim()).filter(Boolean);
    const ipList = ips.split(',').map((s) => s.trim()).filter(Boolean);
    const urlList = urls.split(',').map((s) => s.trim()).filter(Boolean);

    if (mode === 'create') {
      const created = addCampaign({
        name: name.trim(),
        threatType,
        severity,
        status,
        confidence,
        description: description.trim() || `User-created threat campaign cluster: ${name}`,
        relatedDomains: domainList,
        relatedIPs: ipList,
        relatedURLs: urlList,
      });
      onSaved(created);
    } else if (initialData) {
      const updated: Campaign = {
        ...initialData,
        name: name.trim(),
        threatType,
        severity,
        status,
        confidence,
        description: description.trim(),
        relatedDomains: domainList,
        relatedIPs: ipList,
        relatedURLs: urlList,
        lastSeen: new Date().toISOString().slice(0, 10),
      };
      updateCampaign(updated.id, updated);
      onSaved(updated);
    }
  };

  useEffect(() => {
    const mainEl = document.querySelector('main');
    const prevMainOverflow = mainEl?.style.overflow || '';
    const prevBodyOverflow = document.body.style.overflow || '';

    if (mainEl) mainEl.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      if (mainEl) mainEl.style.overflow = prevMainOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{
        background: isDark ? 'rgba(0,0,0,0.82)' : 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl overflow-hidden animate-slide-up flex flex-col my-auto max-h-[calc(100vh-3rem)]"
        style={{
          background: isDark ? 'linear-gradient(145deg, #0d1118, #0a0c14)' : '#ffffff',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
          boxShadow: isDark ? '0 32px 80px rgba(0,0,0,0.85)' : '0 25px 60px -15px rgba(0,0,0,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 shrink-0"
          style={{ borderBottom: isDark ? '1px solid rgba(39,39,42,0.5)' : '1px solid #e2e8f0' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(168,85,247,0.15)',
                border: '1px solid rgba(168,85,247,0.3)' }}
            >
              {mode === 'edit' ? <Pencil className="w-5 h-5 text-purple-400" /> : <Plus className="w-5 h-5 text-purple-400" />}
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-zinc-100 font-mono">
                {mode === 'edit' ? 'Edit Campaign Cluster' : 'Create Threat Campaign Cluster'}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5">
                {mode === 'edit' ? 'Update campaign intelligence dossier' : 'Add a correlated campaign intelligence dossier'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-500 transition-transform duration-150 ease-out active:scale-95 shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="overflow-y-auto overflow-x-hidden scrollbar-thin flex-1 px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 touch-scroll">
            <div>
              <label className="text-xs font-mono font-semibold text-gray-900 dark:text-zinc-100 block mb-1">
                Campaign Cluster Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Executive Wire-Transfer Phishing Ring"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-sm text-gray-900 dark:text-zinc-100 bg-white dark:bg-white/5 border border-gray-200 dark:border-zinc-800/50 focus:border-purple-500 focus:outline-none font-mono placeholder:text-gray-500 dark:placeholder:text-gray-600 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-mono font-semibold text-gray-900 dark:text-zinc-100 block mb-1">Threat Type</label>
                <select
                  value={threatType}
                  onChange={(e) => setThreatType(e.target.value as ThreatType)}
                  className="w-full px-3 py-2 rounded-xl text-xs text-gray-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-800 border-none border border-gray-200 dark:border-zinc-800/50 focus:border-purple-500 focus:outline-none font-mono transition-colors"
                >
                  <option value="BEC" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">BEC</option>
                  <option value="Phishing" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">Phishing</option>
                  <option value="Malware" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">Malware</option>
                  <option value="Spoofing" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">Spoofing</option>
                  <option value="Credential Harvesting" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">Credential Harvesting</option>
                  <option value="Ransomware" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">Ransomware</option>
                  <option value="C2" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">C2</option>
                  <option value="Spam" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">Spam</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono font-semibold text-gray-900 dark:text-zinc-100 block mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as Severity)}
                  className="w-full px-3 py-2 rounded-xl text-xs text-gray-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-800 border-none border border-gray-200 dark:border-zinc-800/50 focus:border-purple-500 focus:outline-none font-mono transition-colors"
                >
                  <option value="critical" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">Critical</option>
                  <option value="high" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">High</option>
                  <option value="medium" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">Medium</option>
                  <option value="low" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">Low</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono font-semibold text-gray-900 dark:text-zinc-100 block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CampaignStatus)}
                  className="w-full px-3 py-2 rounded-xl text-xs text-gray-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-800 border-none border border-gray-200 dark:border-zinc-800/50 focus:border-purple-500 focus:outline-none font-mono transition-colors"
                >
                  <option value="active" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">Active</option>
                  <option value="monitoring" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">Monitoring</option>
                  <option value="dormant" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">Dormant</option>
                  <option value="disrupted" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">Disrupted</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono font-semibold text-gray-900 dark:text-zinc-100 block mb-1">
                Confidence Score: <span className="text-purple-600 dark:text-purple-400 font-bold">{confidence}%</span>
              </label>
              <input
                type="range"
                min={10}
                max={100}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full accent-purple-600 dark:accent-purple-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs font-mono font-semibold text-gray-900 dark:text-zinc-100 block mb-1">
                Description &amp; Threat Context
              </label>
              <textarea
                rows={2}
                placeholder="Describe attack methodology, targeted roles, impersonated brands..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs text-gray-900 dark:text-zinc-100 bg-white dark:bg-white/5 border border-gray-200 dark:border-zinc-800/50 focus:border-purple-500 focus:outline-none font-mono placeholder:text-gray-500 dark:placeholder:text-gray-600 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono font-semibold text-gray-900 dark:text-zinc-100 block mb-1">
                  Related Domains <span className="text-gray-500 dark:text-gray-500 font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="malicious-domain.com, spoof-bank.net"
                  value={domains}
                  onChange={(e) => setDomains(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs text-gray-900 dark:text-zinc-100 bg-white dark:bg-white/5 border border-gray-200 dark:border-zinc-800/50 focus:border-purple-500 focus:outline-none font-mono placeholder:text-gray-500 dark:placeholder:text-gray-600 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-mono font-semibold text-gray-900 dark:text-zinc-100 block mb-1">
                  Related IPs <span className="text-gray-500 dark:text-gray-500 font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="185.220.101.47, 91.240.118.52"
                  value={ips}
                  onChange={(e) => setIps(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs text-gray-900 dark:text-zinc-100 bg-white dark:bg-white/5 border border-gray-200 dark:border-zinc-800/50 focus:border-purple-500 focus:outline-none font-mono placeholder:text-gray-500 dark:placeholder:text-gray-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono font-semibold text-gray-900 dark:text-zinc-100 block mb-1">
                Suspicious URLs <span className="text-gray-500 dark:text-gray-500 font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                placeholder="https://phish-site.example/verify, https://cred-capture.example/login"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-gray-900 dark:text-zinc-100 bg-white dark:bg-white/5 border border-gray-200 dark:border-zinc-800/50 focus:border-purple-500 focus:outline-none font-mono placeholder:text-gray-500 dark:placeholder:text-gray-600 transition-colors"
              />
            </div>
          </div>

          <div
            className="px-6 py-4 flex items-center justify-end gap-3 shrink-0"
            style={{ borderTop: isDark ? '1px solid rgba(39,39,42,0.5)' : '1px solid #e2e8f0' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-900 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-50 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 border border-gray-200 dark:border-zinc-800/50 font-mono transition-transform duration-150 ease-out active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-transform duration-150 ease-out active:scale-95 font-mono shadow-md cursor-pointer"
            >
              {mode === 'edit' ? 'Save Changes' : 'Save Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ════════════════════════════════════════════════════════════
   CAMPAIGN DETAIL — Merged with Investigation Cases
════════════════════════════════════════════════════════════ */
function CampaignDetail({
  campaign,
  allCases,
  onBack,
  onEdit,
}: {
  campaign: Campaign;
  allCases: InvestigationCase[];
  onBack: () => void;
  onEdit: () => void;
}) {
  const { getCaseStatus, deleteCampaign } = useCampaigns();
  const sev = SEVERITY_STYLES[campaign.severity];
  const [selectedCase, setSelectedCase] = useState<InvestigationCase | null>(null);

  const casesForCampaign = allCases
    .filter((c) => campaign.relatedCases.includes(c.id))
    .map((c) => ({ ...c, status: getCaseStatus(c.id, c.status) }));

  if (selectedCase) {
    return (
      <CaseDetail
        caseData={{ ...selectedCase, status: getCaseStatus(selectedCase.id, selectedCase.status) }}
        onBack={() => setSelectedCase(null)}
        onBackLabel={`Back to ${campaign.id}`}
      />
    );
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Back button + Meta */}
      <SlideIn delay={0} direction="down">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-0 rounded-2xl bg-white sm:bg-transparent dark:bg-zinc-800 sm:dark:bg-transparent border border-gray-200 sm:border-none dark:border-zinc-800/50 sm:dark:border-none shadow-sm sm:shadow-none backdrop-blur-sm">
          <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-900 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white transition-all cursor-pointer shrink-0 bg-gray-50 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 active:scale-[0.98] border border-gray-200 dark:border-zinc-800/50 shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              <span className="hidden min-[380px]:inline">Back to Campaigns</span>
              <span className="min-[380px]:hidden">Back</span>
            </button>
            <div className="flex items-center gap-2 sm:hidden shrink-0">
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-200 transition-all cursor-pointer bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/15 dark:hover:bg-purple-500/25 active:scale-[0.98] border border-purple-200 dark:border-purple-500/30 shadow-sm"
              >
                <Pencil className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete campaign cluster ${campaign.id}?`)) {
                    deleteCampaign(campaign.id);
                    onBack();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 hover:text-rose-900 dark:text-red-400 dark:hover:text-red-300 transition-all bg-rose-50 hover:bg-rose-100 dark:bg-red-500/15 dark:hover:bg-red-500/25 active:scale-[0.98] border border-rose-200 dark:border-red-500/30 shadow-sm cursor-pointer"
                title="Delete Campaign"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-red-400" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 w-full sm:w-auto pt-2.5 sm:pt-0 border-t border-gray-200 dark:border-zinc-800/50 sm:border-t-0">
            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <span
                className="flex-1 sm:flex-none inline-flex items-center justify-center sm:justify-start gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/15 dark:border-purple-500/30 dark:text-purple-300 whitespace-nowrap min-w-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 shrink-0" />
                {campaign.id}
              </span>
              <SeverityPill severity={campaign.severity} className="flex-1 sm:flex-none justify-center sm:justify-start min-w-0" />
              <StatusPill status={campaign.status} className="flex-1 sm:flex-none justify-center sm:justify-start min-w-0" />
            </div>

            {/* Desktop Action buttons: Edit Campaign & Delete Campaign (Red) */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 dark:text-zinc-100 hover:text-purple-900 dark:hover:text-white transition-all cursor-pointer bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 border border-purple-200 dark:border-purple-500/25"
              >
                <Pencil className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Edit Campaign
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete campaign cluster ${campaign.id}?`)) {
                    deleteCampaign(campaign.id);
                    onBack();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 dark:text-red-400 hover:text-rose-900 dark:hover:text-white transition-all bg-rose-50 dark:bg-red-500/10 hover:bg-rose-100 dark:hover:bg-red-500/25 border border-rose-200 dark:border-red-500/30 cursor-pointer"
                title="Delete Campaign"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-red-400" />
                Delete Campaign
              </button>
            </div>
          </div>
        </div>
      </SlideIn>

      {/* Cluster summary card */}
      <SlideIn delay={60} direction="up">
        <div
          className="rounded-2xl p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-purple-500/30 shadow-sm dark:shadow-none"
        >
          <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100 mb-2">{campaign.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">{campaign.description}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Threat Type', val: campaign.threatType, icon: Zap, color: '#c084fc' },
              { label: 'First Seen', val: campaign.firstSeen, icon: Activity, color: '#2dd4bf' },
              { label: 'Last Seen', val: campaign.lastSeen, icon: Activity, color: '#fb923c' },
              {
                label: 'Observed Volume',
                val: `${campaign.emails} emails / ${campaign.indicators} IOCs`,
                icon: Mail,
                color: '#f87171',
              },
            ].map((box) => {
              const Icon = box.icon;
              return (
                <div
                  key={box.label}
                  className="rounded-xl p-3.5 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
                >
                  <span className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-500 font-mono uppercase tracking-wider mb-1">
                    <Icon className="w-3 h-3" style={{ color: box.color }} />
                    {box.label}
                  </span>
                  <p className="text-xs font-bold text-gray-900 dark:text-zinc-100 font-mono">{box.val}</p>
                </div>
              );
            })}
          </div>
        </div>
      </SlideIn>

      {/* ── Linked Investigation Cases (Merged from Investigations Page) ── */}
      <SlideIn delay={120} direction="up">
        <div
          className="rounded-2xl p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm "
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <FolderSearch className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 whitespace-nowrap">
                Linked Investigation Cases
              </h3>
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/15 dark:border-purple-500/30 dark:text-purple-300"
              >
                {casesForCampaign.length}
              </span>
            </div>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
              Click any case to inspect timeline &amp; analyst notes
            </span>
          </div>

          {casesForCampaign.length === 0 ? (
            <div className="text-center py-8">
              <ShieldAlert className="w-8 h-8 text-gray-500 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">No cases linked to this campaign yet</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-600 mt-1">
                Analyze an email that references this campaign cluster to automatically attach it here.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Linked Cases Cards (< md) */}
              <div className="md:hidden space-y-2">
                {casesForCampaign.map((c) => {
                  const isStaticCase = !!INVESTIGATION_CASES.find((ic) => ic.id === c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      className="p-3.5 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.99] space-y-2 bg-white hover:bg-gray-50 dark:bg-zinc-900/50 dark:hover:bg-zinc-700/50 border border-gray-200 dark:border-zinc-800/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Crosshair className="w-3 h-3 text-cyan-600 dark:text-cyan-500 shrink-0" />
                          <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 whitespace-nowrap">{c.id}</span>
                          {!isStaticCase && (
                            <span
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 bg-emerald-100 dark:bg-green-500/15 text-emerald-700 dark:text-green-400 border border-emerald-300 dark:border-green-500/30"
                            >
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="shrink-0">
                          <CaseStatusPill
                            status={c.status}
                            animate={c.status === 'open' || c.status === 'investigating'}
                          />
                        </div>
                      </div>

                      <div className="text-xs text-gray-900 dark:text-zinc-100 font-medium leading-snug break-words">
                        {c.title}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-gray-200 dark:border-zinc-800/50 text-xs">
                        <div className="flex items-center gap-2 shrink-0">
                          <SeverityPill severity={c.severity} />
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono px-2 py-0.5 rounded bg-gray-200/60 dark:bg-zinc-900/50 border border-gray-200/60 dark:border-zinc-800/50 whitespace-nowrap">
                            {c.threatType}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-400 font-mono">
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop & Tablet Linked Cases Table (md+) */}
              <div className="hidden md:block">
                {/* Table header */}
                <div
                  className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200/60 dark:border-zinc-800/50 rounded-xl"
                >
                  <div className="col-span-3">Case ID</div>
                  <div className="col-span-4">Title / Subject</div>
                  <div className="col-span-2">Severity</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1">Threat Type</div>
                </div>

                {/* Rows */}
                <div className="space-y-1.5">
                  {casesForCampaign.map((c) => {
                    const isStaticCase = !!INVESTIGATION_CASES.find((ic) => ic.id === c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCase(c)}
                        className="grid grid-cols-12 gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.99] group items-center bg-white hover:bg-gray-50 dark:bg-zinc-900/50 dark:hover:bg-zinc-700/50 border border-gray-200 dark:border-zinc-800/50"
                      >
                        <div className="col-span-3 flex items-center gap-1.5">
                          <Crosshair className="w-3 h-3 text-cyan-600 dark:text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">{c.id}</span>
                          {!isStaticCase && (
                            <span
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold bg-emerald-100 dark:bg-green-500/15 text-emerald-700 dark:text-green-400 border border-emerald-300 dark:border-green-500/30"
                            >
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="col-span-4">
                          <span className="text-xs text-gray-900 dark:text-zinc-100 font-medium truncate block">{c.title}</span>
                        </div>
                        <div className="col-span-2">
                          <SeverityPill severity={c.severity} />
                        </div>
                        <div className="col-span-2">
                          <CaseStatusPill
                            status={c.status}
                            animate={c.status === 'open' || c.status === 'investigating'}
                          />
                        </div>
                        <div className="col-span-1 flex items-center justify-between">
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate">{c.threatType}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-600 dark:text-gray-600 dark:group-hover:text-cyan-400 transition-all shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </SlideIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Campaign Timeline */}
        <SlideIn delay={180} direction="left">
          <div
            className="rounded-2xl p-5 h-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm "
          >
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Campaign Timeline
            </h3>
            <div className="relative pl-0 sm:pl-1">
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-white/15 -translate-x-1/2" />
              <div className="space-y-3.5 sm:space-y-4">
                {campaign.timeline.map((t, i) => (
                  <div key={i} className="relative flex gap-3 sm:gap-4 items-start min-w-0">
                    <div
                      className="relative z-10 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-sm bg-purple-50 dark:bg-purple-500/20 border-purple-200 dark:border-purple-500/40 text-purple-700 dark:text-purple-300"
                    >
                      <span className="text-xs font-bold font-mono">{i + 1}</span>
                    </div>
                    <div
                      className="flex-1 min-w-0 rounded-xl p-3 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
                    >
                      <span className="text-xs text-gray-900 dark:text-zinc-100 font-medium leading-relaxed block break-words">{t.event}</span>
                      <div className="text-[10px] text-gray-500 dark:text-gray-500 font-mono mt-1">{t.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SlideIn>

        {/* Campaign Relationships */}
        <SlideIn delay={200} direction="right">
          <div
            className="rounded-2xl p-5 h-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm "
          >
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
              <Network className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Campaign Relationships
            </h3>
            <div className="flex flex-col items-center gap-1">
              <FlowNode label="Emails" values={campaign.relatedEmails} icon={Mail} />
              <ArrowDown className="w-4 h-4 text-gray-500 dark:text-gray-600 my-0.5" />
              <FlowNode label="Domains" values={campaign.relatedDomains} icon={Globe} />
              <ArrowDown className="w-4 h-4 text-gray-500 dark:text-gray-600 my-0.5" />
              <FlowNode label="IPs" values={campaign.relatedIPs} icon={Server} />
              <ArrowDown className="w-4 h-4 text-gray-500 dark:text-gray-600 my-0.5" />
              <FlowNode label="URLs" values={campaign.relatedURLs} icon={Link2} />
              <ArrowDown className="w-4 h-4 text-gray-500 dark:text-gray-600 my-0.5" />
              <div
                className="w-full rounded-xl p-3 text-center bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30"
              >
                <span className="text-[10px] text-purple-700 dark:text-purple-300 font-mono uppercase tracking-wider font-bold">
                  Campaign Cluster
                </span>
                <p className="text-sm text-gray-900 dark:text-zinc-100 font-mono font-bold">{campaign.id}</p>
              </div>
              <ArrowDown className="w-4 h-4 text-gray-500 dark:text-gray-600 my-0.5" />
              <FlowNode label="Cases" values={campaign.relatedCases} icon={FolderSearch} />
            </div>
          </div>
        </SlideIn>
      </div>

      {/* Indicator grids */}
      <SlideIn delay={260} direction="up">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <IndicatorPanel label="Related Emails" items={campaign.relatedEmails} icon={Mail} color="text-red-500 dark:text-red-400" />
          <IndicatorPanel label="Related Domains" items={campaign.relatedDomains} icon={Globe} color="text-teal-600 dark:text-teal-400" />
          <IndicatorPanel label="Related IPs" items={campaign.relatedIPs} icon={Server} color="text-orange-600 dark:text-orange-400" />
          <IndicatorPanel label="Related URLs" items={campaign.relatedURLs} icon={Link2} color="text-amber-600 dark:text-amber-400" />
        </div>
      </SlideIn>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CASE DETAIL VIEW (Full investigation case view)
════════════════════════════════════════════════════════════ */
function CaseDetail({
  caseData,
  onBack,
  onBackLabel,
}: {
  caseData: InvestigationCase;
  onBack: () => void;
  onBackLabel: string;
}) {
  const { setCaseStatus, getCaseStatus } = useCampaigns();
  const sev = SEVERITY_STYLES[caseData.severity];
  const [caseStatus, _setCaseStatus] = useState<CaseStatus>(getCaseStatus(caseData.id, caseData.status));
  const [notes, setNotes] = useState(caseData.analystNotes);
  const [newNote, setNewNote] = useState('');

  const handleSetStatus = useCallback(
    (s: CaseStatus) => {
      _setCaseStatus(s);
      setCaseStatus(caseData.id, s); // Persist to context/localStorage
    },
    [caseData.id, setCaseStatus]
  );

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes([
      ...notes,
      {
        author: 'Analyst',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        note: newNote.trim(),
      },
    ]);
    setNewNote('');
  };

  const STATUS_ORDER: CaseStatus[] = ['open', 'investigating', 'contained', 'resolved'];

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Back + Header */}
      <SlideIn delay={0} direction="down">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-900 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-all bg-gray-50 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 border border-gray-200 dark:border-zinc-800/50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {onBackLabel}
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-bold">{caseData.id}</span>
            <SeverityPill severity={caseData.severity} />
            <CaseStatusPill status={caseStatus} animate={caseStatus === 'open' || caseStatus === 'investigating'} />
            {/* Persist indicator */}
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
            >
              ✓ Saved
            </span>
          </div>
        </div>
      </SlideIn>

      {/* Case Title Card */}
      <SlideIn delay={60} direction="up">
        <div
          className="rounded-2xl p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-purple-500/30 shadow-sm "
        >
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100 mb-2">{caseData.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{caseData.summary}</p>
            </div>
            {/* Status Control */}
            <div
              className="rounded-xl p-4 shrink-0 min-w-[160px] bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
            >
              <p className="text-[10px] text-gray-500 dark:text-gray-500 font-mono uppercase tracking-wider mb-3">Status Control</p>
              <div className="flex flex-col gap-1.5">
                {STATUS_ORDER.map((s) => {
                  const cfg = CASE_STATUS_CONFIG[s];
                  const active = caseStatus === s;
                  return (
                    <button
                      key={s}
                      onClick={() => handleSetStatus(s)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all font-mono ${
                        active
                          ? ''
                          : 'text-gray-900 dark:text-zinc-100'
                      }`}
                      style={
                        active
                          ? { background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }
                          : undefined
                      }
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: active ? cfg.pulse ?? '#4b5563' : '#94a3b8' }}
                      />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </SlideIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Case Metadata */}
          <SlideIn delay={140} direction="left">
            <div
              className="rounded-2xl p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm "
            >
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
                <ShieldAlert className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Case Metadata
              </h3>
              <div className="space-y-0">
                <MetaRow icon={FileText} label="Case ID" value={caseData.id} />
                <MetaRow icon={Clock} label="Created" value={caseData.created} />
                <MetaRow icon={User} label="Assigned" value={caseData.assignedAnalyst} mono={false} />
                <MetaRow icon={Network} label="Threat Type" value={caseData.threatType} mono={false} />
                <MetaRow icon={Zap} label="Campaign" value={caseData.relatedCampaign} />
                <MetaRow icon={Clock} label="Last Updated" value={caseData.lastUpdated} />
                {caseData.relatedEvidence.length > 0 && (
                  <MetaRow icon={Lock} label="Evidence" value={caseData.relatedEvidence.join(', ')} mono={false} />
                )}
              </div>
            </div>
          </SlideIn>

          {/* Activity History */}
          <SlideIn delay={200} direction="left">
            <div
              className="rounded-2xl p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm "
            >
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Activity History
              </h3>
              <div className="space-y-3">
                {caseData.activityHistory.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="relative mt-1.5 shrink-0">
                      <span
                        className="w-2 h-2 rounded-full block"
                        style={{ background: '#a855f7' }}
                      />
                    </div>
                    <div>
                      <span className="text-xs text-gray-900 dark:text-zinc-100 font-medium">{a.action}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-500"> — {a.actor}</span>
                      <div className="text-[10px] text-gray-500 dark:text-gray-600 font-mono mt-0.5">{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SlideIn>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Investigation Timeline */}
          <SlideIn delay={160} direction="right">
            <div
              className="rounded-2xl p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm "
            >
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Investigation Timeline
              </h3>
              <div className="relative pl-2">
                <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gray-200 dark:bg-white/10" />
                <div className="space-y-4">
                  {caseData.timeline.map((t, i) => (
                    <div key={i} className="relative flex gap-4 items-start">
                      <div
                        className="relative z-10 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform hover:scale-110"
                        style={
                          i === 0
                            ? {
                              background: 'rgba(239,68,68,0.2)',
                              borderColor: '#ef4444',
                              color: '#ef4444',
                            }
                            : i === caseData.timeline.length - 1
                              ? {
                                background: 'rgba(34,197,94,0.2)',
                                borderColor: '#22c55e',
                                color: '#16a34a',
                              }
                              : {
                                background: 'rgba(148,163,184,0.15)',
                                borderColor: 'rgba(148,163,184,0.3)',
                                color: '#64748b',
                              }
                        }
                      >
                        <span className="text-xs font-bold font-mono">{i + 1}</span>
                      </div>
                      <div
                        className="flex-1 rounded-xl p-3.5 transition-all hover:scale-[1.005] bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
                      >
                        <span className="text-xs text-gray-900 dark:text-zinc-100 font-medium">{t.event}</span>
                        <div className="text-[10px] text-gray-500 dark:text-gray-500 font-mono mt-1">
                          {t.time}
                          {'actor' in t && (t as any).actor ? (
                            <>
                              {' '}
                              — <span className="text-gray-500 dark:text-gray-400">{(t as any).actor}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SlideIn>

          {/* Analyst Notes */}
          <SlideIn delay={240} direction="right">
            <div
              className="rounded-2xl p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm "
            >
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
                <StickyNote className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                Analyst Notes
              </h3>
              <div className="space-y-3 mb-4">
                {notes.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-600 font-mono text-center py-4">
                    No analyst notes yet. Add one below.
                  </p>
                )}
                {notes.map((n, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3.5 transition-all hover:scale-[1.005] bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-900 dark:text-zinc-100 font-bold">{n.author}</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-500 font-mono">{n.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{n.note}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                  placeholder="Add a note…"
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none font-mono bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
                />
                <button
                  onClick={addNote}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 font-mono flex items-center gap-1.5 cursor-pointer bg-purple-600 hover:bg-purple-500 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>
          </SlideIn>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */
function MetaRow({
  icon: Icon,
  label,
  value,
  mono = true,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-200 dark:border-zinc-800/50"
    >
      <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500 shrink-0">
        <Icon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
        {label}
      </span>
      <span className={`text-xs text-gray-900 dark:text-zinc-100 text-right break-all ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
    </div>
  );
}

function IndicatorPanel({
  label,
  items,
  icon: Icon,
  color,
}: {
  label: string;
  items: string[];
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm "
    >
      <h3 className={`text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2 mb-3`}>
        <Icon className={`w-4 h-4 ${color}`} />
        {label}
      </h3>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-600 font-mono py-2 text-center">None observed</p>
        ) : (
          items.map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 rounded-xl p-3 transition-colors bg-white hover:bg-gray-50 dark:bg-zinc-900/50 dark:hover:bg-zinc-700/50 border border-gray-200 dark:border-zinc-800/50"
            >
              <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-500 shrink-0" />
              <span className="text-xs text-gray-900 dark:text-zinc-100 font-mono break-all flex-1">{item}</span>
              <CopyButton value={item} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FlowNode({ label, values, icon: Icon }: { label: string; values: string[]; icon: LucideIcon }) {
  return (
    <div
      className="w-full rounded-xl p-3 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-500" />
        <span className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider font-mono font-bold">{label}</span>
      </div>
      {values.length > 0 ? (
        <div className="space-y-1">
          {values.map((v) => (
            <div key={v} className="flex items-center gap-1">
              <span className="text-xs text-gray-900 dark:text-zinc-100 font-mono break-all flex-1 font-semibold">{v}</span>
              <CopyButton value={v} />
            </div>
          ))}
        </div>
      ) : (
        <span className="text-xs text-gray-500 dark:text-gray-600 font-mono italic">None</span>
      )}
    </div>
  );
}

