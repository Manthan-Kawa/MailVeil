import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Bell,
  ShieldAlert,
  Globe,
  ShieldX,
  Link2,
  Network,
  MapPin,
  AlertTriangle,
  Brain,
  ChevronRight,
  Crosshair,
  MailSearch,
  Sparkles,
  ChevronDown,
  Lock,
  Key,
  ShieldOff,
  Clock,
  AlertOctagon,
  type LucideIcon,
} from 'lucide-react';
import {
  type SecurityAlert,
  type AlertStatus,
  type AlertType,
  type Severity,
} from '@/data/mockData';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { resultToAlert } from '@/utils/alertUtils';
import type { EmailAnalysisResult } from '@/services/claudeService';
import { SupabaseDataService } from '@/services/supabaseDataService';

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

const STATUS_CONFIG: Record<AlertStatus, { color: string; bg: string; border: string; label: string; pulse?: string }> = {
  new: { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', label: 'New', pulse: '#ef4444' },
  acknowledged: { color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', label: 'Acknowledged', pulse: '#f59e0b' },
  investigating: { color: '#fb923c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', label: 'Investigating', pulse: '#f97316' },
  resolved: { color: '#4ade80', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', label: 'Resolved' },
};

const STATUS_ORDER: AlertStatus[] = ['new', 'acknowledged', 'investigating', 'resolved'];

const ALERT_TYPE_ICONS: Record<string, LucideIcon> = {
  'BEC Detection': ShieldAlert,
  'Lookalike Domain': Globe,
  'Authentication Failure': ShieldX,
  'Suspicious URL': Link2,
  'Campaign Correlation': Network,
  'Origin Anomaly': MapPin,
  'Downgrade Attack': ShieldAlert,
  'Weak Cipher': Lock,
  'Expired Certificate': Clock,
  'Weak Key': Key,
  'MitM Detected': Network,
  'STARTTLS Stripping': ShieldOff,
  'Protocol Violation': AlertOctagon,
  'Self-Signed Certificate': ShieldX,
};



function SeverityPill({ severity }: { severity: Severity }) {
  const s = SEVERITY_STYLES[severity];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider font-mono"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {severity}
    </span>
  );
}

function StatusPill({ status }: { status: AlertStatus }) {
  const s = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      <span className="relative flex h-2 w-2">
        {s.pulse && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: s.pulse }} />
        )}
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: s.pulse ?? '#6b7280' }} />
      </span>
      {s.label}
    </span>
  );
}

export function AlertsPage({ onNavigate }: { onNavigate?: (id: string) => void } = {}) {
  const { analyzedReports, loadDemoCase } = useAnalysis();

  const baseAlerts = useMemo(() => analyzedReports.map((r) => resultToAlert(r)), [analyzedReports]);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, AlertStatus>>(() => {
    try {
      const saved = localStorage.getItem('sentinel_alert_status_overrides');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  // Sync alert status overrides from Supabase on mount
  useEffect(() => {
    let active = true;
    SupabaseDataService.fetchAlertStates().then((states) => {
      if (active && states?.alertStatusOverrides && Object.keys(states.alertStatusOverrides).length > 0) {
        setStatusOverrides((prev) => ({ ...prev, ...(states.alertStatusOverrides as Record<string, AlertStatus>) }));
      }
    }).catch((e) => console.warn('Supabase fetchAlertStates error:', e));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('sentinel_alert_status_overrides', JSON.stringify(statusOverrides));
    } catch {
      // ignore
    }
  }, [statusOverrides]);

  const alerts: SecurityAlert[] = useMemo(
    () => baseAlerts.map((a) => (statusOverrides[a.id] ? { ...a, status: statusOverrides[a.id] } : a)),
    [baseAlerts, statusOverrides]
  );

  const [selected, setSelected] = useState<SecurityAlert | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (selected) {
      const updated = alerts.find((a) => a.id === selected.id);
      if (updated) setSelected(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts]);

  const filtered = alerts.filter((a) => {
    const matchesSearch =
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.type.toLowerCase().includes(search.toLowerCase()) ||
      a.source.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || a.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const changeStatus = (alertId: string, newStatus: AlertStatus) => {
    setStatusOverrides((prev) => {
      const next = { ...prev, [alertId]: newStatus };
      SupabaseDataService.saveAlertStatusOverrides(next).catch((e) => console.warn('Supabase saveAlertStatusOverrides error:', e));
      return next;
    });
    if (selected?.id === alertId) setSelected((prev) => (prev ? { ...prev, status: newStatus } : prev));
  };

  const newCount = alerts.filter((a) => a.status === 'new').length;

  /* ── Empty state ── */
  if (analyzedReports.length === 0) {
    return (
      <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <SlideIn delay={0} direction="down">
          <h2 className="text-2xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">Security Alerts</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time threat detection feed & SOC alert triage center</p>
        </SlideIn>
        <SlideIn delay={60} direction="up">
          <div
            className="rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-6 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm "
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400">
              <Bell className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">No Alerts Yet</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-mono">
                Alerts are automatically generated from analyzed emails. Analyze an email and it will instantly appear here as a live alert.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onNavigate?.('email-analyzer')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 font-mono transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <MailSearch className="w-4 h-4" /> Go to Email Analyzer
              </button>
              <button
                onClick={loadDemoCase}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 border border-gray-300 dark:border-zinc-700/60 transition-all font-mono cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-purple-400" /> Load Sample Alert
              </button>
            </div>
          </div>
        </SlideIn>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <SlideIn delay={0} direction="down">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">Security Alerts</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Synced from {analyzedReports.length} analyzed email{analyzedReports.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl self-start sm:self-auto" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-xs font-semibold text-red-600 dark:text-red-300 font-mono">
              {newCount} UNTRIAGED ALERT{newCount !== 1 ? 'S' : ''}
            </span>
          </div>
        </div>
      </SlideIn>

      {/* ── Stat Cards ── */}
      <SlideIn delay={60} direction="up">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['new', 'acknowledged', 'investigating', 'resolved'] as AlertStatus[]).map((st) => {
            const count = alerts.filter((a) => a.status === st).length;
            const cfg = STATUS_CONFIG[st];
            return (
              <div
                key={st}
                className="rounded-2xl p-4 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm cursor-default select-none"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-gray-500 dark:text-gray-500 font-mono uppercase tracking-wider font-semibold">{cfg.label}</span>
                  <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                </div>
                <div className="text-2xl font-black" style={{ color: cfg.color }}>{count}</div>
              </div>
            );
          })}
        </div>
      </SlideIn>

      {/* ── Filter Bar ── */}
      <SlideIn delay={120} direction="up">
        <div className="rounded-2xl p-4 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2.5 bg-gray-50 dark:bg-white border border-gray-200 dark:border-gray-200 shadow-sm">
              <Search className="w-4 h-4 text-gray-500 dark:text-gray-500 shrink-0" />
              <input
                type="text"
                placeholder="Search by alert ID, type, or source..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm text-gray-900 dark:text-gray-900 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none w-full font-mono"
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Severity Dropdown */}
              <div className="relative flex-1 sm:flex-none">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as any)}
                  className="w-full sm:w-auto appearance-none px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 pr-6 sm:pr-8 rounded-xl text-[11px] sm:text-xs font-mono font-medium sm:font-semibold text-gray-900 dark:text-gray-200 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-zinc-800/50 hover:border-gray-200 dark:hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer transition-all shrink-0"
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
              <div className="relative flex-1 sm:flex-none">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full sm:w-auto appearance-none px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 pr-6 sm:pr-8 rounded-xl text-[11px] sm:text-xs font-mono font-medium sm:font-semibold text-gray-900 dark:text-gray-200 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-zinc-800/50 hover:border-gray-200 dark:hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer transition-all shrink-0"
                >
                  <option value="all" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100">All Status</option>
                  <option value="new" className="bg-white dark:bg-zinc-800 text-red-500 dark:text-red-400">New</option>
                  <option value="acknowledged" className="bg-white dark:bg-zinc-800 text-amber-500 dark:text-amber-400">Acknowledged</option>
                  <option value="investigating" className="bg-white dark:bg-zinc-800 text-blue-500 dark:text-blue-400">Investigating</option>
                  <option value="resolved" className="bg-white dark:bg-zinc-800 text-green-500 dark:text-green-400">Resolved</option>
                </select>
                <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 dark:text-gray-400 absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </SlideIn>

      {/* ── Table + Inspector ── */}
      <SlideIn delay={180} direction="up">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-2xl overflow-hidden bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm ">
            <div className="grid grid-cols-12 gap-2 px-3.5 sm:px-5 py-3 text-[10px] font-mono font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/50">
              <div className="col-span-4">Alert ID</div>
              <div className="col-span-3 hidden md:block">Type</div>
              <div className="col-span-4 md:col-span-2">Severity</div>
              <div className="col-span-4 md:col-span-3 text-right md:text-left">Status</div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.map((a) => {
                const TypeIcon = ALERT_TYPE_ICONS[a.type] || ShieldAlert;
                const isSel = selected?.id === a.id;
                return (
                  <div key={a.id} onClick={() => setSelected(a)} className={`grid grid-cols-12 gap-2 px-3.5 sm:px-5 py-3.5 cursor-pointer transition-all items-center ${isSel ? 'bg-gray-50 dark:bg-zinc-900/50' : 'hover:bg-white dark:hover:bg-zinc-700/50'}`}>
                    <div className="col-span-4 flex items-center gap-1.5 sm:gap-2">
                      <Crosshair className={`w-3 h-3 ${isSel ? 'text-red-500 dark:text-red-400 opacity-100' : 'text-gray-500 dark:text-gray-600 opacity-0'} transition-opacity shrink-0`} />
                      <TypeIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-500 shrink-0" />
                      <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 truncate">{a.id}</span>
                    </div>
                    <div className="col-span-3 hidden md:flex items-center"><span className="text-xs text-gray-900 dark:text-zinc-100 truncate">{a.type}</span></div>
                    <div className="col-span-4 md:col-span-2 flex items-center"><SeverityPill severity={a.severity} /></div>
                    <div className="col-span-4 md:col-span-3 flex items-center justify-end md:justify-between">
                      <StatusPill status={a.status} />
                      <ChevronRight className="w-3.5 h-3.5 text-gray-500 dark:text-gray-600 shrink-0 hidden md:block" />
                    </div>
                  </div>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <Search className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-600 font-mono">No alerts match your search</p>
              </div>
            )}
          </div>
          <div className="lg:col-span-1">
            {selected ? (
              <AlertDetail alert={selected} onStatusChange={changeStatus} />
            ) : (
              <div className="rounded-2xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[360px] bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400">
                  <Bell className="w-6 h-6 text-red-500 dark:text-red-400" />
                </div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 mb-1">Alert Triage Inspector</h4>
                <p className="text-xs text-gray-500 dark:text-gray-500 font-mono max-w-[200px]">Select an alert from the table to inspect telemetry, observed facts, and AI inference.</p>
              </div>
            )}
          </div>
        </div>
      </SlideIn>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   ALERT DETAIL
══════════════════════════════════════════════════ */
function AlertDetail({ alert, onStatusChange }: { alert: SecurityAlert; onStatusChange: (id: string, status: AlertStatus) => void }) {
  const sev = SEVERITY_STYLES[alert.severity];
  const TypeIcon = ALERT_TYPE_ICONS[alert.type] || ShieldAlert;

  return (
    <div className="rounded-2xl p-5 space-y-4 bg-white dark:bg-zinc-800 shadow-sm" style={{ border: `1px solid ${sev.border}` }}>
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <TypeIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">{alert.id}</span>
          <SeverityPill severity={alert.severity} />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">{alert.type}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">{alert.source} — <span className="text-gray-500 dark:text-gray-500">{alert.detected}</span></p>
        {alert.relatedCase && <p className="text-[10px] text-gray-500 dark:text-gray-600 font-mono mt-0.5">Case: <span className="text-purple-600 dark:text-purple-400 font-bold">{alert.relatedCase}</span></p>}
      </div>

      <div className="rounded-xl p-3 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50">
        <p className="text-[10px] text-gray-500 dark:text-gray-500 font-mono uppercase tracking-wider mb-2 font-semibold">Status Control</p>
        <div className="grid grid-cols-2 gap-1.5">
          {STATUS_ORDER.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const active = alert.status === s;
            return (
              <button key={s} onClick={() => onStatusChange(alert.id, s)} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all"
                style={active ? { background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color } : { background: 'transparent', border: '1px solid rgba(148,163,184,0.2)', color: '#64748b' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? cfg.pulse ?? cfg.color : '#94a3b8' }} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl p-3 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50">
        <span className="text-[10px] text-gray-500 dark:text-gray-500 font-mono uppercase tracking-wider block mb-1 font-semibold">Alert Summary</span>
        <p className="text-xs text-gray-900 dark:text-zinc-100 leading-relaxed font-mono">{alert.summary}</p>
      </div>

      <div>
        <h4 className="text-[10px] text-gray-500 dark:text-gray-500 font-mono uppercase tracking-widest mb-2 flex items-center gap-1.5 font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Observed Facts
        </h4>
        <div className="space-y-1.5">
          {alert.observedFacts.map((f, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl p-2.5 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0 mt-1.5" />
              <span className="text-xs font-mono text-gray-900 dark:text-zinc-100 leading-relaxed">{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-3.5 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-500/20">
        <h4 className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5" /> AI Threat Inference
        </h4>
        <p className="text-xs text-gray-900 dark:text-zinc-100 leading-relaxed">{alert.aiInference}</p>
      </div>

      {alert.relatedIndicators.length > 0 && (
        <div>
          <h4 className="text-[10px] text-gray-500 dark:text-gray-500 font-mono uppercase tracking-widest mb-2 font-semibold">Related Indicators</h4>
          <div className="flex flex-wrap gap-1.5">
            {alert.relatedIndicators.map((ind) => (
              <span key={ind} className="px-2.5 py-1 rounded-xl text-xs font-mono text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-zinc-900/50 border border-cyan-200 dark:border-zinc-800/50">{ind}</span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl p-3.5 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/25">
        <h4 className="text-[10px] font-mono font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Recommended Analyst Action</h4>
        <p className="text-xs text-gray-900 dark:text-zinc-100 leading-relaxed">{alert.recommendedAction}</p>
      </div>
    </div>
  );
}
